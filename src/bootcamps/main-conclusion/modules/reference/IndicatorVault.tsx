/**
 * Indicator Vault — the 6-category color-coded lookup. UI built in Phase A;
 * description/example fields finalized in Phase B (data already in indicator-vault.generated.json).
 */

import vault from '@/bootcamps/main-conclusion/data/indicator-vault.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import type { ComponentProps } from 'react';

interface Category {
  id: string;
  name: string;
  color_token: string;
  description: string;
  words: string[];
  example: string;
}

const TONE_BY_TOKEN: Record<string, ComponentProps<typeof Chip>['tone']> = {
  '--role-conclusion': 'conclusion',
  '--role-premise': 'premise',
  '--role-pivot': 'pivot',
  '--role-opposing': 'opposing',
  '--role-concession': 'concession',
  '--role-background': 'background',
};

export function IndicatorVault() {
  const cats = vault as Category[];
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">MC-REF-2.A</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Indicator Vault</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          Six categories. Memorize them. Tattoo them if you have to.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cats.map((c) => {
          const tone = TONE_BY_TOKEN[c.color_token] ?? 'neutral';
          return (
            <li key={c.id}>
              <Card variant="surface" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-mc-serif text-h3 font-semibold">{c.name}</h2>
                  <Chip tone={tone}>{c.id}</Chip>
                </div>
                <p className="font-mc-serif text-body-prose text-ink-soft">{c.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.words.map((w) => (
                    <Chip key={w} tone={tone}>
                      {w}
                    </Chip>
                  ))}
                </div>
                <p className="font-mc-serif text-body text-ink-soft italic border-t border-[rgb(var(--border)/0.08)] pt-3">
                  {c.example}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
