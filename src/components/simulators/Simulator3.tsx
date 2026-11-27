import { useMemo, useState } from 'react';
import { CORPUS, PRESET_QUESTIONS, chunkText, retrieve, type ChunkVerdict, type Role } from '../../lib/ragEngine';

const VERDICT_LABEL: Record<ChunkVerdict, string> = {
  passed: '送入 LLM',
  acl_blocked: '🚫 ACL 權限攔截',
  expired_blocked: '⏳ 版本過期攔截',
  below_threshold: '相似度過低',
  not_topk: '未進 Top-K',
};
const VERDICT_STYLE: Record<ChunkVerdict, string> = {
  passed: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
  acl_blocked: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-100',
  expired_blocked: 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100',
  below_threshold: 'border-slate-300 bg-slate-50 text-slate-500 dark:bg-slate-800',
  not_topk: 'border-slate-300 bg-slate-50 text-slate-600 dark:bg-slate-800',
};
const SEG_COLORS = ['bg-sky-200', 'bg-amber-200'];

export default function Simulator3() {
  const [size, setSize] = useState(120);
  const [overlap, setOverlap] = useState(20);
  const [role, setRole] = useState<Role>('一般理專');
  const [topK, setTopK] = useState(3);
  const [qid, setQid] = useState<(typeof PRESET_QUESTIONS)[number]['id']>('answer');
  const [docId, setDocId] = useState('A');
  const question = PRESET_QUESTIONS.find((p) => p.id === qid)!.text;

  const result = useMemo(() => retrieve(question, role, topK, size, overlap), [question, role, topK, size, overlap]);
  const doc = CORPUS.find((d) => d.id === docId)!;
  const chunks = useMemo(() => chunkText(doc.id, doc.text, size, overlap), [doc, size, overlap]);
  const top = result.scored.slice(0, 8);
  const maxScore = Math.max(0.0001, ...top.map((c) => c.score));

  /** 依切片邊界把原文拆成段落：每個位置屬於 0、1、2 個切片（重疊區） */
  const segments = useMemo(() => {
    const cuts = new Set<number>([0, doc.text.length]);
    chunks.forEach((c) => {
      cuts.add(c.start);
      cuts.add(c.end);
    });
    const pts = [...cuts].sort((a, b) => a - b);
    return pts.slice(0, -1).map((s, i) => {
      const e = pts[i + 1];
      const owners = chunks.filter((c) => c.start <= s && c.end >= e).map((c) => c.index);
      return { s, e, owners, text: doc.text.slice(s, e) };
    });
  }, [chunks, doc]);

  const blocked = result.scored.filter((c) => c.verdict === 'acl_blocked').length;
  const hasAclHit = result.scored.some((c) => c.verdict === 'acl_blocked' && c.score >= 0.08);

  let answerText: string;
  if (result.answerable) {
    const d = CORPUS.find((x) => x.id === result.context[0].docId)!;
    answerText = `依據《${d.title}》回答（引用 ${result.context.length} 個片段）。`;
  } else if (hasAclHit) {
    answerText = '拒答：相關文件存在但您的身分無權限，系統已在檢索階段攔截；請洽有權限的主管。';
  } else {
    answerText = '拒答：知識庫中找不到足夠證據，不應由模型自行編造。';
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Chunk Size：<strong>{size}</strong> 字
          <input type="range" min={60} max={200} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 h-11 w-full accent-teal" />
        </label>
        <label className="block text-sm">Chunk Overlap：<strong>{overlap}</strong> 字
          <input type="range" min={0} max={40} step={5} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} className="mt-2 h-11 w-full accent-teal" />
        </label>
        <label className="block text-sm">查詢者身分
          <select className="input mt-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option>一般理專</option>
            <option>分行主管</option>
          </select>
        </label>
        <label className="block text-sm">Top-K：<strong>{topK}</strong>
          <input type="range" min={1} max={5} value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="mt-2 h-11 w-full accent-teal" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="預設問題">
        {PRESET_QUESTIONS.map((p) => (
          <button key={p.id} type="button" onClick={() => setQid(p.id)} aria-pressed={qid === p.id} className={`btn border text-sm ${qid === p.id ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="card text-sm"><span className="font-semibold text-teal">問題：</span>{question}</p>

      <section aria-label="切片視覺化" className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {CORPUS.map((d) => (
            <button key={d.id} type="button" onClick={() => setDocId(d.id)} aria-pressed={docId === d.id} className={`btn border text-xs ${docId === d.id ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
              文件 {d.id}
            </button>
          ))}
        </div>
        <p className="text-sm"><strong>{doc.title}</strong>　權限：<span className="tag">{doc.acl}</span>　狀態：<span className={`tag ${doc.status === 'expired' ? '!bg-orange-100 !text-orange-800' : ''}`}>{doc.statusLabel}</span>　共 {chunks.length} 個切片</p>
        <p className="break-words rounded-lg border border-slate-200 p-2 text-sm leading-7 dark:border-slate-700">
          {segments.map((sg) => (
            <span key={sg.s} title={sg.owners.length > 1 ? `重疊區：切片 ${sg.owners.map((o) => o + 1).join('、')}` : `切片 ${sg.owners[0] + 1}`} className={`${sg.owners.length > 1 ? 'bg-rose-300 dark:bg-rose-700' : SEG_COLORS[sg.owners[0] % 2]} text-slate-900 dark:text-white`}>
              {sg.text}
            </span>
          ))}
        </p>
        <p className="text-xs text-slate-500">藍／黃色塊為不同切片，粉紅色為重疊區（Overlap）。</p>
      </section>

      <section aria-label="檢索結果" className="space-y-2">
        <h3 className="font-bold">相似度排名（前 {top.length} 筆）</h3>
        <p className="text-xs text-slate-500">※ 教學示意：以字元雙連詞相似度代替真實 embedding；實務以向量與 reranking 計算。</p>
        <ul className="space-y-1">
          {top.map((c) => (
            <li key={`${c.docId}-${c.index}`} className={`rounded-lg border p-2 text-xs ${VERDICT_STYLE[c.verdict]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">文件 {c.docId} · 切片 {c.index + 1}</span>
                <span className="font-semibold">{VERDICT_LABEL[c.verdict]}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-white/70 dark:bg-slate-900/40"><div className="h-full bg-teal" style={{ width: `${(c.score / maxScore) * 100}%` }} /></div>
              <p className="mt-1 break-words opacity-90">分數 {c.score.toFixed(3)}｜{c.text}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">共 {blocked} 個切片被 ACL 權限過濾。</p>
      </section>

      <section aria-label="最終回答" className="card space-y-2 text-sm" aria-live="polite">
        <h3 className="font-bold">最終送入 LLM 的 Context 與回答</h3>
        {result.context.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {result.context.map((c) => <li key={`${c.docId}-${c.index}`} className="break-words">［文件 {c.docId}］{c.text}</li>)}
          </ul>
        ) : (
          <p className="text-slate-500">（沒有任何片段通過過濾）</p>
        )}
        <p className={`rounded-lg p-2 font-medium ${result.answerable ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{answerText}</p>
        <p className="text-xs text-slate-500">重點：權限過濾在檢索階段由系統強制，越權內容不會進入 LLM 上下文；不可只靠 Prompt 要求模型「不要說」。</p>
      </section>
    </div>
  );
}
