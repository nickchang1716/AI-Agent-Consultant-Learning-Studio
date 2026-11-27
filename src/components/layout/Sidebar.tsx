import { NavLink } from 'react-router-dom';
import { BookOpen, CheckCircle2, FlaskConical, Flame, HelpCircle, Layers, Settings } from 'lucide-react';
import { modules, phases, TOTAL_HOURS } from '../../data/curriculum';
import { useLearning } from '../../context/LearningContext';

export const mainNav = [
  { to: '/', label: '課程總覽', short: '課程', icon: BookOpen, end: true },
  { to: '/labs', label: '互動實驗室', short: '實驗室', icon: FlaskConical, end: false },
  { to: '/flashcards', label: '閃卡複習', short: '閃卡', icon: Layers, end: false },
  { to: '/parking', label: '疑問箱', short: '疑問箱', icon: HelpCircle, end: false },
  { to: '/settings', label: '設定', short: '設定', icon: Settings, end: false },
] as const;

export function useProgressStats() {
  const { snap } = useLearning();
  const doneSet = new Set(snap.moduleProgress.filter((m) => m.isCompleted).map((m) => m.moduleId));
  const doneHours = modules.filter((m) => doneSet.has(m.id)).reduce((s, m) => s + m.hours, 0);
  return { doneSet, doneCount: doneSet.size, doneHours, streak: snap.preferences.streakDays };
}

export function ChapterList({ onNavigate }: { onNavigate?: () => void }) {
  const { doneSet } = useProgressStats();
  return (
    <nav aria-label="章節目錄" className="space-y-3">
      {phases.map((p) => (
        <div key={p.id}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Phase {p.id + 1}｜{p.title}
          </p>
          <ul className="mt-1">
            {modules
              .filter((m) => m.phase === p.id)
              .map((m) => (
                <li key={m.id}>
                  <NavLink
                    to={`/module/${m.id}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                        isActive ? 'bg-teal text-white' : 'text-slate-200 hover:bg-white/10'
                      }`
                    }
                  >
                    {doneSet.has(m.id) ? <CheckCircle2 size={16} className="shrink-0 text-emerald-300" aria-label="已完成" /> : <span className="w-4 shrink-0 text-center text-xs opacity-70">{m.id + 1}</span>}
                    <span className="min-w-0 flex-1 truncate">{String(m.id + 1).padStart(2, '0')} {m.title}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ProgressSummary() {
  const { doneCount, doneHours, streak } = useProgressStats();
  const pct = Math.round((doneCount / modules.length) * 100);
  return (
    <div className="rounded-lg bg-white/10 p-3 text-slate-100">
      <div className="flex items-center justify-between text-sm">
        <span>{doneCount} / {modules.length} 章</span>
        <span className="inline-flex items-center gap-1" title="連續學習天數"><Flame size={14} className="text-orange-300" aria-hidden /> {streak} 天</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="學習進度">
        <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs opacity-80">{doneHours} / {TOTAL_HOURS} 小時</p>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col gap-3 overflow-y-auto bg-navy p-3 lg:flex">
      <div className="px-2 pt-1 text-white">
        <h1 className="text-base font-bold leading-tight">AI Agent Consultant<br />Learning Studio</h1>
      </div>
      <ProgressSummary />
      <nav aria-label="主要功能" className="grid grid-cols-2 gap-1">
        {mainNav.slice(0, 4).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm ${isActive ? 'bg-teal text-white' : 'text-slate-200 hover:bg-white/10'}`
            }
          >
            <n.icon size={16} aria-hidden /> {n.label}
          </NavLink>
        ))}
      </nav>
      <ChapterList />
      <NavLink to="/settings" className={({ isActive }) => `mt-auto flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm ${isActive ? 'bg-teal text-white' : 'text-slate-200 hover:bg-white/10'}`}>
        <Settings size={16} aria-hidden /> 設定與備份
      </NavLink>
    </aside>
  );
}
