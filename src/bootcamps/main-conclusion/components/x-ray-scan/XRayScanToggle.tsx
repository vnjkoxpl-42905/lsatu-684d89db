/**
 * X-Ray Scan — toggles role color overlay on a stimulus block.
 *
 * Usage:
 *   <XRayScanToggle>
 *     <RoleColorOverlay segments={[{ role: 'conclusion', text: '...' }, ...]} />
 *   </XRayScanToggle>
 */

import { useState, type ReactNode } from 'react';
import { ScanLine } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Toggle } from '@/bootcamps/main-conclusion/components/primitives/Toggle';

interface Props {
  children: ReactNode;
  initialOn?: boolean;
  label?: string;
  ariaId?: string;
  /** Show the role-color legend below the toggle when on. */
  showLegend?: boolean;
}

export function XRayScanToggle({
  children,
  initialOn = false,
  label = 'X-Ray Scan',
  ariaId,
  showLegend = true,
}: Props) {
  const [on, setOn] = useState(initialOn);
  const id = ariaId ?? 'x-ray-scan-toggle';
  return (
    <div>
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-3 px-3 py-2 mb-3',
          'bg-[image:var(--grad-surface-soft)]',
          'border border-[rgb(var(--border)/0.10)]',
          'shadow-[var(--shadow-1)]',
        )}
      >
        <div className="inline-flex items-center gap-2 font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
          <ScanLine
            className={cn(
              'h-3.5 w-3.5 transition-colors duration-150 ease-eased',
              on ? 'text-mc-accent' : 'text-ink-faint',
            )}
            strokeWidth={2.2}
            aria-hidden="true"
          />
          Roles
        </div>
        <Toggle id={id} checked={on} onChange={setOn} label={label} />
      </div>
      {on && showLegend ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <RoleSwatch role="conclusion" label="conclusion" />
          <RoleSwatch role="premise" label="premise" />
          <RoleSwatch role="pivot" label="pivot" />
          <RoleSwatch role="opposing" label="opposing" />
          <RoleSwatch role="concession" label="concession" />
          <RoleSwatch role="background" label="background" />
        </div>
      ) : null}
      <div className={cn('x-ray-scan', on ? 'x-ray-on' : 'x-ray-off')} data-x-ray={on ? 'on' : 'off'}>
        {children}
      </div>
    </div>
  );
}

function RoleSwatch({ role, label }: { role: Role; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
        'border font-mc-mono text-[10.5px] font-semibold uppercase tracking-wider',
        ROLE_CLASS[role],
      )}
    >
      <span aria-hidden="true" className={cn('inline-block h-1.5 w-1.5 rounded-full', SWATCH_DOT[role])} />
      {label}
    </span>
  );
}

type Role = 'conclusion' | 'premise' | 'pivot' | 'opposing' | 'concession' | 'background';

export interface Segment {
  role: Role | null;
  text: string;
}

interface OverlayProps {
  segments: Segment[];
}

const ROLE_CLASS: Record<Role, string> = {
  conclusion: 'bg-[rgb(var(--role-conclusion)/0.18)] text-[rgb(var(--role-conclusion))] border-[rgb(var(--role-conclusion)/0.40)]',
  premise: 'bg-[rgb(var(--role-premise)/0.16)] text-[rgb(var(--role-premise))] border-[rgb(var(--role-premise)/0.40)]',
  pivot: 'bg-[rgb(var(--role-pivot)/0.16)] text-[rgb(var(--role-pivot))] border-[rgb(var(--role-pivot)/0.40)]',
  opposing: 'bg-[rgb(var(--role-opposing)/0.16)] text-[rgb(var(--role-opposing))] border-[rgb(var(--role-opposing)/0.40)]',
  concession: 'bg-[rgb(var(--role-concession)/0.16)] text-[rgb(var(--role-concession))] border-[rgb(var(--role-concession)/0.40)]',
  background: 'bg-[rgb(var(--role-background)/0.10)] text-[rgb(var(--role-background))] border-[rgb(var(--role-background)/0.30)]',
};

const SWATCH_DOT: Record<Role, string> = {
  conclusion: 'bg-[rgb(var(--role-conclusion))]',
  premise: 'bg-[rgb(var(--role-premise))]',
  pivot: 'bg-[rgb(var(--role-pivot))]',
  opposing: 'bg-[rgb(var(--role-opposing))]',
  concession: 'bg-[rgb(var(--role-concession))]',
  background: 'bg-[rgb(var(--role-background))]',
};

const OVERLAY_CLASS: Record<Role, string> = {
  conclusion: 'bg-[rgb(var(--role-conclusion)/0.18)] border-b border-[rgb(var(--role-conclusion)/0.50)]',
  premise: 'bg-[rgb(var(--role-premise)/0.16)] border-b border-[rgb(var(--role-premise)/0.45)]',
  pivot: 'bg-[rgb(var(--role-pivot)/0.16)] border-b border-[rgb(var(--role-pivot)/0.45)]',
  opposing: 'bg-[rgb(var(--role-opposing)/0.16)] border-b border-[rgb(var(--role-opposing)/0.45)]',
  concession: 'bg-[rgb(var(--role-concession)/0.16)] border-b border-[rgb(var(--role-concession)/0.45)]',
  background: 'bg-[rgb(var(--role-background)/0.10)] border-b border-[rgb(var(--role-background)/0.30)]',
};

export function RoleColorOverlay({ segments }: OverlayProps) {
  return (
    <p className="font-mc-serif text-body-prose leading-relaxed">
      {segments.map((s, i) => (
        <span
          key={i}
          className={cn(
            'x-ray-segment transition-colors duration-150 ease-eased',
            s.role && OVERLAY_CLASS[s.role],
          )}
        >
          {s.text}
          {i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}
