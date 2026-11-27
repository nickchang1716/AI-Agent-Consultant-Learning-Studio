import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { FlowStep } from '../../types/learning';

export default function InteractiveFlow({ steps }: { steps: FlowStep[] }) {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="space-y-3">
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" aria-label="流程步驟">
        {steps.map((st, idx) => (
          <li key={st.label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setI(idx)}
              aria-current={idx === i ? 'step' : undefined}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                idx === i ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              <span className="mr-1 opacity-70">{idx + 1}.</span>
              {st.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight size={16} className="hidden text-slate-400 sm:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="card space-y-2 text-sm" aria-live="polite">
        <h4 className="font-bold">步驟 {i + 1}：{s.label}</h4>
        <p><span className="font-semibold text-teal">輸入：</span>{s.input}</p>
        <p><span className="font-semibold text-teal">輸出：</span>{s.output}</p>
        <p className="flex flex-wrap items-center gap-1">
          <span className="font-semibold text-teal">關鍵技術詞：</span>
          {s.keywords.map((k) => (
            <span key={k} className="tag">{k}</span>
          ))}
        </p>
        <p><span className="font-semibold text-teal">實務案例：</span>{s.example}</p>
      </div>
    </div>
  );
}
