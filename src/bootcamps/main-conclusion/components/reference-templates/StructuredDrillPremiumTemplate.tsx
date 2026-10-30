import { useMemo, useState } from 'react';

import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { RoleKey, StimulusInlineSegment } from './shared';

type StructureChoice = 'first-sentence' | 'rebuttal' | null;

function formatProgressLabel(completed: number, total: number) {
  return `${completed} of ${total} questions`;
}

export function StructuredDrillPremiumTemplate({
  title,
  questions,
  onComplete,
}: {
  title: string;
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedConclusion, setSelectedConclusion] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<StructureChoice>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const current = questions[index]!;
  const isLast = index === questions.length - 1;
  const completedCount = index + (submitted ? 1 : 0);
  const progressPercent = Math.round((completedCount / questions.length) * 100);
  const step = submitted ? 4 : selectedConclusion == null ? 1 : selectedType == null ? 2 : 3;
  const followUpPrompt = selectedType === 'rebuttal' ? 'Select the opposing viewpoint.' : 'Select a supporting claim.';
  const headerTitle = title === 'Argument Structure Lab' ? 'Argument Dissection' : title;

  const reveal = useMemo(
    () =>
      current.chunks.map((chunk, chunkIndex) => ({
        chunk,
        accent: (
          chunkIndex === current.correctMainConclusionIndex
            ? 'conclusion'
            : current.opposingViewIndexes.includes(chunkIndex)
              ? 'opposing'
              : current.supportIndexes.includes(chunkIndex)
                ? 'support'
                : 'neutral'
        ) as 'conclusion' | 'opposing' | 'support' | 'neutral',
      })),
    [current],
  );

  function submit() {
    const expectedType = current.structureType === 'rebuttal' ? 'rebuttal' : 'first-sentence';
    const followUpTarget =
      expectedType === 'rebuttal' ? current.opposingViewIndexes : current.supportIndexes;
    const result =
      selectedConclusion === current.correctMainConclusionIndex &&
      selectedType === expectedType &&
      selectedFollowUp != null &&
      followUpTarget.includes(selectedFollowUp);
    setIsCorrect(result);
    setSubmitted(true);
  }

  function nextQuestion() {
    if (isLast) {
      onComplete?.();
      return;
    }
    setIndex((value) => value + 1);
    setSelectedConclusion(null);
    setSelectedType(null);
    setSelectedFollowUp(null);
    setSubmitted(false);
    setIsCorrect(null);
  }

  return (
    <section className="mx-auto max-w-[1380px] space-y-8 pb-12">
      <header className="space-y-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,248,252,0.92))] px-8 py-10 shadow-[0_24px_70px_rgba(15,23,42,0.07)] ring-1 ring-[rgba(26,26,26,0.05)] md:px-10">
        <div className="inline-flex rounded-full bg-[rgba(24,119,242,0.10)] px-7 py-3 font-mc-mono text-[14px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
          Application
        </div>
        <h1 className="font-sans text-[clamp(2.6rem,5vw,4.25rem)] font-semibold tracking-[-0.05em] text-[#1f2027]">
          {headerTitle}
        </h1>

        <div className="rounded-[30px] bg-white px-8 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-[rgba(26,26,26,0.04)]">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.06em] text-[#1a73e8]">
              {progressPercent}%
            </span>
            <span className="font-mc-mono text-[20px] font-semibold uppercase tracking-[0.18em] text-[#2f7ae5]">
              Complete
            </span>
          </div>
          <div className="mt-6 h-4 rounded-full bg-[#e5e7ec]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#1a73e8,#60a5fa)] transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-5 font-mc-mono text-[18px] uppercase tracking-[0.16em] text-[#9ca3af]">
            {formatProgressLabel(completedCount, questions.length)}
          </p>
        </div>
      </header>

      <div className="space-y-8 rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,248,252,0.92))] px-8 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.07)] ring-1 ring-[rgba(26,26,26,0.05)] md:px-10">
        <section className="rounded-[30px] bg-white px-10 py-10 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-[rgba(26,26,26,0.04)]">
          <div className="text-[clamp(2rem,3vw,3rem)] font-medium leading-[1.9] tracking-[-0.03em] text-[#1f2027]">
            {(submitted ? reveal : current.chunks.map((chunk) => ({ chunk, accent: 'ink' as const }))).map(
              ({ chunk, accent }, chunkIndex) => (
                <StimulusInlineSegment
                  key={`${current.id}-${chunkIndex}`}
                  html={chunk}
                  selected={
                    chunkIndex === selectedConclusion ||
                    chunkIndex === selectedFollowUp ||
                    submitted
                  }
                  accent={
                    submitted
                      ? accent
                      : chunkIndex === selectedConclusion
                        ? 'conclusion'
                        : chunkIndex === selectedFollowUp
                          ? selectedType === 'rebuttal'
                            ? 'opposing'
                            : 'support'
                          : 'ink'
                  }
                  onClick={
                    submitted
                      ? undefined
                      : () => {
                          if (step === 1) setSelectedConclusion(chunkIndex);
                          if (step === 3 && chunkIndex !== selectedConclusion) setSelectedFollowUp(chunkIndex);
                        }
                  }
                />
              ),
            )}
          </div>
        </section>

        <section className="rounded-[30px] bg-white px-8 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-[rgba(26,26,26,0.04)]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1f2027] text-[28px] font-semibold text-white">
              {step}
            </div>
            <div>
              <p className="font-mc-mono text-[11px] uppercase tracking-[0.18em] text-[#9ca3af]">
                Question {index + 1} of {questions.length}
              </p>
              <h2 className="mt-1 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1f2027]">
                {step === 1
                  ? 'Select the Main Conclusion in the text above.'
                  : step === 2
                    ? 'Classify the structure.'
                    : step === 3
                      ? followUpPrompt
                      : isCorrect
                        ? 'Perfect dissection.'
                        : 'Review the role map.'}
              </h2>
            </div>
          </div>

          {!submitted ? (
            <p className="mt-5 max-w-4xl text-[18px] leading-[1.7] text-[#5f6672]">
              {step === 1
                ? 'Choose the sentence the author is trying to prove.'
                : step === 2
                  ? 'Decide whether the conclusion comes first or the author pivots into it after another view.'
                  : 'Choose the sentence that best confirms your structural read.'}
            </p>
          ) : null}

          {step === 2 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {(['first-sentence', 'rebuttal'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSelectedType(choice)}
                  className={cn(
                    'rounded-[22px] border px-5 py-4 text-left text-[18px] font-semibold transition-colors',
                    selectedType === choice
                      ? 'border-[#1a73e8] bg-[#eef5ff] text-[#1f2027]'
                      : 'border-[rgba(26,26,26,0.08)] bg-[#fbfbfc] text-[#1f2027] hover:border-[rgba(26,26,26,0.16)]',
                  )}
                >
                  {choice === 'first-sentence' ? 'First-sentence conclusion' : 'Rebuttal / pivot conclusion'}
                </button>
              ))}
            </div>
          ) : null}

          {submitted ? (
            <div className="mt-6 space-y-5">
              <div
                className={cn(
                  'rounded-[22px] border px-5 py-4 text-[17px] leading-[1.7]',
                  isCorrect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-amber-200 bg-amber-50 text-amber-950',
                )}
              >
                {current.revealExplanation}
              </div>
              <RoleKey />
              <button
                type="button"
                onClick={nextQuestion}
                className="inline-flex items-center rounded-[18px] bg-[#1f2027] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#111318]"
              >
                {isLast ? 'Finish Lab' : 'Next Question'}
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={step === 3 ? submit : undefined}
                disabled={
                  (step === 1 && selectedConclusion == null) ||
                  (step === 2 && selectedType == null) ||
                  (step === 3 && selectedFollowUp == null)
                }
                className={cn(
                  'inline-flex items-center rounded-[18px] px-6 py-3 text-[16px] font-semibold transition-colors',
                  (step === 1 && selectedConclusion == null) ||
                    (step === 2 && selectedType == null) ||
                    (step === 3 && selectedFollowUp == null)
                    ? 'cursor-not-allowed bg-[#d7dbe2] text-[#8d93a1]'
                    : 'bg-[#1f2027] text-white hover:bg-[#111318]',
                )}
              >
                {step === 3 ? 'Submit' : 'Use the workspace to continue'}
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
