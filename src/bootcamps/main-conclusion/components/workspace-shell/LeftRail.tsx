import { NavLink } from 'react-router-dom';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const sections: Array<{ label: string; to: string; tag: string }> = [
  { label: 'Lessons', to: '/bootcamp/structure-v2/lessons', tag: 'M1' },
  { label: 'Reference', to: '/bootcamp/structure-v2/reference', tag: 'M2' },
  { label: 'Drills', to: '/bootcamp/structure-v2/drills', tag: 'M3' },
  { label: 'Simulator', to: '/bootcamp/structure-v2/simulator', tag: 'M4' },
  { label: 'Hard Sentences', to: '/bootcamp/structure-v2/hard-sentences', tag: 'M5' },
  { label: 'Diagnostics', to: '/bootcamp/structure-v2/diagnostics', tag: 'M6' },
];

export function LeftRail(): JSX.Element {
  return (
    <aside className="border-r border-[rgb(var(--border)/0.08)] bg-bg-2 phone:hidden">
      <div className="px-4 py-6">
        <div className="font-mc-serif text-h3 font-semibold text-mc-accent">Main Conclusion</div>
        <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mt-1">
          Argument Structure Bootcamp
        </div>
      </div>
      <nav className="px-2">
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2 rounded-3 text-body transition-colors duration-150 ease-eased',
                    isActive
                      ? 'bg-[rgb(var(--accent)/0.10)] text-mc-accent'
                      : 'text-ink-soft hover:bg-surface hover:text-ink',
                  )
                }
              >
                <span>{s.label}</span>
                <span className="font-mc-mono text-mono text-ink-faint">{s.tag}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-[rgb(var(--border)/0.08)] desktop:left-0 desktop:w-[260px] tablet:w-[220px]">
        <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint">
          Gate 4 — Lesson 1.1 review
        </div>
      </div>
    </aside>
  );
}
