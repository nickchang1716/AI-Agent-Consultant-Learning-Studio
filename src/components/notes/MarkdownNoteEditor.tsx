import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Code, Heading2, ImagePlus, List } from 'lucide-react';
import { useLearning } from '../../context/LearningContext';
import { compressImage } from '../../lib/imageCompress';
import { isSafeHttpUrl } from '../../lib/youtube';
import ImageLightbox from './ImageLightbox';

type Mode = 'edit' | 'preview' | 'split';
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** 預覽中的圖片：sb-img:// 與 local-img:// 經 repository 轉為可顯示 URL；其餘僅允許 https/http/data:image */
function NoteImage({ src, alt, onOpen }: { src?: string; alt?: string; onOpen: (u: string) => void }) {
  const { repo } = useLearning();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let off = false;
    setUrl(null);
    setFailed(false);
    if (!src) {
      setFailed(true);
      return;
    }
    if (src.startsWith('sb-img://') || src.startsWith('local-img://')) {
      repo.resolveImage(src).then((u) => {
        if (off) return;
        if (u) setUrl(u);
        else setFailed(true);
      });
    } else if (isSafeHttpUrl(src) || /^data:image\/(png|jpeg|webp|gif);base64,/.test(src)) {
      setUrl(src);
    } else {
      setFailed(true);
    }
    return () => {
      off = true;
    };
  }, [src, repo]);

  if (failed) return <span className="rounded bg-slate-100 px-1 text-xs text-slate-500">［圖片無法顯示］</span>;
  if (!url) return <span className="text-xs text-slate-400">圖片載入中…</span>;
  return (
    <button type="button" className="inline-block max-w-full" onClick={() => onOpen(url)} aria-label="放大圖片">
      <img src={url} alt={alt ?? '截圖'} className="max-h-80 max-w-full rounded-lg border border-slate-200" loading="lazy" />
    </button>
  );
}

export default function MarkdownNoteEditor({ moduleId }: { moduleId: number }) {
  const { snap, saveNote, repo } = useLearning();
  const stored = snap.moduleNotes[moduleId] ?? '';
  const [text, setText] = useState(stored);
  const [mode, setMode] = useState<Mode>('edit');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const [zoom, setZoom] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const latest = useRef({ text, moduleId });
  latest.current = { text, moduleId };
  const saveRef = useRef(saveNote);
  saveRef.current = saveNote;

  // 切換章節或外部（如匯入、雲端載入）更新時同步
  useEffect(() => {
    if (!dirty.current) setText(stored);
  }, [stored, moduleId]);

  const flush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = undefined;
    if (!dirty.current) return;
    dirty.current = false;
    void saveRef.current(latest.current.moduleId, latest.current.text).then(() => setSaving('saved'));
  }, []);

  // 切頁／卸載／關閉分頁時確保寫入
  useEffect(() => {
    const h = () => flush();
    window.addEventListener('beforeunload', h);
    window.addEventListener('pagehide', h);
    return () => {
      window.removeEventListener('beforeunload', h);
      window.removeEventListener('pagehide', h);
      flush();
    };
  }, [flush, moduleId]);

  function change(v: string) {
    setText(v);
    dirty.current = true;
    setSaving('dirty');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  }

  function wrap(before: string, after = '', placeholder = '') {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = text.slice(s, e) || placeholder;
    change(text.slice(0, s) + before + sel + after + text.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }

  function insertAtCursor(snippet: string) {
    const el = ta.current;
    const pos = el ? el.selectionStart : text.length;
    change(text.slice(0, pos) + snippet + text.slice(pos));
  }

  async function handleFiles(files: File[]) {
    setMsg(null);
    for (const f of files) {
      if (!ACCEPT.includes(f.type)) {
        setMsg('只支援 PNG / JPEG / WebP / GIF 圖片。');
        continue;
      }
      try {
        const blob = f.type === 'image/gif' && f.size <= 1.5 * 1024 * 1024 ? f : await compressImage(f);
        const src = await repo.uploadImage(moduleId, blob);
        insertAtCursor(`\n![截圖](${src})\n`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : '圖片處理失敗');
      }
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void handleFiles(files);
  }
  function onDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void handleFiles(files);
  }

  const components: Components = useMemo(
    () => ({
      img: ({ src, alt }) => <NoteImage src={typeof src === 'string' ? src : undefined} alt={alt} onOpen={setZoom} />,
      a: ({ href, children }) =>
        href && isSafeHttpUrl(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        ) : (
          <span>{children}</span>
        ),
    }),
    [],
  );
  // react-markdown 預設即過濾危險協定；urlTransform 保留自訂圖片協定
  const urlTransform = useCallback((u: string) => (/^(https?:|sb-img:|local-img:|data:image\/)/i.test(u) ? u : ''), []);

  const fileInput = useRef<HTMLInputElement>(null);
  const showEdit = mode === 'edit' || mode === 'split';
  const showPreview = mode === 'preview' || mode === 'split';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <div role="tablist" aria-label="筆記模式" className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          {(['edit', 'preview', 'split'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-[44px] px-3 text-sm ${m === 'split' ? 'hidden lg:block' : ''} ${mode === m ? 'bg-teal text-white' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}
            >
              {m === 'edit' ? '編輯' : m === 'preview' ? '預覽' : '並排'}
            </button>
          ))}
        </div>
        {showEdit && (
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn-ghost !px-2" aria-label="標題" onClick={() => wrap('\n## ', '', '標題')}><Heading2 size={16} /></button>
            <button type="button" className="btn-ghost !px-2" aria-label="粗體" onClick={() => wrap('**', '**', '粗體')}><Bold size={16} /></button>
            <button type="button" className="btn-ghost !px-2" aria-label="清單" onClick={() => wrap('\n- ', '', '項目')}><List size={16} /></button>
            <button type="button" className="btn-ghost !px-2" aria-label="程式碼區塊" onClick={() => wrap('\n```\n', '\n```\n', 'code')}><Code size={16} /></button>
            <button type="button" className="btn-ghost !px-2" aria-label="插入圖片" onClick={() => fileInput.current?.click()}><ImagePlus size={16} /></button>
            <input ref={fileInput} type="file" accept={ACCEPT.join(',')} multiple className="hidden" onChange={(e) => { void handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
          </div>
        )}
        <span className="ml-auto text-xs text-slate-500" role="status">{saving === 'dirty' ? '儲存中…' : saving === 'saved' ? '已儲存' : ''}</span>
      </div>

      <div className={mode === 'split' ? 'grid gap-3 lg:grid-cols-2' : ''}>
        {showEdit && (
          <textarea
            ref={ta}
            className="input min-h-[240px] resize-y font-mono"
            value={text}
            onChange={(e) => change(e.target.value)}
            onBlur={flush}
            onPaste={onPaste}
            onDrop={onDrop}
            placeholder="記下架構問題、RFP 疑問或實作結果…（支援 Markdown，可直接貼上截圖）"
            aria-label="章節筆記"
          />
        )}
        {showPreview && (
          <div className="prose-note min-h-[120px] break-words rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            {text.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={urlTransform}>
                {text}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-slate-400">（尚無內容）</p>
            )}
          </div>
        )}
      </div>

      {!repo || repo.kind === 'local' ? <p className="text-xs text-slate-500">訪客模式：截圖存於本機瀏覽器（受容量限制）；登入雲端後可跨裝置同步。</p> : null}
      {msg && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{msg}</p>}
      {zoom && <ImageLightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
