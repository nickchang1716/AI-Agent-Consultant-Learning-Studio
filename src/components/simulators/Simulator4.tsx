import { useState } from 'react';
import { LANES, SCENARIOS, type ScenarioId } from '../../data/simulatorScenarios';

type Decision = 'approve' | 'edit' | 'reject' | null;

const ORIGINAL_AMOUNT = 500000;
const EDITED_AMOUNT = 300000;

/** 遞迴把 payload 中的 amount 換成修改後金額；idempotency_key 的版本也升一版，示意「修改後是新版本」 */
function applyEditedAmount(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(applyEditedAmount);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    // 驗證步驟：審核決定由 approve 改為 edit，並同時帶出修改前後金額
    if (o.decision === 'approve') {
      return { ...(applyEditedAmount({ ...o, decision: undefined }) as Record<string, unknown>), decision: 'edit', original_amount: ORIGINAL_AMOUNT, edited_amount: EDITED_AMOUNT };
    }
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => {
        if (k === 'amount' && x === ORIGINAL_AMOUNT) return [k, EDITED_AMOUNT];
        if (k === 'idempotency_key' && typeof x === 'string') return [k, x.replace(/:v(\d+)$/, (_m, n: string) => `:v${Number(n) + 1}`)];
        if (k === 'version' && typeof x === 'number') return [k, x + 1];
        if (k === 'action' && x === 'APPROVE') return [k, 'APPROVE_WITH_EDIT'];
        return [k, applyEditedAmount(x)];
      }),
    );
  }
  return v;
}

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
      : decision === 'edit' && sc.steps.findIndex((s) => s.gate) >= 0 && i > sc.steps.findIndex((s) => s.gate)
        ? { ...step, payload: applyEditedAmount(step.payload), note: `${step.note}（審核人已將金額修改為 ${EDITED_AMOUNT.toLocaleString()}，後續驗證與稽核皆以修改後內容為準。）` }
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
