/**
 * 5.8 Hard Sentences capstone (letterpress generation).
 * Five cluster-decomposition MCQs. Answers run through LRQuestionModal (full
 * per-choice explanations); every pick is recorded to calibration_attempts and
 * finishing marks M5.8 in completed_capstones.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, X as XIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import LRQuestionModal from '@/components/drill/shared/LRQuestionModal';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { M5_CAPSTONE, type CapstoneItem, type CapstoneChoice } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { newId, now } from '@/bootcamps/main-conclusion/lib/ids';
import {
  HARD_SENTENCES_HUB_ROUTE,
  entryById,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';

export function HardSentencesCapstone() {
  const user = useUser();
  const { markCapstoneComplete } = useModuleProgress(user?.id);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const item = M5_CAPSTONE[index]!;
  const isLast = index >= M5_CAPSTONE.length - 1;

  async function record(choice: CapstoneChoice) {
    setPicks((p) => ({ ...p, [item.id]: choice.letter }));
    if (!user) return;
    const persist = getPersistence(user.id);
    const attemptId = newId();
    await persist.set(TABLES.calibration_attempts, attemptId, {
      id: attemptId,
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
      void markCapstoneComplete('M5.8');
      setCompleted(true);
      window.scrollTo(0, 0);
      return;
    }
    setIndex(index + 1);
    window.scrollTo(0, 0);
  }

  if (completed) {
    const total = M5_CAPSTONE.length;
    const correctCount = M5_CAPSTONE.filter(
      (q) => q.choices.find((c) => c.letter === picks[q.id])?.is_correct,
    ).length;
    return (
      <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)] font-sans">
        <main className="mx-auto w-full max-w-[860px] px-6 py-10 md:px-10 md:py-14">
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-8"
          >
            <div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
                Hard Sentences · Capstone complete
              </p>
              <h1 className="font-serif text-[clamp(44px,6vw,72px)] italic font-medium leading-[0.95] tracking-[-0.04em] text-[oklch(0.15_0.01_60)]">
                {correctCount} of {total} clean.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[20px] leading-[1.5] text-[oklch(0.2_0.01_60/0.74)]">
                {correctCount === total
                  ? 'Every core named, every trap dodged. This module is yours.'
                  : 'Results are logged to your diagnostics. Each miss below links back to the idea it leans on.'}
              </p>
            </div>

            <ul className="space-y-3">
              {M5_CAPSTONE.map((q, i) => {
                const picked = q.choices.find((c) => c.letter === picks[q.id]);
                const ok = picked?.is_correct ?? false;
                const trap = picked && !ok ? picked.trap_label : undefined;
                const loadBearingMiss = trap?.includes('T4');
                return (
                  <li
                    key={q.id}
                    data-capstone-item-id={q.id}
                    className="flex items-start gap-4 rounded-[12px] border border-[rgba(26,26,26,0.10)] bg-white p-5"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                        ok
                          ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
                          : 'border-amber-600/30 bg-amber-50 text-amber-800',
                      )}
                    >
                      {ok ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <XIcon className="h-4 w-4" strokeWidth={2.4} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-[rgba(26,26,26,0.55)]">
                          Question {i + 1} · picked {picked?.letter ?? 'nothing'}
                        </span>
                        {trap ? (
                          <span className="rounded-full border border-amber-600/30 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                            {trap}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 font-serif text-[16px] italic leading-relaxed text-[#1a1a1a]">
                        {q.choices.find((c) => c.is_correct)?.text}
                      </p>
                      {!ok && picked ? (
                        <p className="mt-1 text-[14px] leading-relaxed text-[rgba(26,26,26,0.55)]">
                          {picked.rationale}{' '}
                          <Link
                            to={entryById(loadBearingMiss ? '5.5' : '5.3')?.route ?? HARD_SENTENCES_HUB_ROUTE}
                            className="underline underline-offset-2 hover:text-[#1a1a1a]"
                          >
                            Revisit {loadBearingMiss ? 'Optional vs Core' : 'The Six Specifiers'}
                          </Link>
                          .
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="rounded-[8px] border border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] p-6 text-[#F5F2ED] md:p-8">
              <p className="text-[20px] leading-[1.7]">
                Hard sentences are built from ordinary claims and removable layers. You now know the
                layers by name. Whenever a sentence pushes back, go back to the move: verb first,
                subject to its left, lift the rest.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={HARD_SENTENCES_HUB_ROUTE}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black"
              >
                Back to the hub
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setPicks({});
                  setCompleted(false);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a]"
              >
                Retake
              </button>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)] font-sans">
      <main className="mx-auto w-full max-w-[860px] px-6 py-10 md:px-10 md:py-14">
        <section className="space-y-6">
          <div>
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
              Hard Sentences · Capstone
            </p>
            <h1 className="font-serif text-[clamp(40px,5.5vw,64px)] italic font-medium leading-[0.95] tracking-[-0.04em] text-[oklch(0.15_0.01_60)]">
              The capstone.
            </h1>
            <p className="mt-5 max-w-[34rem] text-[18px] leading-[1.5] text-[oklch(0.2_0.01_60/0.74)]">
              Five exam-style questions. Strip the specifiers, keep what is load-bearing, pick the
              core.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[rgba(26,26,26,0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
              cluster decomposition
            </span>
            <p className="text-[13px] font-medium text-[rgba(26,26,26,0.55)]">
              Question {index + 1} of {M5_CAPSTONE.length}
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(26,26,26,0.08)]">
            <div
              className="h-full rounded-full bg-[#C5A059] transition-all duration-300 ease-eased"
              style={{ width: `${((index + (picks[item.id] ? 1 : 0)) * 100) / M5_CAPSTONE.length}%` }}
            />
          </div>

          <CapstoneQuestionCard
            key={item.id}
            item={item}
            pickedLetter={picks[item.id] ?? null}
            onPick={record}
            onNext={next}
            isLast={isLast}
          />
        </section>
      </main>
    </div>
  );
}

function CapstoneQuestionCard({
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
    <div className="rounded-[16px] border border-[rgba(26,26,26,0.12)] bg-white p-6 md:p-8" data-capstone-item-id={item.id}>
      <p className="font-serif text-[20px] italic leading-[1.7] text-[#1a1a1a]">{item.stimulus}</p>
      <p className="mt-4 text-[16px] font-medium text-[rgba(26,26,26,0.65)]">{item.prompt}</p>

      {!submitted ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)] focus-visible:ring-offset-2"
        >
          Open question
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <div className="mt-6 space-y-4">
          <div
            className={cn(
              'flex items-center gap-3 rounded-[8px] border p-4',
              pickedChoice?.is_correct
                ? 'border-emerald-600/25 bg-emerald-50 text-emerald-800'
                : 'border-amber-600/25 bg-amber-50 text-amber-900',
            )}
          >
            {pickedChoice?.is_correct ? (
              <Check className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            ) : (
              <XIcon className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            )}
            <p className="text-[15px] font-medium">
              You picked {pickedLetter}.{' '}
              {pickedChoice?.is_correct
                ? 'That is the core.'
                : `The core was ${correctLetter}. The explanations walk through every choice.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a]"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.2} />
              Review explanations
            </button>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black"
            >
              {isLast ? 'Finish' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
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
    </div>
  );
}
