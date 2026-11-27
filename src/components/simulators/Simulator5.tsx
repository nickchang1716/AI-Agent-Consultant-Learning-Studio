import { useState } from 'react';
import { CANDIDATES, GATES } from '../../data/simulatorScenarios';

const ROOT_LABEL = { data: '資料錯', retrieval: '檢索錯', tool: '工具錯', generation: '生成錯' } as const;

function Meter({ label, value, gate }: { label: string; value: number; gate: number }) {
  const pass = value >= gate;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className={pass ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>{value}%（門檻 {gate}%）{pass ? ' ✓' : ' ✗'}</span></div>
      <div className="relative mt-1 h-3 overflow-hidden rounded bg-slate-200 dark:bg-slate-700" role="img" aria-label={`${label} ${value}%，門檻 ${gate}%`}>
        <div className={`h-full ${pass ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${value}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-navy dark:bg-white" style={{ left: `${gate}%` }} />
      </div>
    </div>
  );
}

export default function Simulator5() {
  const [idx, setIdx] = useState(1);
  const [showTrace, setShowTrace] = useState(false);
  const c = CANDIDATES[idx];
  const checks = [
    { name: '品質', pass: c.quality >= GATES.quality },
    { name: 'RAG Recall@5', pass: c.recall >= GATES.recall },
    { name: '資安（越權防護）', pass: c.security >= GATES.security },
  ];
  const go = checks.every((x) => x.pass);
  const failed = checks.filter((x) => !x.pass).map((x) => x.name);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="候選版本">
        {CANDIDATES.map((v, i) => (
          <button key={v.id} type="button" aria-pressed={idx === i} onClick={() => { setIdx(i); setShowTrace(false); }} className={`btn border text-sm ${idx === i ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="card space-y-3">
          <Meter label="一般回答準確度（品質）" value={c.quality} gate={GATES.quality} />
          <Meter label="RAG Recall@5" value={c.recall} gate={GATES.recall} />
          <Meter label="資安紅隊（越權防護）" value={c.security} gate={GATES.security} />
          <p className="text-sm">{c.note}</p>
        </div>
        <div className={`flex flex-col items-center justify-center rounded-xl p-4 text-center text-white ${go ? 'bg-emerald-600' : 'bg-red-600'}`} role="status" aria-live="polite">
          <span className="text-4xl" aria-hidden>{go ? '🟢' : '🔴'}</span>
          <p className="mt-1 text-lg font-bold">{go ? 'Release Gate 放行' : 'Release Gate 禁止上線'}</p>
          {!go && <p className="mt-1 text-xs">未通過：{failed.join('、')}</p>}
        </div>
      </div>

      {c.failure && (
        <div className="space-y-2">
          <button type="button" className="btn-ghost" onClick={() => setShowTrace((s) => !s)} aria-expanded={showTrace}>
            {showTrace ? '收合' : '展開'}失敗案例 Trace 拆解
          </button>
          {showTrace && (
            <div className="card space-y-2 text-sm">
              <h3 className="font-bold">{c.failure.caseTitle}</h3>
              <ol className="space-y-1">
                {c.failure.traceNodes.map((n) => (
                  <li key={n.name} className={`rounded-lg border-l-4 p-2 ${n.ok ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-red-500 bg-red-50 text-red-900'}`}>
                    <strong>{n.name}</strong>：{n.detail}
                  </li>
                ))}
              </ol>
              <p><span className="font-semibold text-red-600">根因分類：{ROOT_LABEL[c.failure.rootCause]}</span></p>
              <p>{c.failure.explanation}</p>
            </div>
          )}
        </div>
      )}

      <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">觀念：不能只看平均分。安全性應設獨立 release gate（此例要求 100%），任何一項未過就不得上線，並依風險處理。</p>
      <p className="text-xs text-slate-500">※ 數據為教學情境的假設值，非實際測試結果。</p>
    </div>
  );
}
