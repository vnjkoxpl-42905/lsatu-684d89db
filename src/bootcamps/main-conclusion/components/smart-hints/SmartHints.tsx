/**
 * Smart Hints — progressive-disclosure hint button.
 * Tap to reveal Hint 1; tap again for Hint 2; etc. Records hint usage.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkle } from 'lucide-react';
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

  const allUsed = revealed >= hints.length;

  return (
    <Card variant="ghost" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Chip tone="accent">
          <Lightbulb className="h-3 w-3 -ml-0.5" strokeWidth={2.2} aria-hidden="true" />
          Smart Hint
        </Chip>
        <span className="font-mc-mono text-mono text-ink-faint">
          {revealed} / {hints.length} used
        </span>
      </div>
      <AnimatePresence initial={false}>
        {hints.slice(0, revealed).map((h, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="font-mc-serif text-body-prose text-ink leading-relaxed"
          >
            <span className="font-mc-mono text-mono text-mc-accent mr-2">Hint {i + 1}.</span>
            {h}
          </motion.p>
        ))}
      </AnimatePresence>
      {!allUsed ? (
        <Button
          variant="subtle"
          size="sm"
          leftIcon={<Sparkle className="h-3.5 w-3.5" strokeWidth={2.2} />}
          onClick={reveal}
        >
          Reveal {revealed === 0 ? 'first' : 'next'} hint
        </Button>
      ) : (
        <p className="font-mc-mono text-mono text-ink-faint">All hints used.</p>
      )}
    </Card>
  );
}
