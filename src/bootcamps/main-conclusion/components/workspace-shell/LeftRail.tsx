import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Library,
  Dumbbell,
  Target,
  ScanText,
  LineChart,
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
        'bg-[image:linear-gradient(180deg,rgb(11_17_32/0.85)_0%,rgb(5_7_10/0.95)_100%)]',
      )}
    >
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-2',
              'bg-[image:var(--grad-accent-strong)]',
              'border border-[color:var(--border-accent-mid)]',
              'shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]',
              'font-mc-serif text-[12px] font-semibold text-mc-accent',
            )}
          >
            LR
          </span>
          <div>
            <div className="font-mc-serif text-h3 font-semibold text-mc-accent leading-none">
              Intro to LR
            </div>
            <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mt-1.5">
              Logical Reasoning Bootcamp
            </div>
          </div>
        </div>
      </div>

      <nav className="px-2.5 flex-1">
        <ul className="space-y-0.5">
          {sections.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  cn(
                    'group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-3',
                    'text-body transition-colors duration-150 ease-eased',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                    isActive ? 'text-mc-accent' : 'text-ink-soft hover:text-ink hover:bg-[rgb(var(--surface)/0.6)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="mc-leftrail-active"
                        aria-hidden="true"
                        transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.6 }}
                        className={cn(
                          'absolute inset-0 rounded-3',
                          'bg-[image:var(--grad-accent-soft)]',
                          'border border-[color:var(--border-accent-soft)]',
                          'shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--glow-accent-soft)]',
                        )}
                      />
                    ) : null}
                    {isActive ? (
                      <motion.span
                        layoutId="mc-leftrail-bar"
                        transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.6 }}
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full',
                          'bg-[rgb(var(--accent))]',
                          'shadow-[0_0_8px_rgb(232_208_139/0.6)]',
                        )}
                      />
                    ) : null}
                    <s.Icon
                      aria-hidden="true"
                      className={cn(
                        'relative z-[1] h-4 w-4 shrink-0 transition-colors duration-150 ease-eased',
                        isActive ? 'text-mc-accent' : 'text-ink-faint group-hover/nav:text-ink',
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span className="relative z-[1] flex-1">{s.label}</span>
                    <span
                      className={cn(
                        'relative z-[1] font-mc-mono text-mono',
                        isActive ? 'text-mc-accent/80' : 'text-ink-faint',
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

      <div className="px-5 py-4 border-t border-[rgb(var(--border)/0.06)]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              'bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]',
              'motion-safe:animate-pulse motion-reduce:animate-none',
            )}
          />
          <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint">
            Preview mode · all surfaces open
          </div>
        </div>
      </div>
    </aside>
  );
}
