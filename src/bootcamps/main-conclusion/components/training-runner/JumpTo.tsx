import { Link } from 'react-router-dom';
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

const BC = '/bootcamp/intro-to-lr';

interface Pill {
  label: string;
  to: string;
  Icon: LucideIcon;
}

const PILLS: Pill[] = [
  { label: 'Lessons', to: `${BC}/lessons`, Icon: BookOpen },
  { label: 'Reference', to: `${BC}/reference`, Icon: Library },
  { label: 'Drills', to: `${BC}/drills`, Icon: Dumbbell },
  { label: 'Simulator', to: `${BC}/simulator`, Icon: Target },
  { label: 'Hard Sentences', to: `${BC}/hard-sentences`, Icon: ScanText },
  { label: 'Diagnostics', to: `${BC}/diagnostics`, Icon: LineChart },
];

export function JumpTo(): JSX.Element {
  return (
    <section aria-label="Jump to a module">
      <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-3">
        Or jump to
      </div>
      <ul className="flex flex-wrap gap-2">
        {PILLS.map((p) => (
          <li key={p.to}>
            <Link
              to={p.to}
              className={cn(
                'group/pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5',
                'bg-[rgb(var(--surface-elev)/0.7)] backdrop-blur-sm',
                'border border-[rgb(var(--border)/0.10)]',
                'font-mc-mono text-mono text-ink-soft',
                'transition-[border-color,color,background] duration-150 ease-eased',
                'hover:text-mc-accent hover:border-[color:var(--border-accent-soft)] hover:bg-[rgb(var(--accent)/0.06)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
              )}
            >
              <p.Icon
                className="h-3.5 w-3.5 text-ink-faint group-hover/pill:text-mc-accent transition-colors duration-150 ease-eased"
                strokeWidth={2}
                aria-hidden="true"
              />
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
