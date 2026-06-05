import { useState } from 'react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { ReplicaShell, RoleKey, StimulusLine } from './shared';

interface StageSet {
  id: string;
  title: string;
  description: string;
  questions: CanonicalStructureQuestion[];
}

export function RebuttalVsFirstReplicaTemplate({
  title,
  stages,
  onComplete,
}: {
  title: string;
  stages: StageSet[];
  onComplete?: () => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<'first-sentence' | 'rebuttal' | null>(null);
  const [answered, setAnswered] = useState(false);
  const stage = stages[stageIndex]!;
  const question = stage.questions[questionIndex]!;
  const expected = question.structureType === 'rebuttal' ? 'rebuttal' : 'first-sentence';

  function next() {
    const nextQuestion = questionIndex + 1;
    if (nextQuestion < stage.questions.length) {
      setQuestionIndex(nextQuestion);
      setSelectedType(null);
      setAnswered(false);
      return;
    }
    const nextStage = stageIndex + 1;
    if (nextStage < stages.length) {
      setStageIndex(nextStage);
      setQuestionIndex(0);
      setSelectedType(null);
      setAnswered(false);
      return;
    }
    onComplete?.();
  }

  return (
    <ReplicaShell
      eyebrow="Intro to LR"
      title={title}
      description="Make the read quickly: is the author’s conclusion stated first, or does the author pivot into a rebuttal?"
      tone="inverted"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          {stages.map((item, itemIndex) => (
            <Card
              key={item.id}
              variant={itemIndex === stageIndex ? 'elev' : 'surface'}
              className={itemIndex === stageIndex ? 'border-mc-accent p-4' : 'p-4'}
            >
              <p className="font-mc-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">{item.title}</p>
              <p className="mt-2 text-[15px] leading-[1.55] text-ink-soft">{item.description}</p>
            </Card>
          ))}
        </div>

        <Card variant="elev" className="space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                {stage.title} · Question {questionIndex + 1} of {stage.questions.length}
              </p>
              <p className="mt-1 font-mc-serif text-xl text-ink">Call the structure before you overthink it.</p>
            </div>
            {answered ? <RoleKey /> : null}
          </div>

          <div className="space-y-3">
            {question.chunks.map((chunk, chunkIndex) => (
              <StimulusLine
                key={`${question.id}-${chunkIndex}`}
                html={chunk}
                selected={answered}
                accent={
                  answered
                    ? chunkIndex === question.correctMainConclusionIndex
                      ? 'conclusion'
                      : question.opposingViewIndexes.includes(chunkIndex)
                        ? 'opposing'
                        : question.supportIndexes.includes(chunkIndex)
                          ? 'support'
                          : 'neutral'
                    : 'ink'
                }
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(['first-sentence', 'rebuttal'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={answered}
                onClick={() => {
                  setSelectedType(choice);
                  setAnswered(true);
                }}
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

          {answered ? (
            <div className="space-y-4">
              <div
                className={
                  selectedType === expected
                    ? 'rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950'
                    : 'rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950'
                }
              >
                <p className="font-semibold">
                  {selectedType === expected ? 'Correct.' : 'Not quite.'}{' '}
                  {question.revealExplanation}
                </p>
              </div>
              <Button onClick={next}>
                {stageIndex === stages.length - 1 && questionIndex === stage.questions.length - 1 ? 'Finish Lab' : 'Next Question'}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </ReplicaShell>
  );
}
