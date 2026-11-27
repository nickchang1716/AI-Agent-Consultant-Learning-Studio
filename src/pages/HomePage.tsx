import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import { CASE_STUDY, modules, phases } from '../data/curriculum';
import InteractiveArchDiagram from '../components/diagrams/InteractiveArchDiagram';
import { useLearning } from '../context/LearningContext';

type StatusFilter = 'all' | 'todo' | 'done';

/** 搜尋範圍：章名、交付成果、核心概念、Lab、Knowledge Check、影片標題 */
function searchText(m: (typeof modules)[number]): string {
  return [m.title, m.deliverable, m.lab, m.knowledgeCheck.q, m.knowledgeCheck.a, ...m.concepts.flatMap((c) => [c.title, c.body]), ...m.videos.map((v) => v.title)].join(' ').toLowerCase();
}

export default function HomePage() {
  const { snap } = useLearning();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const done = new Set(snap.moduleProgress.filter((m) => m.isCompleted).map((m) => m.moduleId));
  const last = snap.preferences.lastModuleId;
  const q = query.trim().toLowerCase();
  const visible = modules.filter((m) => {
    if (status === 'done' && !done.has(m.id)) return false;
    if (status === 'todo' && done.has(m.id)) return false;
    return !q || searchText(m).includes(q);
  });

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
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="search" className="input sm:max-w-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋章節、概念、Lab、影片…" aria-label="搜尋課程內容" maxLength={100} />
          <div role="group" aria-label="完成狀態篩選" className="flex gap-1">
            {([['all', '全部'], ['todo', '未完成'], ['done', '已完成']] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)} className={`btn border text-sm ${status === k ? 'border-teal bg-teal text-white' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 && <p className="text-sm text-slate-500" role="status">沒有符合條件的章節。</p>}
        {phases.filter((p) => visible.some((m) => m.phase === p.id)).map((p) => (
          <div key={p.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-500">Phase {p.id + 1}｜{p.title}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {visible.filter((m) => m.phase === p.id).map((m) => (
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
