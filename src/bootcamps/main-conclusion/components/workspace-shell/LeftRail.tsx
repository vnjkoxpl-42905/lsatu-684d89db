import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  Library,
  Dumbbell,
  Target,
  ScanText,
  LineChart,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Section {
  label: string;
  to: string;
  tag: string;
  Icon: LucideIcon;
}

const sections: Section[] = [
  { label: 'Lessons', to: '/bootcamp/intro-to-lr/lessons', tag: 'M1', Icon: BookOpen },
  { label: 'Reference', to: '/bootcamp/intro-to-lr/reference', tag: 'M2', Icon: Library },
  { label: 'Drills', to: '/bootcamp/intro-to-lr/drills', tag: 'M3', Icon: Dumbbell },
  { label: 'Simulator', to: '/bootcamp/intro-to-lr/simulator', tag: 'M4', Icon: Target },
  { label: 'Hard Sentences', to: '/bootcamp/intro-to-lr/hard-sentences', tag: 'M5', Icon: ScanText },
  { label: 'Diagnostics', to: '/bootcamp/intro-to-lr/diagnostics', tag: 'M6', Icon: LineChart },
];

export function LeftRail(): JSX.Element {
  return (
    <aside
      className={cn(
        'left-rail relative flex h-full flex-col phone:hidden',
        'border-r border-[rgb(var(--border)/0.08)]',
        'bg-[rgb(var(--surface-elev)/0.74)] backdrop-blur-md',
      )}
    >
      <div className="px-5 pt-7 pb-6">
        <Link
          to="/mainhub"
          className={cn(
            'mb-5 inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 -ml-2',
            'font-mc-mono text-label uppercase tracking-wider text-ink-faint',
            'hover:text-ink transition-colors duration-150',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Main Hub
        </Link>
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[4px]',
              'bg-[rgb(var(--surface)/0.86)] border border-[rgb(var(--border)/0.10)] shadow-[var(--soft-shadow)]',
              'font-mc-serif text-[12px] font-medium italic text-ink',
            )}
          >
            LR
          </span>
          <div>
            <div className="font-mc-serif text-h3 font-medium italic text-ink leading-none">
              Intro to LR
            </div>
            <div className="font-mc-mono text-label uppercase tracking-[0.28em] text-ink-faint mt-1.5">
              Logical Reasoning Bootcamp
            </div>
          </div>
        </div>
      </div>

      <nav className="px-2.5 flex-1">
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  cn(
                    'group/nav relative flex items-center gap-3 px-3 py-3 rounded-[6px]',
                    'text-body transition-[background,color,border-color,box-shadow] duration-150 ease-eased border',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                    isActive
                      ? 'text-ink bg-[rgb(var(--surface))] border-[rgb(var(--border)/0.10)] shadow-[var(--soft-shadow)]'
                      : 'text-ink-soft border-transparent hover:text-ink hover:bg-[rgb(var(--surface)/0.66)] hover:border-[rgb(var(--border)/0.08)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <s.Icon
                      aria-hidden="true"
                      className={cn(
                        'relative z-[1] h-4 w-4 shrink-0 transition-colors duration-150 ease-eased',
                        isActive ? 'text-ink' : 'text-ink-faint group-hover/nav:text-ink',
                      )}
                      strokeWidth={isActive ? 2.1 : 1.8}
                    />
                    <span className="relative z-[1] flex-1">{s.label}</span>
                    <span
                      className={cn(
                        'relative z-[1] font-mc-mono text-mono',
                        isActive ? 'text-ink-faint' : 'text-ink-faint',
                      )}
                    >
                      {s.tag}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
