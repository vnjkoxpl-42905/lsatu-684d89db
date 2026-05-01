/**
 * X-Ray Scan — toggles role color overlay on a stimulus block.
 * Per architecture-plan §1, NT-X-Ray-Scan named tool.
 *
 * Usage:
 *   <XRayScanToggle>
 *     <RoleColorOverlay segments={[{ role: 'conclusion', text: '...' }, ...]} />
 *   </XRayScanToggle>
 *
 * The toggle wraps a stimulus block and reveals/hides role colors via a CSS class
 * applied to the wrapper. Role colors come from --role-* tokens.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Toggle } from '@/bootcamps/main-conclusion/components/primitives/Toggle';

interface Props {
  children: ReactNode;
  initialOn?: boolean;
  label?: string;
  ariaId?: string;
}

export function XRayScanToggle({ children, initialOn = false, label = 'X-Ray Scan', ariaId }: Props) {
  const [on, setOn] = useState(initialOn);
  const id = ariaId ?? 'x-ray-scan-toggle';
  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <Toggle id={id} checked={on} onChange={setOn} label={label} />
      </div>
      <div className={cn('x-ray-scan', on ? 'x-ray-on' : 'x-ray-off')} data-x-ray={on ? 'on' : 'off'}>
        {children}
      </div>
    </div>
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
        <span key={i} className={cn('x-ray-segment transition-colors duration-150', s.role && ROLE_CLASS[s.role])}>
          {s.text}
          {i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}
