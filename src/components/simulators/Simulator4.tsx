import { useState } from 'react';
import { LANES, SCENARIOS, type ScenarioId } from '../../data/simulatorScenarios';

type Decision = 'approve' | 'edit' | 'reject' | null;

export default function Simulator4({ defaultMode = 'A' }: { defaultMode?: ScenarioId }) {
  const [mode, setMode] = useState<ScenarioId>(defaultMode);
  const [i, setI] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);

  const sc = SCENARIOS[mode];
  const step = sc.steps[i];
  const waiting = Boolean(step.gate) && decision === null;
  const rejected = decision === 'reject';
  const lastIdx = rejected ? i : sc.steps.length - 1;

  function pick(m: ScenarioId) {
    setMode(m);
    setI(0);
    setDecision(null);
  }
  function next() {
    if (waiting || i >= lastIdx) return;
    setI(i + 1);
  }

  // 被拒絕時，Gate 之後的步驟改為終止說明
  const shown =
    rejected && step.gate
      ? { ...step, title: '流程終止', note: '審核人拒絕：流程終止，不呼叫任何外部 API，並寫入稽核。', payload: { decision: 'reject', status: 'terminated', audit_log: { action: 'REJECT', checkpoint_id: 'cp_8f31' } }, tone: 'block' as const }
      : decision === 'edit' && step.lane === 'external'
        ? { ...step, payload: { ...(step.payload as object), note: '金額已由審核人修改為 300000，後端以修改後版本重新驗證' } }
        : step;

  const toneBorder = shown.tone === 'block' ? 'border-red-500' : shown.tone === 'warn' ? 'border-amber-500' : shown.tone === 'ok' ? 'border-emerald-500' : 'border-slate-300';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="情境選擇">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((k) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => pick(k)} className={`btn border text-xs sm:text-sm ${mode === k ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
            {SCENARIOS[k].label}
          </button>
        ))}
      </div>

      <ol className="grid grid-cols-5 gap-1" aria-label="泳道">
        {LANES.map((l) => {
          const active = l.id === shown.lane;
          return (
            <li key={l.id} className={`rounded-lg border px-1 py-2 text-center text-[11px] leading-tight transition sm:text-xs ${active ? `${toneBorder} border-2 bg-teal text-white shadow` : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800'}`} aria-current={active ? 'step' : undefined}>
              {l.label}
            </li>
          );
        })}
      </ol>

      <div className={`card space-y-2 border-2 ${toneBorder}`} aria-live="polite">
        <p className="text-xs text-slate-500">步驟 {i + 1} / {rejected ? i + 1 : sc.steps.length}</p>
        <h3 className="font-bold">{shown.title}</h3>
        <p className="text-sm">{shown.note}</p>
        <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100" aria-label="JSON Payload">{JSON.stringify(shown.payload, null, 2)}</pre>

        {step.gate && decision === null && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-amber-900">
            <p className="text-sm font-semibold">⏸ 流程已暫停，等待理專決定：</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => setDecision('approve')}>核准執行</button>
              <button type="button" className="btn-ghost" onClick={() => setDecision('edit')}>修改金額</button>
              <button type="button" className="btn border border-red-300 bg-white text-red-700" onClick={() => setDecision('reject')}>拒絕終止</button>
            </div>
          </div>
        )}
        {step.gate && decision !== null && <p className="text-sm font-medium text-teal">已選擇：{decision === 'approve' ? '核准執行' : decision === 'edit' ? '修改金額' : '拒絕終止'}。後端仍會驗證身分、授權與版本。</p>}
        {mode === 'B' && <p className="text-xs text-slate-500">重點：HITL 不能只靠前端按鈕；審核狀態、授權與執行閘門必須在後端，並保留稽核紀錄。</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={i === 0} onClick={() => { setI(i - 1); if (i - 1 <= sc.steps.findIndex((s) => s.gate)) setDecision(null); }}>上一步</button>
        <button type="button" className="btn-primary" disabled={waiting || i >= lastIdx} onClick={next}>下一步</button>
        <button type="button" className="btn-ghost" onClick={() => { setI(0); setDecision(null); }}>重置</button>
        {waiting && <span className="self-center text-sm text-amber-700">請先於暫停點做出決定</span>}
      </div>
    </div>
  );
}
