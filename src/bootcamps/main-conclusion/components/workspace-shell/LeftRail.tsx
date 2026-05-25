import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Library,
  Dumbbell,
  Target,
  ScanText,
  LineChart,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { INTRO_GUIDED_SEQUENCE } from '@/bootcamps/main-conclusion/modules/lessons/introGuidedSequence';

interface NavItem {
  label: string;
  to: string;
  Icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsed?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Intro Path',
    items: [{ label: 'Lessons', to: '/bootcamp/intro-to-lr/lessons', Icon: BookOpen }],
  },
  {
    title: 'Practice',
    items: [
      { label: 'Practice Drills', to: '/bootcamp/intro-to-lr/practice-drills', Icon: Sparkles },
      { label: 'Drills', to: '/bootcamp/intro-to-lr/drills', Icon: Dumbbell },
      { label: 'Simulator', to: '/bootcamp/intro-to-lr/simulator', Icon: Target },
    ],
    collapsed: false,
  },
  {
    title: 'Tools',
    items: [
      { label: 'Reference', to: '/bootcamp/intro-to-lr/reference', Icon: Library },
      { label: 'Hard Sentences', to: '/bootcamp/intro-to-lr/hard-sentences', Icon: ScanText },
      { label: 'Diagnostics', to: '/bootcamp/intro-to-lr/diagnostics', Icon: LineChart },
    ],
    collapsed: true,
  },
];

export function LeftRail(): JSX.Element {
  const location = useLocation();
  const isWorkbookMode = location.pathname.includes('/bootcamp/intro-to-lr/lessons');

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
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Main Hub
        </Link>
        <div className="flex items-baseline gap-2">
          <span
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
          </div>
        </div>
      </div>

      <nav className="px-2.5 flex-1 overflow-y-auto">
        {isWorkbookMode ? (
          <div className="space-y-6">
            <details open className="group/details">
              <summary className="px-3 mb-2 font-mc-mono text-[10px] uppercase tracking-widest text-ink-faint/60 cursor-pointer list-none flex items-center justify-between">
                INTRO MODULE
                <ChevronDown className="h-3 w-3 opacity-50 group-open/details:rotate-180 transition-transform duration-200" />
              </summary>
              <ul className="space-y-0.5">
                {INTRO_GUIDED_SEQUENCE.map((step) => {
                  const isActive = location.hash === `#${step.id}`;
                  return (
                    <li key={step.id}>
                      <Link
                        to={`/bootcamp/intro-to-lr/lessons#${step.id}`}
                        className={cn(
                          'group/nav relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-body transition-all duration-150',
                          isActive
                            ? 'text-ink bg-[rgb(var(--surface)/0.8)] font-medium'
                            : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.4)]',
                        )}
                      >
                        <div className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          isActive ? 'bg-[rgb(var(--accent))]' : 'bg-[rgb(var(--border)/0.3)]'
                        )} />
                        <span className="truncate">{step.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>

            <div className="px-3 pt-4 border-t border-[rgb(var(--border)/0.06)]">
              <div className="font-mc-mono text-[10px] uppercase tracking-widest text-ink-faint/60 mb-3">Utility</div>
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/bootcamp/intro-to-lr/reference"
                    className={({ isActive }) =>
                      cn(
                        'group/nav relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-body transition-all duration-150',
                        isActive
                          ? 'text-ink bg-[rgb(var(--surface)/0.8)] font-medium'
                          : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.4)]',
                      )
                    }
                  >
                    <Library className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.8} />
                    <span>Reference</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/bootcamp/intro-to-lr/hard-sentences"
                    className={({ isActive }) =>
                      cn(
                        'group/nav relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-body transition-all duration-150',
                        isActive
                          ? 'text-ink bg-[rgb(var(--surface)/0.8)] font-medium'
                          : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.4)]',
                      )
                    }
                  >
                    <ScanText className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.8} />
                    <span>Hard Sentences</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          navSections.map((section) => (
            <details key={section.title} open={!section.collapsed} className="group/details mb-4">
              <summary className="px-3 mb-2 font-mc-mono text-[10px] uppercase tracking-widest text-ink-faint/60 cursor-pointer list-none flex items-center justify-between">
                {section.title}
                <ChevronDown className="h-3 w-3 opacity-50 group-open/details:rotate-180 transition-transform duration-200" />
              </summary>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'group/nav relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-body transition-all duration-150',
                          isActive
                            ? 'text-ink bg-[rgb(var(--surface)/0.8)] font-medium'
                            : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.4)]',
                        )
                      }
                    >
                      <item.Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}
      </nav>
    </aside>
  );
}
