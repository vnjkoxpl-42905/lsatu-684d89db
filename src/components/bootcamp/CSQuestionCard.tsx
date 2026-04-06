import React, { useState, useEffect, useRef } from 'react';
import { Question } from '@/types/causationStation';

interface CSQuestionCardProps {
  question: Question;
  onAnswer: (data: { choiceIndex?: number; thirdFactor?: string; reverseCausation?: string; causeWithoutEffect?: string; effectWithoutCause?: string }) => void;
  selectedAnswer: number | null;
  isRevealed: boolean;
  timeElapsed?: number;
  highlights: { start: number; end: number }[];
  onHighlightsChange: (questionId: string, newHighlights: { start: number; end: number }[]) => void;
}

const CSQuestionCard: React.FC<CSQuestionCardProps> = ({
  question,
  onAnswer,
  selectedAnswer,
  isRevealed,
  highlights,
  onHighlightsChange,
}) => {
  const [thirdFactor, setThirdFactor] = useState('');
  const [reverseCausation, setReverseCausation] = useState('');
  const [causeWithoutEffect, setCauseWithoutEffect] = useState('');
  const [effectWithoutCause, setEffectWithoutCause] = useState('');
  const [isHighlighterActive, setIsHighlighterActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const stimulusRef = useRef<HTMLParagraphElement>(null);

  const isModule1 = question.moduleId === 'correlation-causation';
  const isModule2 = question.moduleId === 'common-causes';
  const isModule3 = question.moduleId === 'reverse-causality';
  const isModule4 = question.moduleId === 'strengthen-weaken';

  useEffect(() => {
    setThirdFactor('');
    setReverseCausation('');
    setCauseWithoutEffect('');
    setEffectWithoutCause('');
    setIsHighlighterActive(false);
    setIsEraserActive(false);
  }, [question.id]);

  const toggleHighlighter = () => {
    setIsHighlighterActive(prev => !prev);
    if (!isHighlighterActive) setIsEraserActive(false);
  };

  const toggleEraser = () => {
    setIsEraserActive(prev => !prev);
    if (!isEraserActive) setIsHighlighterActive(false);
  };

  const handleRemoveHighlight = (start: number, end: number) => {
    if (isEraserActive) {
      const newHighlights = highlights.filter(h => h.start !== start || h.end !== end);
      onHighlightsChange(question.id, newHighlights);
    }
  };

  const getHighlightedText = (text: string, currentHighlights: { start: number; end: number }[]) => {
    if (!currentHighlights || currentHighlights.length === 0) {
      return <>{text}</>;
    }

    const sortedHighlights = [...currentHighlights].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, i) => {
      if (highlight.start > lastIndex) {
        parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, highlight.start)}</span>);
      }
      parts.push(
        <mark
          key={`${highlight.start}-${highlight.end}`}
          style={{ backgroundColor: 'rgba(251,191,36,0.3)', cursor: 'inherit' }}
          onClick={() => handleRemoveHighlight(highlight.start, highlight.end)}
        >
          {text.substring(highlight.start, highlight.end)}
        </mark>
      );
      lastIndex = highlight.end;
    });

    if (lastIndex < text.length) {
      parts.push(<span key="last-text">{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  const handleMouseUp = () => {
    if (!isHighlighterActive || !stimulusRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const stimulusNode = stimulusRef.current;

    if (!stimulusNode.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      return;
    }

    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(stimulusNode);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;

    if (start === end) return;

    const newHighlight = { start, end };

    let newHighlights = [...highlights];
    newHighlights = newHighlights.filter(h => !(h.start >= start && h.end <= end));

    let merged = false;
    newHighlights = newHighlights.map(h => {
      if (start >= h.start && end <= h.end) {
        merged = true;
        return h;
      }
      if (Math.max(start, h.start) < Math.min(end, h.end)) {
        merged = true;
        return { start: Math.min(start, h.start), end: Math.max(end, h.end) };
      }
      return h;
    });

    if (!merged) {
      newHighlights.push(newHighlight);
    }

    newHighlights.sort((a, b) => a.start - b.start);
    const finalHighlights: { start: number; end: number }[] = [];
    if (newHighlights.length > 0) {
      let current = newHighlights[0];
      for (let i = 1; i < newHighlights.length; i++) {
        const next = newHighlights[i];
        if (next.start < current.end) {
          current.end = Math.max(current.end, next.end);
        } else {
          finalHighlights.push(current);
          current = next;
        }
      }
      finalHighlights.push(current);
    }

    onHighlightsChange(question.id, finalHighlights);
    selection.removeAllRanges();
  };

  const handleSubmitModule2 = () => {
    onAnswer({ thirdFactor, reverseCausation });
  };

  const handleSubmitModule3 = () => {
    onAnswer({ causeWithoutEffect, effectWithoutCause });
  };

  const getChoiceClassName = (index: number): string => {
    if (!isRevealed) {
      if (selectedAnswer === index) {
        return 'bg-sky-500/10 border-sky-500';
      }
      return 'border-border hover:bg-accent hover:border-foreground/30';
    }
    if (index === question.correctIndex) {
      return 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400';
    }
    if (index === selectedAnswer && index !== question.correctIndex) {
      return 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400';
    }
    return 'border-border opacity-40';
  };

  const stimulusText = question.stimulus || (isModule1 || isModule2 || isModule3 ? question.stem : '');
  const questionText = question.question || (isModule1 ? '' : 'Select the best answer.');

  const formatSourcePt = (source: string | undefined): string => {
    if (!source) return '';
    return source
      .replace('PT ', 'Practice Test ')
      .replace(' | Sec ', ', S')
      .replace(' | Q ', ', Q');
  };

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm p-6">
      {isModule4 && (
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <span className="text-sm italic text-muted-foreground">
            {formatSourcePt(question.sourcePT)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleHighlighter}
              aria-pressed={isHighlighterActive}
              className={`p-2 rounded-md transition-colors ${
                isHighlighterActive
                  ? 'bg-amber-400/20 text-amber-500'
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={isHighlighterActive ? 'Deactivate Highlighter' : 'Activate Highlighter'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.998 19.362l2.54-2.54c.78-.78.78-2.05 0-2.83l-2.07-2.07c-.78-.78-2.05-.78-2.83 0l-2.54 2.54" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M14.172 11.293l-8.59 8.59c-.56.56-1.31.87-2.12.87-.2 0-.39-.02-.59-.06l-1.42-.28c-.59-.12-1.04-.64-1.04-1.25l.28-1.42c.04-.2.06-.39.06-.59 0-.81.31-1.56.87-2.12l8.59-8.59" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M22 2L12 12" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
            <button
              onClick={toggleEraser}
              disabled={highlights.length === 0 && !isEraserActive}
              aria-pressed={isEraserActive}
              className={`p-2 rounded-md transition-colors ${
                isEraserActive
                  ? 'bg-red-400/20 text-red-500'
                  : highlights.length === 0
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={isEraserActive ? 'Deactivate Eraser' : 'Activate Eraser'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.34 3.41L3.41 8.34C2.63 9.12 2.63 10.38 3.41 11.16L12.84 20.59C13.62 21.37 14.88 21.37 15.66 20.59L20.59 15.66C21.37 14.88 21.37 13.62 20.59 12.84L11.16 3.41C10.38 2.63 9.12 2.63 8.34 3.41Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 5L19 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 21H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {stimulusText && (
        <p
          ref={stimulusRef}
          onMouseUp={handleMouseUp}
          className={`text-sm leading-relaxed text-foreground mb-4 ${isHighlighterActive ? 'cursor-text' : ''}`}
        >
          {getHighlightedText(stimulusText, highlights)}
        </p>
      )}
      {questionText && (
        <p className="text-sm font-semibold text-foreground">
          {questionText}
        </p>
      )}

      <div className="my-6 space-y-3">
        {(isModule1 || isModule4) && question.choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => onAnswer({ choiceIndex: index })}
            disabled={isRevealed}
            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-start ${getChoiceClassName(index)}`}
          >
            <span className="font-mono mr-4 text-muted-foreground">
              {String.fromCharCode(65 + index)}.
            </span>
            <span className="flex-1">{choice.text}</span>
          </button>
        ))}

        {isModule2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sky-600 dark:text-sky-400 mb-2 font-semibold text-sm">Alternate Cause (Third Factor)</label>
              <textarea
                value={thirdFactor}
                onChange={(e) => setThirdFactor(e.target.value)}
                placeholder="What hidden factor could cause BOTH the original cause and effect?"
                className="w-full rounded-lg bg-secondary border border-border p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                disabled={isRevealed}
              />
            </div>
            <div>
              <label className="block text-sky-600 dark:text-sky-400 mb-2 font-semibold text-sm">Reverse Causation Scenario</label>
              <textarea
                value={reverseCausation}
                onChange={(e) => setReverseCausation(e.target.value)}
                placeholder="How could the 'effect' actually be the 'cause'?"
                className="w-full rounded-lg bg-secondary border border-border p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                disabled={isRevealed}
              />
            </div>
            <button
              onClick={handleSubmitModule2}
              disabled={!thirdFactor || !reverseCausation || isRevealed}
              className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Model Answer
            </button>
          </div>
        )}

        {isModule3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sky-600 dark:text-sky-400 mb-2 font-semibold text-sm">'Cause without Effect' Scenario</label>
              <textarea
                value={causeWithoutEffect}
                onChange={(e) => setCauseWithoutEffect(e.target.value)}
                placeholder="Describe a plausible scenario where the cause occurs, but the effect does NOT."
                className="w-full rounded-lg bg-secondary border border-border p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                disabled={isRevealed}
              />
            </div>
            <div>
              <label className="block text-sky-600 dark:text-sky-400 mb-2 font-semibold text-sm">'Effect without Cause' Scenario</label>
              <textarea
                value={effectWithoutCause}
                onChange={(e) => setEffectWithoutCause(e.target.value)}
                placeholder="Describe a plausible scenario where the effect occurs, but the cause is ABSENT."
                className="w-full rounded-lg bg-secondary border border-border p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                disabled={isRevealed}
              />
            </div>
            <button
              onClick={handleSubmitModule3}
              disabled={!causeWithoutEffect || !effectWithoutCause || isRevealed}
              className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Model Answer
            </button>
          </div>
        )}
      </div>

      {isRevealed && (isModule1 || isModule4) && (
        <div className="mt-4 rounded-lg bg-sky-500/5 border border-sky-500/20 p-4">
          <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Explanation</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {question.explanation}
            {question.breakdown && (
              <div className="mt-4 border-t pt-4 border-border">
                <h4 className="font-semibold mb-2 text-foreground">Breakdown</h4>
                <p><strong>Conclusion:</strong> {question.breakdown.mainConclusion}</p>
                {question.breakdown.premises.map((p, i) => (
                  <p key={i}><strong>Premise {i + 1}:</strong> {p}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSQuestionCard;
