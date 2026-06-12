/** SaveStatus — subtle autosave indicator shown in a page header. */
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const map = {
    saving: { icon: Loader2, label: 'Saving…', spin: true, tone: 'text-muted-foreground' },
    saved: { icon: Check, label: 'Saved', spin: false, tone: 'text-muted-foreground' },
    error: { icon: CloudOff, label: 'Not saved', spin: false, tone: 'text-destructive' },
  } as const;
  const { icon: Icon, label, spin, tone } = map[state];
  return (
    <span className={cn('flex items-center gap-1.5 text-[11px]', tone)}>
      <Icon className={cn('h-3 w-3', spin && 'animate-spin')} />
      {label}
    </span>
  );
}
