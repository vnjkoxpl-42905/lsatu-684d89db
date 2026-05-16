

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export function DrillTimer({ minutes, running }: { minutes: number; running: boolean }) {
  const totalMs = minutes * 60 * 1000;
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsed = Math.min(totalMs, now - start);
  const remaining = Math.max(0, totalMs - elapsed);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  const danger = remaining < 60_000;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 border px-3 py-1.5 protocol text-xs',
        danger ? 'border-strike bg-strike-tint text-strike' : 'border-rule text-ink-mute',
      )}
    >
      <span>timer</span>
      <span className="font-mono text-base">
        {mm}:{ss}
      </span>
    </div>
  );
}
