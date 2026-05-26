/**
 * Indicator Vault — the 6-category color-coded lookup.
 */

import vault from '@/bootcamps/main-conclusion/data/indicator-vault.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import type { ComponentProps } from 'react';

interface Category {
  id: string;
  name: string;
  is_core: boolean;
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

export function IndicatorVault({ coreOnly }: { coreOnly?: boolean }) {
  const cats = (vault as Category[]).filter((c) => !coreOnly || c.is_core);
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Reference"
        title={coreOnly ? 'Core Indicator Words' : 'Indicator Vault'}
        description={
          coreOnly
            ? 'Indicator words are clues, not proof. First find the structure. Then use indicators to speed up confirmation.'
            : 'Six categories. Memorize them. Tattoo them if you have to.'
        }
      />

      {coreOnly && (
        <div className="mb-10 space-y-4 font-mc-serif text-body-prose text-ink leading-relaxed border-l-2 border-[rgb(var(--border-accent-mid))] pl-6">
          <p>The rules of the road:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Conclusion indicators</strong> usually point to the author’s claim.
            </li>
            <li>
              <strong>FABS</strong> usually points to support.
            </li>
            <li>Always ask: what is being proved, and what is doing the proving?</li>
          </ul>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {cats.map((c) => {
          const tone = TONE_BY_TOKEN[c.color_token] ?? 'neutral';
          return (
            <li key={c.id}>
              <Card variant="surface" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-mc-serif text-h3 font-semibold text-ink leading-tight">{c.name}</h2>
                  
                </div>
                <p className="font-mc-serif text-body-prose text-ink-soft leading-relaxed">
                  {c.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.words.map((w) => (
                    <Chip key={w} tone={tone}>
                      {w}
                    </Chip>
                  ))}
                </div>
                <p className="font-mc-serif text-body text-ink-soft italic border-t border-[rgb(var(--border)/0.08)] pt-3 leading-relaxed">
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
