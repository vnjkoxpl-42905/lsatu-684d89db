import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Search } from 'lucide-react';
import { STRUCTURED_FLASHCARDS, type StructuredFlashcard } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const ROLE_ORDER: StructuredFlashcard['role'][] = [
  'Framework',
  'Conclusion Indicator',
  'Premise Indicator',
  'Pivot Word',
  'Opposing Viewpoint',
  'Concession',
  'Opinion Indicator',
];

const ROLE_TONE: Record<StructuredFlashcard['role'], ComponentProps<typeof Chip>['tone']> = {
  Framework: 'accent',
  'Conclusion Indicator': 'conclusion',
  'Premise Indicator': 'premise',
  'Pivot Word': 'pivot',
  'Opposing Viewpoint': 'opposing',
  Concession: 'concession',
  'Opinion Indicator': 'background',
};

const ROLE_HELP: Record<StructuredFlashcard['role'], string> = {
  Framework: 'Core conclusion-check rules',
  'Conclusion Indicator': 'Words that often point to the claim being proved',
  'Premise Indicator': 'Words that usually introduce support',
  'Pivot Word': 'Turn words that redirect the argument',
  'Opposing Viewpoint': 'Signals that set up a view the author will likely reject',
  Concession: 'Acknowledgments before the author pivots back to their point',
  'Opinion Indicator': 'Judgment language that often marks a conclusion',
};

type RoleFilter = 'All' | StructuredFlashcard['role'];

function normalize(text: string) {
  return text.toLowerCase();
}

export function StructuredFlashcards() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [query, setQuery] = useState('');
  const [selectedFront, setSelectedFront] = useState(STRUCTURED_FLASHCARDS[0]?.front ?? '');
  const [revealed, setRevealed] = useState(false);

  const cards = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return STRUCTURED_FLASHCARDS.filter((card) => {
      if (roleFilter !== 'All' && card.role !== roleFilter) return false;
      if (!normalizedQuery) return true;
      return [card.front, card.role, card.function, card.example, card.note]
        .some((part) => normalize(part).includes(normalizedQuery));
    });
  }, [query, roleFilter]);

  useEffect(() => {
    if (!cards.length) {
      setSelectedFront('');
      return;
    }
    if (!cards.some((card) => card.front === selectedFront)) {
      setSelectedFront(cards[0].front);
      setRevealed(false);
    }
  }, [cards, selectedFront]);

  const selectedIndex = cards.findIndex((card) => card.front === selectedFront);
  const selectedCard = selectedIndex >= 0 ? cards[selectedIndex] : null;

  const roleCounts = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({
        role,
        count: STRUCTURED_FLASHCARDS.filter((card) => card.role === role).length,
      })),
    [],
  );

  const moveSelection = (direction: -1 | 1) => {
    if (!cards.length || selectedIndex < 0) return;
    const nextIndex = (selectedIndex + direction + cards.length) % cards.length;
    setSelectedFront(cards[nextIndex].front);
    setRevealed(false);
  };

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1280px] mx-auto">
      <PageHeader
        eyebrow="Reference"
        title="Flashcards"
        description="Imported from structuredrill and rebuilt inside the Intro to LR reference stack. Use the sidebar to jump between cards or filter by structure family."
        actions={<Chip tone="accent">{STRUCTURED_FLASHCARDS.length} cards</Chip>}
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card variant="surface" className="space-y-4 p-0">
            <div className="border-b border-[rgb(var(--border)/0.08)] p-5">
              <div className="font-mc-mono text-label uppercase tracking-[0.16em] text-ink-faint">
                Card Sidebar
              </div>
              <p className="mt-2 font-mc-serif text-body text-ink-soft leading-relaxed">
                Every structuredrill flashcard is here. Filter by role, then click into the exact card you want to study.
              </p>
            </div>

            <div className="px-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search words or prompts"
                  className={cn(
                    'w-full rounded-[6px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface-elev)/0.72)] py-2.5 pl-9 pr-3',
                    'font-mc-sans text-body text-ink placeholder:text-ink-faint',
                    'outline-none transition-colors duration-150 ease-eased',
                    'focus:border-[rgb(var(--accent)/0.28)] focus:bg-[rgb(var(--surface))]',
                  )}
                />
              </label>
            </div>

            <div className="px-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRoleFilter('All')}
                className={cn(
                  'rounded-full border px-3 py-1.5 font-mc-mono text-mono transition-colors duration-150 ease-eased',
                  roleFilter === 'All'
                    ? 'border-[rgb(var(--accent)/0.22)] bg-[rgb(var(--accent)/0.10)] text-mc-accent'
                    : 'border-[rgb(var(--border)/0.10)] text-ink-soft hover:text-ink',
                )}
              >
                All · {STRUCTURED_FLASHCARDS.length}
              </button>
              {roleCounts.map(({ role, count }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-mc-mono text-mono transition-colors duration-150 ease-eased',
                    roleFilter === role
                      ? 'border-[rgb(var(--accent)/0.22)] bg-[rgb(var(--accent)/0.10)] text-mc-accent'
                      : 'border-[rgb(var(--border)/0.10)] text-ink-soft hover:text-ink',
                  )}
                >
                  {role} · {count}
                </button>
              ))}
            </div>

            <div className="max-h-[58vh] overflow-y-auto border-t border-[rgb(var(--border)/0.08)] px-2 pb-2">
              {cards.length ? (
                <ul className="space-y-1 p-2">
                  {cards.map((card, index) => (
                    <li key={card.front}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFront(card.front);
                          setRevealed(false);
                        }}
                        className={cn(
                          'w-full rounded-[6px] border px-3 py-3 text-left transition-all duration-150 ease-eased',
                          selectedCard?.front === card.front
                            ? 'border-[rgb(var(--accent)/0.22)] bg-[rgb(var(--accent)/0.08)] shadow-[var(--shadow-1)]'
                            : 'border-transparent hover:border-[rgb(var(--border)/0.12)] hover:bg-[rgb(var(--surface-elev)/0.36)]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                              Card {index + 1}
                            </div>
                            <div className="mt-1 font-mc-serif text-body text-ink leading-snug">
                              {card.front}
                            </div>
                          </div>
                          <Chip tone={ROLE_TONE[card.role]} className="shrink-0">
                            {card.role}
                          </Chip>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 font-mc-serif text-body text-ink-soft">
                  No cards match that filter yet. Try another role or clear the search.
                </div>
              )}
            </div>
          </Card>
        </aside>

        <section className="min-w-0 space-y-5">
          {selectedCard ? (
            <>
              <Card variant="elev" accent className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
                      Structuredrill flashcard
                    </div>
                    <h2 className="mt-3 font-mc-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] italic text-ink">
                      {selectedCard.front}
                    </h2>
                  </div>
                  <Chip tone={ROLE_TONE[selectedCard.role]}>{selectedCard.role}</Chip>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    onClick={() => setRevealed((value) => !value)}
                  >
                    {revealed ? 'Hide answer' : 'Reveal answer'}
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                    onClick={() => moveSelection(-1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => moveSelection(1)}
                  >
                    Next
                  </Button>
                </div>

                <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.82)] p-5">
                  <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                    Role
                  </div>
                  <p className="mt-2 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
                    {ROLE_HELP[selectedCard.role]}
                  </p>
                </div>

                {revealed ? (
                  <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
                    <Card variant="surface" className="space-y-3">
                      <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-mc-accent">
                        What it does
                      </div>
                      <div className="space-y-2">
                        {selectedCard.function.split('\n').map((line) => (
                          <p key={line} className="font-mc-serif text-body-prose text-ink leading-relaxed">
                            {line}
                          </p>
                        ))}
                      </div>
                    </Card>

                    <div className="space-y-4">
                      <Card variant="surface" className="space-y-3">
                        <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                          Example
                        </div>
                        <p className="font-mc-serif text-body-prose italic text-ink leading-relaxed">
                          {selectedCard.example}
                        </p>
                      </Card>
                      <Card variant="surface" className="space-y-3">
                        <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                          Study note
                        </div>
                        <p className="font-mc-serif text-body-prose text-ink-soft leading-relaxed">
                          {selectedCard.note}
                        </p>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <Card
                    variant="ghost"
                    className="border-dashed border-[rgb(var(--border-accent-mid))] bg-[rgb(var(--accent)/0.04)]"
                  >
                    <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-mc-accent">
                      Study prompt
                    </div>
                    <p className="mt-2 font-mc-serif text-body-prose text-ink leading-relaxed">
                      Make the call before you reveal it. Say the role out loud, define what the phrase usually does, then flip the card and compare.
                    </p>
                  </Card>
                )}
              </Card>
            </>
          ) : (
            <Card variant="surface">
              <p className="font-mc-serif text-body-prose text-ink-soft leading-relaxed">
                No flashcard is selected. Pick one from the sidebar to start studying.
              </p>
            </Card>
          )}
        </section>
      </div>
    </article>
  );
}
