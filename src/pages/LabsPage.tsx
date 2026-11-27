import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimulatorId } from '../types/learning';
import { modules } from '../data/curriculum';
import { SIM_META, renderSimulator } from '../components/simulators';
import PlatformBlueprint from '../components/blueprints/Blueprints';

const IDS: SimulatorId[] = ['sim1', 'sim2', 'sim3', 'sim4', 'sim5'];

export default function LabsPage() {
  const [open, setOpen] = useState<SimulatorId | null>(null);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">互動實驗室</h1>
      <ul className="space-y-3">
        {IDS.map((id) => {
          const meta = SIM_META[id];
          const isOpen = open === id;
          return (
            <li key={id} className="card space-y-3">
              <button type="button" className="flex min-h-[44px] w-full items-start justify-between gap-3 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                <span>
                  <span className="block font-bold">{meta.title}</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">{meta.summary}</span>
                </span>
                <span className="shrink-0 text-teal">{isOpen ? '收合' : '展開'}</span>
              </button>
              <p className="flex flex-wrap gap-2 text-xs">
                對應章節：
                {meta.moduleIds.map((m) => <Link key={m} to={`/module/${m}`} className="tag">{String(m + 1).padStart(2, '0')} {modules[m].title}</Link>)}
              </p>
              {isOpen && <div className="border-t border-slate-200 pt-3 dark:border-slate-700">{renderSimulator(id, meta.moduleIds[0])}</div>}
            </li>
          );
        })}
      </ul>

      <section className="space-y-3" aria-labelledby="bp-h">
        <h2 id="bp-h" className="text-lg font-bold">平台介面導覽圖</h2>
        {(['azureml', 'foundry', 'langsmith'] as const).map((b) => (
          <details key={b} className="card">
            <summary className="min-h-[44px] cursor-pointer py-2 font-semibold">{b === 'azureml' ? 'Azure ML Workspace' : b === 'foundry' ? 'Microsoft Foundry Playground' : 'LangSmith Trace'}</summary>
            <div className="pt-3"><PlatformBlueprint id={b} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
