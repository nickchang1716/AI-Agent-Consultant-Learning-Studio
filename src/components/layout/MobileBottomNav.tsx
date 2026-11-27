import { NavLink } from 'react-router-dom';
import { mainNav } from './Sidebar';

export default function MobileBottomNav() {
  return (
    <nav aria-label="底部導覽" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden dark:border-slate-700 dark:bg-slate-800">
      <ul className="grid grid-cols-5">
        {mainNav.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'font-semibold text-teal' : 'text-slate-500 dark:text-slate-300'}`
              }
            >
              <n.icon size={20} aria-hidden />
              {n.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
