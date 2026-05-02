/**
 * MC-LSN-1.13 + MC-HS-5.8 Capstones.
 * M5.8 ships at Phase E with 5 fully authored cluster-decomposition MCQ items
 *   (src/content/m5-capstone.source.ts).
 * M1.13 ships at Phase A.8 in correct-only mode; full 60 distractors author at Phase B/D.
 */

import { useState } from 'react';
import { ArrowRight, Check, X as XIcon } from 'lucide-react';
import calibration from '@/bootcamps/main-conclusion/data/calibration.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { M5_CAPSTONE, type CapstoneItem, type CapstoneChoice } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { newId, now } from '@/bootcamps/main-conclusion/lib/ids';

interface CalibrationFile {
  $comment?: string;
  $schema?: string;
  generated_at?: string;
  generator?: string;
  items: Array<CalibrationItemMeta>;
}
interface CalibrationItemMeta {
  id: string;
  calibration_only: true;
  calibration_module: 'M1' | 'M5';
  trait_target: string;
  trait_target_rationale: string;
  structure_family?: string;
  stimulus_pending_ocr?: boolean;
  stimulus?: string;
  main_conclusion?: string;
  source_anchor: { primary: string; answer_key?: string; audit_tier?: string };
}

interface Props {
  module: 'M1' | 'M5';
}

export function Capstone({ module }: Props) {
  if (module === 'M5') return <M5CapstoneView />;
  return <M1CapstoneCorrectOnly />;
}

export function CapstoneRoute() {
  const path = window.location.pathname;
  const module: 'M1' | 'M5' = path.startsWith('/hard-sentences') ? 'M5' : 'M1';
  return <Capstone module={module} />;
}

// ─── M1.13 (correct-only mode) ─────────────────────────────────────────────
function M1CapstoneCorrectOnly() {
  const cf = calibration as CalibrationFile;
  const items = cf.items.filter((i) => i.calibration_module === 'M1');
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Capstone"
        title="Lesson 13 calibration"
        description="Ten calibration items, different from anything in your lessons or drills. This measures what you learned, not what you memorized."
        actions={
          <>
            <Badge tone="warn" dot>
              correct-only mode
            </Badge>
            <Badge tone="neutral">{items.length} items</Badge>
          </>
        }
      />
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={item.id}>
            <Card variant="surface" data-capstone-item-id={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-mc-serif text-h3 font-semibold mt-1">Item {i + 1}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone="accent">{item.trait_target}</Chip>
                </div>
              </div>
              {item.stimulus ? (
                <p className="font-mc-serif text-body-prose text-ink mt-3 leading-relaxed">{item.stimulus}</p>
              ) : (
                <p className="font-mc-serif text-body-prose text-ink-faint mt-3 italic">
                  The argument is on the way. The other items below are ready now.
                </p>
              )}
              {item.main_conclusion ? (
                <p className="font-mc-serif text-body-prose mt-3">
                  <span className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Correct conclusion · </span>
                  <span className="text-ink">{item.main_conclusion}</span>
                </p>
              ) : null}
              <p className="font-mc-mono text-mono text-ink-faint mt-2">{item.trait_target_rationale}</p>
            </Card>
          </li>
        ))}
      </ol>
      {items.length === 0 ? <EmptyState title="No items" body="Calibration source missing." /> : null}
    </article>
  );
}

// ─── M5.8 (full MCQ mode with 5 items, 4 choices each) ─────────────────────
function M5CapstoneView() {
  const user = useUser();
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const item = M5_CAPSTONE[index]!;
  const isLast = index >= M5_CAPSTONE.length - 1;

  async function record(choice: CapstoneChoice) {
    setPicks((p) => ({ ...p, [item.id]: choice.letter }));
    if (!user) return;
    const persist = getPersistence(user.id);
    await persist.set(TABLES.calibration_attempts, newId(), {
      id: newId(),
      user_id: user.id,
      calibration_only: true,
      calibration_module: 'M5',
      item_id: item.id,
      picked: choice.letter,
      correct: choice.is_correct,
      trait_target: 'cluster-decomposition',
      attempted_at: now(),
    });
  }

  function next() {
    if (isLast) {
      setCompleted(true);
      return;
    }
    setIndex(index + 1);
  }

  if (completed) {
    const total = M5_CAPSTONE.length;
    const correctCount = M5_CAPSTONE.filter(
      (q) => q.choices.find((c) => c.letter === picks[q.id])?.is_correct,
    ).length;
    return (
      <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-4">
        <Card
          variant="elev"
          accent
          className="shadow-[var(--shadow-3),var(--glow-accent-soft)]"
        >
          <Badge tone="accent" dot pulse>
            capstone cleared
          </Badge>
          <h1 className="font-mc-serif text-display font-semibold mt-3 leading-tight">{correctCount} of {total} clean</h1>
          <p className="font-mc-serif text-body-prose text-ink mt-2">
            Cluster-decomposition results are logged. Trait performance feeds your Diagnostics dashboard.
          </p>
          <Button onClick={() => { setIndex(0); setPicks({}); setCompleted(false); }} className="mt-3">
            Retake
          </Button>
        </Card>
        <Card variant="surface">
          <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Item-by-item</h2>
          <ol className="mt-3 space-y-2">
            {M5_CAPSTONE.map((q, i) => {
              const picked = q.choices.find((c) => c.letter === picks[q.id]);
              return (
                <li key={q.id} className="font-mc-serif text-body text-ink flex items-center gap-2" data-capstone-item-id={q.id}>
                  <span className="font-mc-mono text-mono text-ink-faint">Item {i + 1}</span>
                  <span className="text-ink-faint">·</span>
                  <span>picked {picked?.letter ?? 'no answer'}</span>
                  <span className="text-ink-faint">·</span>
                  {picked?.is_correct ? (
                    <Check className="h-4 w-4 text-[rgb(var(--success))]" strokeWidth={2.4} aria-label="Correct" />
                  ) : picked ? (
                    <XIcon className="h-4 w-4 text-[rgb(var(--error))]" strokeWidth={2.4} aria-label="Incorrect" />
                  ) : (
                    <span className="font-mc-mono text-mono text-ink-faint">skipped</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </article>
    );
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-4">
      <PageHeader
        eyebrow="Capstone"
        title="Hard sentences"
        description="Five cluster-decomposition items. Strip the specifiers; pick the core."
        compact
      />
      <div className="flex items-center gap-2">
          <Chip tone="accent">cluster-decomposition</Chip>
          <span className="font-mc-mono text-mono text-ink-faint">
            Question {index + 1} of {M5_CAPSTONE.length}
          </span>
        </div>
      <CapstoneQuestionView item={item} pickedLetter={picks[item.id] ?? null} onPick={record} onNext={next} isLast={isLast} />
    </article>
  );
}

function CapstoneQuestionView({
  item,
  pickedLetter,
  onPick,
  onNext,
  isLast,
}: {
  item: CapstoneItem;
  pickedLetter: string | null;
  onPick: (c: CapstoneChoice) => Promise<void>;
  onNext: () => void;
  isLast: boolean;
}) {
  const submitted = pickedLetter != null;
  return (
    <Card variant="surface" data-capstone-item-id={item.id}>
      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{item.stimulus}</p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-3">{item.prompt}</p>
      <ol className="mt-3 space-y-1.5">
        {item.choices.map((c) => {
          const isPicked = pickedLetter === c.letter;
          return (
            <li key={c.letter}>
              <Button
                variant={isPicked ? 'primary' : 'subtle'}
                className="w-full justify-start"
                disabled={submitted}
                onClick={() => onPick(c)}
              >
                <span className="font-mc-mono text-mono text-ink-faint mr-2">{c.letter}</span>
                <span className="font-mc-serif text-body text-ink flex-1 text-left">{c.text}</span>
                {submitted && c.is_correct ? <Badge tone="success" dot>correct</Badge> : null}
                {submitted && isPicked && !c.is_correct ? <Badge tone="warn" dot>your pick</Badge> : null}
              </Button>
            </li>
          );
        })}
      </ol>
      {submitted ? (
        <div className="mt-3 space-y-2">
          {item.choices.map((c) => (
            <p key={c.letter} className="font-mc-serif text-body text-ink-soft flex items-baseline gap-2">
              <span className="font-mc-mono text-mono shrink-0">{c.letter}</span>
              {c.is_correct ? (
                <Check className="h-3.5 w-3.5 text-[rgb(var(--success))] shrink-0 self-center" strokeWidth={2.4} aria-label="Correct choice" />
              ) : null}
              <span>
                {c.rationale}
                {c.trap_label ? <span className="font-mc-mono text-mono text-ink-faint ml-2">[{c.trap_label}]</span> : null}
              </span>
            </p>
          ))}
          <div className="flex justify-end">
            <Button onClick={onNext} rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}>
              {isLast ? 'Finish' : 'Continue'}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
