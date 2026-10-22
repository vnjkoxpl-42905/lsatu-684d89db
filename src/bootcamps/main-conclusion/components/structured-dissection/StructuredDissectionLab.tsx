import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Home, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { StructuredStartCard } from './StructuredStartCard';
import { StructuredProgressHeader } from './StructuredProgressHeader';
import { StructuredStimulusWorkspace } from './StructuredStimulusWorkspace';
import { StructuredStepControls } from './StructuredStepControls';
import { StructuredRevealPanel } from './StructuredRevealPanel';
import { getSimulatorDrills } from './structuredSimulatorAdapter';
import type { InteractiveDrillItem, StimulusPart } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export function StructuredDissectionLab() {
  const navigate = useNavigate();
  const drills = useMemo(() => getSimulatorDrills(), []);
  
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  
  // Active question state
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<'First-sentence' | 'Rebuttal' | null>(null);
  const [secondaryPartId, setSecondaryPartId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentDrill = drills[currentIndex];
  const step = revealed ? 4 : (selectedPartId ? (selectedFamily ? 3 : 2) : 1);

  const handleStart = () => setStarted(true);

  const handleSelectPart = (part: StimulusPart) => {
    if (revealed) return;

    if (step === 1) {
      setSelectedPartId(part.id);
    } else if (step === 3 && part.id !== selectedPartId) {
      setSecondaryPartId(part.id);
    }
  };

  const handleSubmit = () => {
    const payload = currentDrill.payload as any;
    const correctFamily = selectedFamily === payload.family;
    
    const followUpIds = selectedFamily === 'Rebuttal' 
      ? currentDrill.correctOpposingPartIds ?? [] 
      : currentDrill.correctSupportPartIds ?? [];
    
    const correctFollowUp = !!secondaryPartId && followUpIds.includes(secondaryPartId);
    
    const correct = selectedPartId === currentDrill.correctConclusionPartId && 
                    correctFamily && 
                    correctFollowUp;

    setIsCorrect(correct);
    setResults(prev => [...prev, correct]);
    setRevealed(true);
  };

  const handleNext = () => {
    if (currentIndex < drills.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset state for next question
      setSelectedPartId(null);
      setSelectedFamily(null);
      setSecondaryPartId(null);
      setRevealed(false);
      setIsCorrect(null);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults([]);
    setSelectedPartId(null);
    setSelectedFamily(null);
    setSecondaryPartId(null);
    setRevealed(false);
    setIsCorrect(null);
    setFinished(false);
    setStarted(true);
  };

  if (!started) {
    return (
      <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-4xl mx-auto">
        <StructuredStartCard onStart={handleStart} totalQuestions={drills.length} />
      </article>
    );
  }

  if (finished) {
    const correctCount = results.filter(Boolean).length;
    return (
      <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-400 ease-out">
        <PageHeader 
          eyebrow="Simulator Complete" 
          title="Canonical 20 finished" 
          description="You've completed the full dissection of the Simulator Bank."
        />
        
        <Card variant="elev" className="p-8 text-center space-y-6 border border-[rgb(var(--success)/0.20)] bg-[rgb(var(--success)/0.02)]">
          <div className="flex justify-center">
            <div className="rounded-full bg-[rgb(var(--success)/0.10)] p-3 text-success">
              <CheckCircle2 className="h-12 w-12" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-mc-mono text-mono text-ink-faint uppercase tracking-widest text-sm">Final Score</p>
            <div className="font-mc-serif text-6xl font-bold text-ink">
              {correctCount}<span className="text-ink-faint">/</span>{drills.length}
            </div>
            <p className="font-mc-serif text-body-prose text-ink-soft">
              {correctCount === drills.length 
                ? "Perfect dissection! You've mastered the canonical structure set." 
                : "Great work. Review any misses to solidify your structural reads."}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              variant="subtle" 
              onClick={handleRestart}
              leftIcon={<RefreshCcw className="h-4 w-4" />}
            >
              Restart Drill
            </Button>
            <Button 
              onClick={() => navigate('/bootcamp/intro-to-lr/simulator')}
              leftIcon={<Home className="h-4 w-4" />}
            >
              Back to Simulator
            </Button>
          </div>
        </Card>
      </article>
    );
  }

  const selectedIds = [selectedPartId, secondaryPartId].filter(Boolean) as string[];

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-4xl mx-auto space-y-8">
      <StructuredProgressHeader 
        currentIndex={currentIndex} 
        totalQuestions={drills.length} 
        title={currentDrill.title}
      />

      <div className="grid gap-8 desktop:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <StructuredStimulusWorkspace 
            parts={currentDrill.parts!}
            selectedIds={selectedIds}
            onSelect={handleSelectPart}
            revealed={revealed}
            disabled={revealed}
          />

          {revealed && (
            <StructuredRevealPanel 
              revealMap={currentDrill.revealMap!}
              explanation={(currentDrill.payload as any).rationale}
              structureMap={(currentDrill.payload as any).structure_map}
              onNext={handleNext}
              isLast={currentIndex === drills.length - 1}
            />
          )}
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

          {revealed && (
            <div className={cn(
              "rounded-4 p-4 border animate-in fade-in duration-300",
              isCorrect 
                ? "bg-[rgb(var(--success)/0.05)] border-[rgb(var(--success)/0.20)] text-success" 
                : "bg-[rgb(var(--error)/0.05)] border-[rgb(var(--error)/0.20)] text-error"
            )}>
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
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
