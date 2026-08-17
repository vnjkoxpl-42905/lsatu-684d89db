import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Dumbbell,
  ScanText,
  LineChart,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Bookmark,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { usePracticeDrillStatus } from '@/bootcamps/main-conclusion/hooks/usePracticeDrillStatus';

interface NavItem {
  label: string;
  to: string;
  Icon: LucideIcon;
  /** Marks the item whose completion state the rail should surface. */
  progress?: 'practice-drills';
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
      {
        label: 'Practice Drills',
        to: '/bootcamp/intro-to-lr/practice-drills',
        Icon: Sparkles,
        progress: 'practice-drills',
      },
      { label: 'Drill Lab', to: '/bootcamp/intro-to-lr/drills', Icon: Dumbbell },
    ],
    collapsed: false,
  },
  {
    title: 'Tools',
    items: [
      { label: 'Flashcards', to: '/bootcamp/intro-to-lr/reference/flashcards', Icon: Bookmark },
      { label: 'Hard Sentences', to: '/bootcamp/intro-to-lr/hard-sentences', Icon: ScanText },
      { label: 'Diagnostics', to: '/bootcamp/intro-to-lr/diagnostics', Icon: LineChart },
    ],
    collapsed: true,
  },
];

interface LeftRailProps {
  collapsed: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export function LeftRail({
  collapsed,
  onExpand,
  onCollapse,
}: LeftRailProps): JSX.Element {
  const location = useLocation();

  // The rail is the student's answer to "have I finished this yet?", so it
  // reads the same persisted completion state the practice pages do.
  const { statuses, loading: progressLoading } = usePracticeDrillStatus();
  const practiceStates = Object.values(statuses);
  const practiceTotal = practiceStates.length;
  const practiceDone = practiceStates.filter((s) => s.state === 'completed').length;
  const practiceStarted = practiceStates.some((s) => s.state === 'in-progress');

  const progressFor = (
    item: NavItem,
  ): { state: 'complete' | 'partial'; label: string; text: string } | null => {
    if (item.progress !== 'practice-drills' || progressLoading || practiceTotal === 0) return null;
    if (practiceDone === practiceTotal) {
      return {
        state: 'complete',
        label: `${item.label}: all ${practiceTotal} sets completed`,
        text: 'Done',
      };
    }
    if (practiceDone > 0 || practiceStarted) {
      return {
        state: 'partial',
        label: `${item.label}: ${practiceDone} of ${practiceTotal} sets completed`,
        text: `${practiceDone}/${practiceTotal}`,
      };
    }
    return null;
  };

  return (
    <aside
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
      onFocusCapture={onExpand}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onCollapse();
        }
      }}
      className={cn(
        'left-rail relative flex h-full flex-col phone:hidden',
        'border-r border-[rgb(var(--border)/0.08)]',
        'bg-[rgb(var(--surface-elev)/0.74)] backdrop-blur-md',
        'transition-[padding,background-color] duration-220 ease-eased',
        'desktop:overflow-x-hidden',
        collapsed ? 'desktop:px-2' : 'desktop:px-0',
      )}
      aria-label="Intro to LR navigation"
    >
      <div
        className={cn(
          'pt-7 pb-6 transition-[padding] duration-220 ease-eased',
          collapsed ? 'px-5 desktop:px-2.5' : 'px-5',
        )}
      >
        <Link
          to="/classroom"
          className={cn(
            'mb-5 inline-flex items-center rounded-[4px] py-1 transition-[gap,padding,margin] duration-220 ease-eased',
            'font-mc-mono text-label uppercase tracking-wider text-ink-faint',
            'hover:text-ink transition-colors duration-150',
            collapsed
              ? 'gap-1.5 px-2 -ml-2 desktop:justify-center desktop:gap-0 desktop:px-0 desktop:mx-auto desktop:ml-0 desktop:w-10'
              : 'gap-1.5 px-2 -ml-2',
          )}
          aria-label="Back to the classroom"
          title={collapsed ? 'Classroom' : undefined}
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          <span
            className={cn(
              'whitespace-nowrap transition-[opacity,transform,width] duration-180 ease-eased',
              collapsed
                ? 'w-auto translate-x-0 opacity-100 desktop:w-0 desktop:-translate-x-1 desktop:opacity-0 desktop:pointer-events-none'
                : 'w-auto translate-x-0 opacity-100',
            )}
          >
            Classroom
          </span>
        </Link>
        <div
          className={cn(
            'flex items-baseline gap-2 transition-[gap] duration-220 ease-eased',
            collapsed ? 'desktop:justify-center desktop:gap-0' : '',
          )}
        >
          <span
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[4px]',
              'bg-[rgb(var(--surface)/0.86)] border border-[rgb(var(--border)/0.10)] shadow-[var(--soft-shadow)]',
              'font-mc-serif text-[12px] font-medium italic text-ink',
            )}
          >
            LR
          </span>
          <div
            className={cn(
              'overflow-hidden transition-[opacity,transform,width] duration-180 ease-eased',
              collapsed
                ? 'w-auto translate-x-0 opacity-100 desktop:w-0 desktop:-translate-x-1 desktop:opacity-0'
                : 'w-auto translate-x-0 opacity-100',
            )}
          >
            <div className="font-mc-serif text-h3 font-medium italic text-ink leading-none">
              Intro to LR
            </div>
          </div>
        </div>
      </div>

      <nav
        className={cn(
          'flex-1 overflow-y-auto transition-[padding] duration-220 ease-eased',
          collapsed ? 'px-2.5 desktop:px-1.5' : 'px-2.5',
        )}
      >
        {navSections.map((section) => (
          <details
            key={section.title}
            open={
              collapsed ||
              !section.collapsed ||
              section.items.some(
                (item) =>
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
              )
            }
            className="group/details mb-4"
          >
            {collapsed ? (
              <summary className="sr-only">{section.title}</summary>
            ) : (
              <summary className="px-3 mb-2 font-mc-mono text-[10px] uppercase tracking-widest text-ink-faint/60 cursor-pointer list-none flex items-center justify-between">
                {section.title}
                <ChevronDown className="h-3 w-3 opacity-50 group-open/details:rotate-180 transition-transform duration-200" />
              </summary>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const progress = progressFor(item);
                return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group/nav relative flex items-center rounded-[6px] text-body transition-all duration-150',
                        collapsed
                          ? 'gap-3 px-3 py-2 desktop:justify-center desktop:px-0 desktop:py-2.5 desktop:gap-0'
                          : 'gap-3 px-3 py-2',
                        isActive
                          ? 'text-ink bg-[rgb(var(--surface)/0.8)] font-medium'
                          : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.4)]',
                      )
                    }
                    aria-label={progress ? progress.label : item.label}
                    title={collapsed ? progress?.label ?? item.label : undefined}
                  >
                    {/* Icon carries the status dot so the state survives the
                        collapsed rail, where the label is width-zeroed. */}
                    <span className="relative inline-flex shrink-0">
                      <item.Icon className="h-4 w-4 opacity-70" strokeWidth={1.8} />
                      {progress ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute -right-1 -top-1 h-2 w-2 rounded-full',
                            'border border-[rgb(var(--surface))]',
                            progress.state === 'complete'
                              ? 'bg-[rgb(var(--success))]'
                              : 'bg-[rgb(var(--accent))]',
                          )}
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'whitespace-nowrap overflow-hidden transition-[opacity,transform,width] duration-180 ease-eased',
                        collapsed
                          ? 'w-auto translate-x-0 opacity-100 desktop:w-0 desktop:-translate-x-1 desktop:opacity-0 desktop:pointer-events-none'
                          : 'w-auto translate-x-0 opacity-100',
                      )}
                    >
                      {item.label}
                    </span>
                    {progress ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'ml-auto inline-flex items-center gap-1 overflow-hidden',
                          'font-mc-mono text-[9px] uppercase tracking-wider',
                          'transition-[opacity,width] duration-180 ease-eased',
                          progress.state === 'complete'
                            ? 'text-[rgb(var(--success))]'
                            : 'text-[rgb(var(--accent))]',
                          collapsed
                            ? 'w-auto opacity-100 desktop:w-0 desktop:opacity-0'
                            : 'w-auto opacity-100',
                        )}
                      >
                        {progress.state === 'complete' ? (
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        ) : null}
                        {progress.text}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
                );
              })}
            </ul>
          </details>
        ))}
      </nav>
    </aside>
  );
}
