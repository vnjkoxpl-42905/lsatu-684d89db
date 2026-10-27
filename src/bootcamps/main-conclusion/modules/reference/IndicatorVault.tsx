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

interface CoreSectionConfig {
  id: string;
  kicker: string;
  title: string;
  body: string;
  keyRule: string;
  areLabel: string;
  areNotLabel: string;
  indicatorLabel: string;
  tone: NonNullable<ComponentProps<typeof Chip>['tone']>;
  titleClassName: string;
  are: string[];
  areNot: string[];
}

export interface CoreIndicatorSection extends Category {
  kicker: string;
  title: string;
  body: string;
  keyRule: string;
  areLabel: string;
  areNotLabel: string;
  indicatorLabel: string;
  tone: NonNullable<ComponentProps<typeof Chip>['tone']>;
  titleClassName: string;
  are: string[];
  areNot: string[];
}

const TONE_BY_TOKEN: Record<string, ComponentProps<typeof Chip>['tone']> = {
  '--role-conclusion': 'conclusion',
  '--role-premise': 'premise',
  '--role-pivot': 'pivot',
  '--role-opposing': 'opposing',
  '--role-concession': 'concession',
  '--role-background': 'background',
};

const CORE_SECTION_CONFIG: CoreSectionConfig[] = [
  {
    id: 'IND-premise-FABS',
    kicker: 'The building blocks',
    title: 'Premises: Statements of Fact',
    body:
      'Premises are the facts or evidence in the argument. They tell you what the author is giving you to work with. On the LSAT, you accept the premises as true. Do not push back on the premises. Push back on the conclusion.',
    keyRule:
      'The question is not whether the premises are true. The question is whether the premises actually support the conclusion.',
    areLabel: 'ARE:',
    areNotLabel: 'ARE NOT:',
    indicatorLabel: 'Premise Indicators: FABS',
    tone: 'premise',
    titleClassName: 'mc-indicator-section-title-premise',
    are: ['Facts', 'Evidence', 'Support', 'Building blocks'],
    areNot: ['Main judgments', 'The part you attack', 'Final claims'],
  },
  {
    id: 'IND-conclusion',
    kicker: 'The main point',
    title: "Conclusions: The Author's Claim",
    body:
      'Conclusions are the judgments the author makes. They are the main point the author wants you to accept. This is the part of the argument you should examine most carefully.',
    keyRule:
      'The conclusion is the part of the argument you should be most suspicious of. Ask whether it is too strong, whether it goes beyond the evidence, whether the author assumed something missing, and whether the premises really get us there.',
    areLabel: 'ARE:',
    areNotLabel: 'ARE NOT:',
    indicatorLabel: 'Conclusion Indicator Words',
    tone: 'conclusion',
    titleClassName: 'mc-indicator-section-title-conclusion',
    are: ["Author's claim", 'The point argued for', 'Part you question'],
    areNot: ['Automatically proven', 'Self-supporting', 'Always clear'],
  },
];

export function buildCoreIndicatorSections(data: Category[]): CoreIndicatorSection[] {
  return CORE_SECTION_CONFIG.map((config) => {
    const category = data.find((item) => item.id === config.id);
    if (!category) {
      throw new Error(`Missing core indicator category: ${config.id}`);
    }
    return {
      ...category,
      ...config,
    };
  });
}

export function IndicatorVault({ coreOnly }: { coreOnly?: boolean }) {
  const cats = (vault as Category[]).filter((c) => (coreOnly ? false : true));
  const coreSections = coreOnly ? buildCoreIndicatorSections(vault as Category[]) : [];

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
        <div className="mc-indicator-core-stack mb-12">
          {coreSections.map((section) => (
            <section key={section.id} className="mc-indicator-section">
              <div className="mc-indicator-section-kicker">{section.kicker}</div>
              <h2 className={`mc-indicator-section-title ${section.titleClassName}`}>{section.title}</h2>
              <p className="mc-indicator-section-body">{section.body}</p>
              <p className="mc-indicator-section-rule">
                <strong>Key rule:</strong> {section.keyRule}
              </p>
              <div className="mc-indicator-slabs">
                <div className={`mc-indicator-slab mc-indicator-slab-${section.tone}`}>
                  <span className="mc-indicator-slab-label">{section.areLabel}</span>
                  <span className="mc-indicator-slab-copy">{section.are.join(', ')}.</span>
                </div>
                <div className="mc-indicator-slab mc-indicator-slab-are-not">
                  <span className="mc-indicator-slab-label">{section.areNotLabel}</span>
                  <span className="mc-indicator-slab-copy">{section.areNot.join(', ')}.</span>
                </div>
              </div>
              <div className="mc-indicator-word-group">
                <h3 className={`mc-indicator-word-group-title mc-indicator-word-group-title-${section.tone}`}>
                  {section.indicatorLabel}
                </h3>
                <div className="mc-indicator-word-grid">
                  {section.words.map((word) => (
                    <span
                      key={word}
                      className={`mc-indicator-word-pill mc-indicator-word-pill-${section.tone}`}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {!coreOnly ? (
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
      ) : null}
    </article>
  );
}
