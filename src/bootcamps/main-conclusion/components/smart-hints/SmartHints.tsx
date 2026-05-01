/**
 * Smart Hints — progressive-disclosure hint button.
 * Tap to reveal Hint 1; tap again for Hint 2; etc. Records hint usage.
 */

import { useState } from 'react';
import { findHints } from './hints';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';

interface Props {
  surfaceId: string;
  onUsed?: (level: number) => void;
}

export function SmartHints({ surfaceId, onUsed }: Props) {
  const hints = findHints(surfaceId);
  const [revealed, setRevealed] = useState(0);
  if (hints.length === 0) return null;

  function reveal() {
    const next = Math.min(revealed + 1, hints.length);
    setRevealed(next);
    onUsed?.(next);
  }

  return (
    <Card variant="ghost" className="space-y-2">
      <div className="flex items-center justify-between">
        <Chip tone="accent">Smart Hint</Chip>
        <span className="font-mc-mono text-mono text-ink-faint">
          {revealed} / {hints.length} used
        </span>
      </div>
      {hints.slice(0, revealed).map((h, i) => (
        <p key={i} className="font-mc-serif text-body-prose text-ink">
          <span className="font-mc-mono text-mono text-ink-faint mr-2">Hint {i + 1}.</span>
          {h}
        </p>
      ))}
      {revealed < hints.length ? (
        <Button variant="subtle" size="sm" onClick={reveal}>
          Reveal {revealed === 0 ? 'first' : 'next'} hint
        </Button>
      ) : (
        <p className="font-mc-mono text-mono text-ink-faint">All hints used.</p>
      )}
    </Card>
  );
}
