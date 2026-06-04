/**
 * MC-HS-5.8 Capstone.
 * Ships at Phase E with 5 fully authored cluster-decomposition MCQ items
 * (src/content/m5-capstone.source.ts).
 */

import { useState } from 'react';
import { ArrowRight, Check, X as XIcon, BookOpen } from 'lucide-react';
import LRQuestionModal from '@/components/drill/shared/LRQuestionModal';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { M5_CAPSTONE, type CapstoneItem, type CapstoneChoice } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { newId, now } from '@/bootcamps/main-conclusion/lib/ids';
export function Capstone() {
  return <M5CapstoneView />;
}

export function CapstoneRoute() {
  return <Capstone />;
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
  const [open, setOpen] = useState(false);
  const submitted = pickedLetter != null;
  const pickedChoice = submitted ? item.choices.find((c) => c.letter === pickedLetter) ?? null : null;
  const correctLetter = item.choices.find((c) => c.is_correct)?.letter ?? '';

  const answerChoices = Object.fromEntries(item.choices.map((c) => [c.letter, c.text]));
  const explanations = Object.fromEntries(
    item.choices.map((c) => [
      c.letter,
      {
        verdict: c.is_correct ? ('correct' as const) : ('incorrect' as const),
        whyCorrect: c.is_correct ? c.rationale : undefined,
        whyIncorrect: !c.is_correct ? c.rationale : undefined,
      },
    ]),
  );

  return (
    <Card variant="surface" data-capstone-item-id={item.id}>
      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{item.stimulus}</p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-3">{item.prompt}</p>

      {!submitted ? (
        <div className="mt-4">
          <Button onClick={() => setOpen(true)} rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            Open question
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="font-mc-mono text-mono text-ink-faint">
            You picked <span className="text-ink">{pickedLetter}</span>
            {pickedChoice?.is_correct ? (
              <Check className="inline h-3.5 w-3.5 text-[rgb(var(--success))] ml-2" strokeWidth={2.4} aria-label="Correct" />
            ) : (
              <XIcon className="inline h-3.5 w-3.5 text-[rgb(var(--error))] ml-2" strokeWidth={2.4} aria-label="Incorrect" />
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="subtle" size="sm" onClick={() => setOpen(true)} leftIcon={<BookOpen className="h-3.5 w-3.5" strokeWidth={2.2} />}>
              Review explanations
            </Button>
            <Button onClick={onNext} rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}>
              {isLast ? 'Finish' : 'Continue'}
            </Button>
          </div>
        </div>
      )}

      {open && (
        <LRQuestionModal
          inline={{
            id: item.id,
            number: item.number,
            stimulus: item.stimulus,
            questionStem: item.prompt,
            answerChoices,
            correctAnswer: correctLetter,
            explanations,
            eyebrow: `Capstone · Q${item.number}`,
          }}
          onClose={() => setOpen(false)}
          onSubmit={({ key }) => {
            if (submitted) return;
            const choice = item.choices.find((c) => c.letter === key);
            if (choice) void onPick(choice);
          }}
        />
      )}
    </Card>
  );
}
