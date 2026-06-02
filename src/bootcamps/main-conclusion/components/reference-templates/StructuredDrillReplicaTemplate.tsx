import { useMemo, useState } from 'react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { ReplicaShell, RoleKey, StimulusLine } from './shared';

type StructureChoice = 'first-sentence' | 'rebuttal' | null;

export function StructuredDrillReplicaTemplate({
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

  const step = submitted ? 4 : selectedConclusion == null ? 1 : selectedType == null ? 2 : 3;
  const followUpPrompt = selectedType === 'rebuttal' ? 'Select the opposing viewpoint.' : 'Select a supporting claim.';

  const reveal = useMemo(
    () =>
      current.chunks.map((chunk, chunkIndex) => ({
        chunk,
        accent: (chunkIndex === current.correctMainConclusionIndex
          ? 'conclusion'
          : current.opposingViewIndexes.includes(chunkIndex)
            ? 'opposing'
            : current.supportIndexes.includes(chunkIndex)
              ? 'support'
              : 'neutral') as 'conclusion' | 'opposing' | 'support' | 'neutral',
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
    <ReplicaShell
      eyebrow="Intro to LR"
      title={title}
      description="Use the full stimulus as your workspace: lock the main conclusion, classify the structure, then identify the next structural role."
    >
      <div className="grid gap-6 xl:grid-cols-[1.4fr_360px]">
        <Card variant="elev" className="space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                Question {index + 1} of {questions.length}
              </p>
              <p className="mt-1 font-mc-serif text-xl text-ink">Work the whole argument.</p>
            </div>
            {submitted ? <RoleKey /> : null}
          </div>

          <div className="space-y-3">
            {(submitted ? reveal : current.chunks.map((chunk) => ({ chunk, accent: 'ink' as const }))).map(
              ({ chunk, accent }, chunkIndex) => (
                <StimulusLine
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
        </Card>

        <Card variant="surface" className="space-y-5 p-6">
          <div>
            <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Step {step}</p>
            <h2 className="mt-2 font-mc-serif text-[26px] italic text-ink">
              {step === 1
                ? 'Select the main conclusion.'
                : step === 2
                  ? 'Classify the structure.'
                  : step === 3
                    ? followUpPrompt
                    : isCorrect
                      ? 'Perfect dissection.'
                      : 'Review the role map.'}
            </h2>
          </div>

          {step === 2 ? (
            <div className="grid gap-3">
              {(['first-sentence', 'rebuttal'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSelectedType(choice)}
                  className={
                    selectedType === choice
                      ? 'rounded-[18px] border border-mc-accent bg-mc-accent/10 px-4 py-3 text-left font-semibold text-ink'
                      : 'rounded-[18px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-3 text-left font-semibold text-ink hover:border-[rgba(26,26,26,0.16)]'
                  }
                >
                  {choice === 'first-sentence' ? 'First-sentence conclusion' : 'Rebuttal / pivot conclusion'}
                </button>
              ))}
            </div>
          ) : null}

          {submitted ? (
            <>
              <div
                className={
                  isCorrect
                    ? 'rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950'
                    : 'rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950'
                }
              >
                {current.revealExplanation}
              </div>
              <Button onClick={nextQuestion}>{isLast ? 'Finish Lab' : 'Next Question'}</Button>
            </>
          ) : (
            <Button
              onClick={step === 3 ? submit : undefined}
              disabled={(step === 1 && selectedConclusion == null) || (step === 2 && selectedType == null) || (step === 3 && selectedFollowUp == null)}
            >
              {step === 3 ? 'Submit' : 'Use the workspace to continue'}
            </Button>
          )}

          {!submitted ? (
            <p className="text-[15px] leading-[1.6] text-ink-soft">
              {step === 1
                ? 'Start by finding the claim the rest of the argument is trying to prove.'
                : step === 2
                  ? 'Is the conclusion stated up front, or does the author pivot into it after another view?'
                  : 'Choose the next structural role that proves your read.'}
            </p>
          ) : null}
        </Card>
      </div>
    </ReplicaShell>
  );
}
