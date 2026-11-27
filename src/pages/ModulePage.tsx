import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Plus, Replace, Trash2 } from 'lucide-react';
import { modules, phases } from '../data/curriculum';
import { quizzes } from '../data/quizzes';
import { useLearning } from '../context/LearningContext';
import { isSafeHttpUrl, parseYouTubeId } from '../lib/youtube';
import YouTubeEmbedPlayer, { type PlayerHandle } from '../components/media/YouTubeEmbedPlayer';
import TimestampNotes from '../components/media/TimestampNotes';
import CustomVideoModal from '../components/media/CustomVideoModal';
import MarkdownNoteEditor from '../components/notes/MarkdownNoteEditor';
import InteractiveFlow from '../components/diagrams/InteractiveFlow';
import PlatformBlueprint from '../components/blueprints/Blueprints';
import { renderSimulator } from '../components/simulators';

interface VideoRow {
  key: string;
  title: string;
  url: string;
  isSearch: boolean;
  builtinIndex: number | null;
  customId: string | null;
  replaced: boolean;
}

function Quiz({ moduleId }: { moduleId: number }) {
  const qs = useMemo(() => quizzes.filter((q) => q.moduleId === moduleId), [moduleId]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  useEffect(() => setPicked({}), [moduleId]);
  return (
    <ol className="space-y-4">
      {qs.map((q, n) => {
        const p = picked[q.id];
        const answered = p !== undefined;
        return (
          <li key={q.id} className="space-y-2">
            <p className="font-medium">Q{n + 1}. {q.question}</p>
            <ul className="space-y-1">
              {q.options.map((o, i) => {
                const correct = i === q.answerIndex;
                const chosen = p === i;
                const cls = !answered
                  ? 'border-slate-300 bg-white hover:border-teal dark:border-slate-600 dark:bg-slate-800'
                  : correct
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : chosen
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-slate-200 opacity-70';
                return (
                  <li key={i}>
                    <button type="button" disabled={answered} onClick={() => setPicked({ ...picked, [q.id]: i })} className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-left text-sm ${cls}`}>
                      {String.fromCharCode(65 + i)}. {o}
                    </button>
                  </li>
                );
              })}
            </ul>
            {answered && (
              <p role="status" className={`rounded-lg p-2 text-sm ${p === q.answerIndex ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                {p === q.answerIndex ? '✓ 答對了。' : '✗ 答錯了。'}解析：{q.explanation}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function ModulePage() {
  const params = useParams();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id >= 0 && id < modules.length;
  const { snap, setLastModule, toggleComplete, setWatched, setPosition, deleteCustomVideo } = useLearning();
  const [modal, setModal] = useState<{ replacesIndex: number | null; title?: string } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const playerRef = useRef<PlayerHandle>(null);

  useEffect(() => {
    if (valid) setLastModule(id);
    setActiveKey(null);
    setShowAnswer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, valid]);

  const m = valid ? modules[id] : null;

  const rows: VideoRow[] = useMemo(() => {
    if (!m) return [];
    const customs = snap.customVideos.filter((v) => v.moduleId === m.id);
    const out: VideoRow[] = m.videos.map((v, i) => {
      const rep = customs.find((c) => c.replacesIndex === i);
      return rep
        ? { key: `custom-${rep.id}`, title: rep.title, url: rep.url, isSearch: false, builtinIndex: i, customId: rep.id, replaced: true }
        : { key: `builtin-${i}`, title: v.title, url: v.url, isSearch: Boolean(v.isSearch), builtinIndex: i, customId: null, replaced: false };
    });
    customs.filter((c) => c.replacesIndex === null).forEach((c) => out.push({ key: `custom-${c.id}`, title: c.title, url: c.url, isSearch: false, builtinIndex: null, customId: c.id, replaced: false }));
    return out;
  }, [m, snap.customVideos]);

  if (!m) return <Navigate to="/" replace />;

  const active = rows.find((r) => r.key === activeKey) ?? null;
  const ytId = active ? parseYouTubeId(active.url) : null;
  const done = snap.moduleProgress.find((p) => p.moduleId === m.id)?.isCompleted ?? false;
  const prog = (k: string) => snap.videoProgress.find((v) => v.moduleId === m.id && v.videoKey === k);

  const player = (
    <div className="space-y-3">
      {active && ytId ? (
        <>
          <YouTubeEmbedPlayer key={`${m.id}-${active.key}`} ref={playerRef} videoId={ytId} startSec={prog(active.key)?.lastPositionSec ?? 0} onProgress={(s) => setPosition(m.id, active.key, s)} />
          <TimestampNotes moduleId={m.id} videoKey={active.key} playerRef={playerRef} />
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600">
          從下方影音清單選擇一支 YouTube 影片即可在此內嵌播放並記錄時間戳筆記；其他來源（Microsoft Learn、課程網站）請以「開啟」外連。
        </p>
      )}
    </div>
  );

  const videoList = (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const yt = parseYouTubeId(r.url);
        const safe = isSafeHttpUrl(r.url);
        return (
          <li key={r.key} className="card space-y-2">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-teal" aria-label={`標記已觀看：${r.title}`} checked={prog(r.key)?.watched ?? false} onChange={(e) => setWatched(m.id, r.key, e.target.checked)} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{i + 1}. {r.title}</p>
                <p className="flex flex-wrap gap-1 text-xs">
                  {r.isSearch && <span className="tag !bg-amber-100 !text-amber-800">搜尋入口</span>}
                  {r.replaced && <span className="tag">已替換為精選</span>}
                  {r.customId && !r.replaced && <span className="tag">補充影片</span>}
                  {(prog(r.key)?.lastPositionSec ?? 0) > 0 && <span className="text-slate-500">上次看到 {Math.floor((prog(r.key)?.lastPositionSec ?? 0) / 60)} 分</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {yt && <button type="button" className="btn-primary" onClick={() => setActiveKey(r.key)}>內嵌播放</button>}
              {safe && (
                <a className="btn-ghost" href={r.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden /> {r.isSearch ? '外開搜尋' : '開啟'}
                </a>
              )}
              {r.isSearch && (
                <button type="button" className="btn-ghost" onClick={() => setModal({ replacesIndex: r.builtinIndex, title: r.title })}>
                  <Replace size={14} aria-hidden /> 替換為精選影片
                </button>
              )}
              {r.customId && (
                <button type="button" className="btn-ghost" onClick={() => deleteCustomVideo(r.customId as string)}>
                  <Trash2 size={14} aria-hidden /> {r.replaced ? '還原為搜尋入口' : '移除'}
                </button>
              )}
            </div>
          </li>
        );
      })}
      <li>
        <button type="button" className="btn-ghost w-full" onClick={() => setModal({ replacesIndex: null })}>
          <Plus size={16} aria-hidden /> 新增補充影片
        </button>
      </li>
    </ul>
  );

  const visual = (
    <div className="space-y-6">
      <section aria-labelledby="flow-h" className="space-y-2">
        <h2 id="flow-h" className="text-lg font-bold">流程（可點擊）</h2>
        <InteractiveFlow key={m.id} steps={m.flow} />
      </section>
      {m.simulators.map((s) => (
        <section key={s} className="card space-y-2" aria-label="互動模擬器">
          <h2 className="text-lg font-bold">互動模擬器</h2>
          {renderSimulator(s, m.id)}
        </section>
      ))}
      {m.blueprint && (
        <section className="space-y-2" aria-label="平台介面導覽">
          <h2 className="text-lg font-bold">平台介面導覽</h2>
          <PlatformBlueprint id={m.blueprint} />
        </section>
      )}
    </div>
  );

  const notes = (
    <section aria-labelledby="note-h" className="space-y-2">
      <h2 id="note-h" className="text-lg font-bold">我的學習筆記</h2>
      <MarkdownNoteEditor key={m.id} moduleId={m.id} />
    </section>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-500">Phase {m.phase + 1}｜{phases[m.phase].title}　·　{m.hours} 小時</p>
        <h1 className="text-2xl font-bold text-navy dark:text-white">{String(m.id + 1).padStart(2, '0')} {m.title}</h1>
        <p className="text-sm"><span className="font-semibold text-teal">顧問交付成果：</span>{m.deliverable}</p>
        <label className="hidden cursor-pointer items-center gap-2 text-sm lg:inline-flex">
          <input type="checkbox" className="h-5 w-5 accent-teal" checked={split} onChange={(e) => setSplit(e.target.checked)} />
          專注分欄模式（左：影音／圖解，右：筆記）
        </label>
      </header>

      <div className={split ? 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-6' : 'space-y-6'}>
        <div className={`space-y-6 ${split ? 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto' : ''}`}>
          <section aria-labelledby="vid-h" className="space-y-3">
            <h2 id="vid-h" className="text-lg font-bold">影音先修</h2>
            {player}
            {videoList}
          </section>
          {visual}
        </div>

        <div className="space-y-6">
          {notes}
          {!split && null}
          <section aria-labelledby="concept-h" className="space-y-2">
            <h2 id="concept-h" className="text-lg font-bold">核心概念</h2>
            <ul className="space-y-2">
              {m.concepts.map((c) => (
                <li key={c.title} className="card"><h3 className="font-semibold text-teal">{c.title}</h3><p className="mt-1 text-sm leading-relaxed">{c.body}</p></li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="lab-h" className="card space-y-1">
            <h2 id="lab-h" className="text-lg font-bold">Hands-on Lab</h2>
            <p className="text-sm leading-relaxed">{m.lab}</p>
          </section>
          <section aria-labelledby="qa-h" className="card space-y-3">
            <h2 id="qa-h" className="text-lg font-bold">Knowledge Check</h2>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">核心申論／自我檢核</p>
              <p className="font-medium">Q：{m.knowledgeCheck.q}</p>
              <button type="button" className="btn-ghost" onClick={() => setShowAnswer((s) => !s)} aria-expanded={showAnswer}>{showAnswer ? '隱藏參考答案' : '先自己想，再看參考答案'}</button>
              {showAnswer && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900">A：{m.knowledgeCheck.a}</p>}
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500">互動選擇題</p>
              <Quiz moduleId={m.id} />
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={done ? 'btn-ghost' : 'btn-primary'} onClick={() => toggleComplete(m.id)} aria-pressed={done}>
              <CheckCircle2 size={16} aria-hidden /> {done ? '已完成（點擊取消）' : '標記本章完成'}
            </button>
            {m.id > 0 && <Link className="btn-ghost" to={`/module/${m.id - 1}`}>← 上一章</Link>}
            {m.id < modules.length - 1 && <Link className="btn-ghost" to={`/module/${m.id + 1}`}>下一章 →</Link>}
          </div>
        </div>
      </div>

      {modal && <CustomVideoModal moduleId={m.id} replacesIndex={modal.replacesIndex} defaultTitle={modal.title} onClose={() => setModal(null)} />}
    </div>
  );
}
