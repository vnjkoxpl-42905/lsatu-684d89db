import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { StructuredStartCard } from './StructuredStartCard';
import { StructuredStimulusWorkspace } from './StructuredStimulusWorkspace';
import { StructuredStepControls } from './StructuredStepControls';
import { StructuredRevealPanel } from './StructuredRevealPanel';
import type { InteractiveDrillItem, RunnerState, StimulusPart } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface SelectionSnapshot {
  selectedPartId: string | null;
  selectedFamily: 'First-sentence' | 'Rebuttal' | null;
  secondaryPartId: string | null;
}

interface Props {
  item: InteractiveDrillItem;
  state: RunnerState;
  onAnswer: (correct: boolean, selectedAnswer?: string) => void;
  totalQuestions: number;
  started: boolean;
  onStart: () => void;
}

function parseSnapshot(selectedAnswer?: string | null): SelectionSnapshot | null {
  if (!selectedAnswer) return null;
  try {
    const parsed = JSON.parse(selectedAnswer) as SelectionSnapshot;
    return {
      selectedPartId: parsed.selectedPartId ?? null,
      selectedFamily: parsed.selectedFamily ?? null,
      secondaryPartId: parsed.secondaryPartId ?? null,
    };
  } catch {
    return null;
  }
}

export function StructuredStageQuestion({ item, state, onAnswer, totalQuestions, started, onStart }: Props) {
  const answered = state.answered;
  const saved = useMemo(() => parseSnapshot(state.selectedAnswer), [state.selectedAnswer]);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(saved?.selectedPartId ?? null);
  const [selectedFamily, setSelectedFamily] = useState<'First-sentence' | 'Rebuttal' | null>(saved?.selectedFamily ?? null);
  const [secondaryPartId, setSecondaryPartId] = useState<string | null>(saved?.secondaryPartId ?? null);
  const [revealed, setRevealed] = useState(answered);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(state.correct);

  useEffect(() => {
    setSelectedPartId(saved?.selectedPartId ?? null);
    setSelectedFamily(saved?.selectedFamily ?? null);
    setSecondaryPartId(saved?.secondaryPartId ?? null);
    setRevealed(answered);
    setIsCorrect(state.correct);
  }, [saved, answered, state.correct, item.id]);

  if (!started) {
    return (
      <StructuredStartCard
        onStart={onStart}
        totalQuestions={totalQuestions}
        title="Canonical 3.4 Dissection"
        description="Run the final drill gate in the same structured flow as the Simulator Bank: conclusion, family, support or opposing view, then reveal."
        eyebrow="Stage 4 Flow"
        buttonLabel="Begin Canonical Stage"
      />
    );
  }

  const step = revealed ? 4 : selectedPartId ? (selectedFamily ? 3 : 2) : 1;
  const selectedIds = [selectedPartId, secondaryPartId].filter(Boolean) as string[];

  const handleSelectPart = (part: StimulusPart) => {
    if (revealed || answered) return;
    if (step === 1) {
      setSelectedPartId(part.id);
      if (secondaryPartId) setSecondaryPartId(null);
      return;
    }
    if (step === 3 && part.id !== selectedPartId) {
      setSecondaryPartId(part.id);
    }
  };

  const handleSubmit = () => {
    const payload = item.payload as { family?: 'First-sentence' | 'Rebuttal' };
    const followUpIds =
      selectedFamily === 'Rebuttal' ? item.correctOpposingPartIds ?? [] : item.correctSupportPartIds ?? [];
    const correct =
      selectedPartId === item.correctConclusionPartId &&
      selectedFamily === payload.family &&
      !!secondaryPartId &&
      followUpIds.includes(secondaryPartId);

    const snapshot = JSON.stringify({
      selectedPartId,
      selectedFamily,
      secondaryPartId,
    } satisfies SelectionSnapshot);

    setIsCorrect(correct);
    setRevealed(true);
    onAnswer(correct, snapshot);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-8 desktop:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <StructuredStimulusWorkspace
            parts={item.parts ?? []}
            selectedIds={selectedIds}
            onSelect={handleSelectPart}
            revealed={revealed}
            disabled={revealed || answered}
          />

          {revealed && item.revealMap ? (
            <StructuredRevealPanel
              revealMap={item.revealMap}
              explanation={(item.payload as { rationale?: string }).rationale ?? ''}
              structureMap={(item.payload as { family?: string }).family}
            />
          ) : null}
        </div>

        <aside className="space-y-6">
          <StructuredStepControls
            step={step}
            selectedFamily={selectedFamily}
            onFamilyChange={setSelectedFamily}
            canSubmit={!!(selectedPartId && selectedFamily && secondaryPartId)}
            onSubmit={handleSubmit}
            isCorrect={isCorrect}
          />

          {revealed ? (
            <Card
              variant="ghost"
              className={cn(
                'rounded-4 p-4 border animate-in fade-in duration-300',
                isCorrect
                  ? 'bg-[rgb(var(--success)/0.05)] border-[rgb(var(--success)/0.20)] text-success'
                  : 'bg-[rgb(var(--error)/0.05)] border-[rgb(var(--error)/0.20)] text-error',
              )}
            >
              <div className="flex items-center gap-2 font-mc-serif font-semibold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Perfect dissection</span>
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4" />
                    <span>Review required</span>
                  </>
                )}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
