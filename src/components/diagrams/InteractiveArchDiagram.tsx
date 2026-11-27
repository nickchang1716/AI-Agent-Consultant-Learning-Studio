import { useState } from 'react';
import { Link } from 'react-router-dom';
import { archNodes } from '../../data/architecture';
import { modules } from '../../data/curriculum';

const layerTitles: Record<number, string> = {
  1: '第 1 層：入口',
  2: '第 2 層：Agent 編排',
  3: '第 3 層：三大能力',
  4: '第 4 層：企業資料與 API',
  5: '第 5 層：跨層治理',
};

export default function InteractiveArchDiagram() {
  const [sel, setSel] = useState<string>('orchestration');
  const node = archNodes.find((n) => n.id === sel) ?? archNodes[0];

  return (
    <section aria-label="企業級銀行 AI Agent 架構圖" className="space-y-3">
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        {[1, 2, 3, 4, 5].map((layer) => {
          const nodes = archNodes.filter((n) => n.layer === layer);
          return (
            <div key={layer}>
              <p className="mb-1 text-[11px] font-semibold text-slate-400">{layerTitles[layer]}</p>
              <div className={`grid gap-2 ${nodes.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                {nodes.map((n) => {
                  const active = n.id === sel;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSel(n.id)}
                      aria-pressed={active}
                      className={`min-h-[56px] rounded-lg border px-3 py-2 text-left transition ${
                        active ? 'border-teal bg-teal text-white shadow' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-teal dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{n.label}</span>
                      <span className={`block break-words text-xs ${active ? 'text-white/85' : 'text-slate-500 dark:text-slate-300'}`}>{n.subtitle}</span>
                    </button>
                  );
                })}
              </div>
              {layer < 5 && <p className="text-center text-slate-300" aria-hidden>▼</p>}
            </div>
          );
        })}
      </div>

      <article className="card space-y-2" aria-live="polite">
        <h3 className="text-lg font-bold">{node.label}</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-teal">一句話白話比喻</dt>
            <dd>{node.analogy}</dd>
          </div>
          <div>
            <dt className="font-semibold text-teal">銀行財富管理具體場景</dt>
            <dd>{node.scenario}</dd>
          </div>
          <div>
            <dt className="font-semibold text-red-600">顧問設計地雷</dt>
            <dd>{node.pitfall}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2 pt-1">
          {node.moduleIds.map((id) => (
            <Link key={id} to={`/module/${id}`} className="btn-ghost">
              前往 {String(id + 1).padStart(2, '0')} {modules[id].title}
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
