import { Link } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import { CASE_STUDY, modules, phases } from '../data/curriculum';
import InteractiveArchDiagram from '../components/diagrams/InteractiveArchDiagram';
import { useLearning } from '../context/LearningContext';

export default function HomePage() {
  const { snap } = useLearning();
  const done = new Set(snap.moduleProgress.filter((m) => m.isCompleted).map((m) => m.moduleId));
  const last = snap.preferences.lastModuleId;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-navy dark:text-white">銀行財富管理 AI Agent 顧問學習</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">貫穿案例：{CASE_STUDY}。共 6 個階段、12 章、約 80 小時。</p>
        <Link to={`/module/${last}`} className="btn-primary">繼續學習：{String(last + 1).padStart(2, '0')} {modules[last]?.title}</Link>
      </header>

      <section aria-labelledby="arch-h" className="space-y-3">
        <h2 id="arch-h" className="text-lg font-bold">一張圖看懂企業級銀行 AI Agent（點擊任一區塊）</h2>
        <InteractiveArchDiagram />
      </section>

      <section aria-labelledby="toc-h" className="space-y-4">
        <h2 id="toc-h" className="text-lg font-bold">課程總覽</h2>
        {phases.map((p) => (
          <div key={p.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-500">Phase {p.id + 1}｜{p.title}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {modules.filter((m) => m.phase === p.id).map((m) => (
                <li key={m.id}>
                  <Link to={`/module/${m.id}`} className="card flex min-h-[64px] items-start gap-3 hover:border-teal">
                    <span className="mt-0.5 text-lg font-bold text-teal">{String(m.id + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{m.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden /> {m.hours} 小時</span>
                        <span>交付：{m.deliverable}</span>
                      </span>
                    </span>
                    {done.has(m.id) && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="已完成" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
