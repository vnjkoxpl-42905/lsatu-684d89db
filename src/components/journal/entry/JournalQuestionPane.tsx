/**
 * JournalQuestionPane — the center pane of the Wrong Answer Journal entry.
 *
 * Renders the FULL question (no masking) in LSATU's dark theme: stimulus +
 * stem + A–E choices. Marks the correct answer green (always) and the
 * student's chosen answer red when it was wrong. The right-rail Wrong/Correct
 * Reasoning fields pin back here as inline callouts under the relevant choice.
 * A freehand AnnotationLayer sits over the whole pane. The per-choice lightbulb
 * is rendered but inert in v1 (explanations are a later phase).
 *
 * Text-cleaning mirrors OfficialQuestionPane (the white test-taking renderer);
 * this is the dark journal sibling.
 */
import * as React from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LRQuestion } from '@/lib/questionLoader';
import type { AnnotationStroke } from '@/lib/wajNotesService';
import { AnnotationLayer } from './AnnotationLayer';

function stripDataArtifacts(text: string): string {
  return text
    .replace(/\s*\{#\d+\}\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function cleanAnswerChoice(key: string, text: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return stripDataArtifacts(text)
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\[${escapedKey}\\]\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\(${escapedKey}\\)\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*[-–—]?\\s*${escapedKey}[.)]\\s*`, 'i'), '')
    .trim();
}

interface Props {
  question: LRQuestion;
  displayNumber: number;
  correctAnswer: string;
  chosenAnswer: string | null;
  questionSummary: string;
  wrongReasoning: string;
  correctReasoning: string;
  annotateActive: boolean;
  annotations: AnnotationStroke[];
  onAnnotationsChange: (strokes: AnnotationStroke[]) => void;
  /** Mark a choice as the student's wrong answer (clicking it in the question). */
  onChooseWrong?: (key: string) => void;
}

function ReasoningCallout({ tone, label, text }: { tone: 'wrong' | 'correct'; label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div
      className={cn(
        'ml-9 mt-2 rounded-md border-l-2 px-3 py-2',
        tone === 'wrong'
          ? 'border-rose-500 bg-rose-500/10'
          : 'border-emerald-500 bg-emerald-500/10',
      )}
    >
      <div
        className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.15em]',
          tone === 'wrong' ? 'text-rose-300' : 'text-emerald-300',
        )}
      >
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}

export function JournalQuestionPane({
  question,
  displayNumber,
  correctAnswer,
  chosenAnswer,
  questionSummary,
  wrongReasoning,
  correctReasoning,
  annotateActive,
  annotations,
  onAnnotationsChange,
  onChooseWrong,
}: Props) {
  const stimulusText = stripDataArtifacts(question.stimulus ?? '');
  const stemText = stripDataArtifacts(question.questionStem);
  const answerEntries = Object.entries(question.answerChoices).map(
    ([key, text]) => [key, cleanAnswerChoice(key, String(text))] as const,
  );
  const chosenIsWrong = !!chosenAnswer && chosenAnswer !== correctAnswer;
  // Show a nudge when the student has written wrong-answer reasoning but hasn't
  // marked which answer they chose, so the reasoning has nowhere to pin yet.
  const needsWrongAnswer = !!wrongReasoning.trim() && !chosenIsWrong;

  return (
    <div className="font-lsat-question relative h-full">
      {/* Freehand annotation overlay (covers stimulus + stem) */}
      <AnnotationLayer active={annotateActive} strokes={annotations} onChange={onAnnotationsChange} />

      <div className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,50fr)_minmax(0,50fr)]">
        {/* Stimulus */}
        <div className="min-w-0 overflow-y-auto border-border px-6 py-7 lg:border-r">
          <div className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground/90 [&_p]:mb-4">
            {stimulusText}
          </div>
          {questionSummary.trim() && (
            <div className="mt-5 rounded-md border border-border bg-muted px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Your question summary
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                {questionSummary}
              </p>
            </div>
          )}
        </div>

        {/* Stem + choices */}
        <div className="min-w-0 overflow-y-auto px-6 py-7">
          <div className="flex items-start gap-2">
            <span className="min-w-[20px] shrink-0 font-bold tabular-nums text-foreground">
              {displayNumber}.
            </span>
            <div className="flex-1 text-[14px] leading-relaxed text-foreground">{stemText}</div>
          </div>

          {needsWrongAnswer && (
            <div className="ml-9 mt-3 rounded-md border-l-2 border-amber-500 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200/90">
              Click the answer you chose below to attach your wrong reasoning to it.
            </div>
          )}

          <ul className="mt-5 space-y-3">
            {answerEntries.map(([key, text]) => {
              const isCorrect = key === correctAnswer;
              const isChosenWrong = chosenIsWrong && key === chosenAnswer;
              // Clicking a non-correct choice marks it as the wrong answer chosen.
              const selectable = !isCorrect && !!onChooseWrong;
              return (
                <li key={key}>
                  <div
                    role={selectable ? 'button' : undefined}
                    tabIndex={selectable ? 0 : undefined}
                    aria-pressed={selectable ? isChosenWrong : undefined}
                    title={selectable ? 'Mark as the answer you chose' : undefined}
                    onClick={selectable ? () => onChooseWrong!(key) : undefined}
                    onKeyDown={
                      selectable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onChooseWrong!(key);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'grid grid-cols-[auto_1fr_auto_auto] items-start gap-3 rounded-lg border p-3 transition-colors',
                      isCorrect
                        ? 'border-emerald-500/70 bg-emerald-500/[0.07]'
                        : isChosenWrong
                        ? 'border-rose-500/70 bg-rose-500/[0.07]'
                        : 'border-border bg-card',
                      selectable && !isChosenWrong &&
                        'cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/[0.04]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : isChosenWrong
                          ? 'bg-rose-500 text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {key}
                    </span>
                    <span className="text-[13px] leading-relaxed text-foreground/90">{text}</span>
                    {/*
                      Non-colour verdict. emerald #0fb781 and rose #f53d5c sit at OKLab
                      dE 5.7 under deuteranopia — below the accessibility floor of 8 — so
                      on this surface, where the correct answer and the student's wrong
                      pick are rendered adjacent, hue alone is not a legible signal.
                      The ReasoningCallout below cannot carry it either: it returns null
                      when the student has written no reasoning.
                      See docs/chart-palette.md §3.
                    */}
                    {(isCorrect || isChosenWrong) && (
                      <span
                        className={cn(
                          'mt-0.5 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
                          isCorrect
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300',
                        )}
                      >
                        {isCorrect ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                        {isCorrect ? 'Correct' : 'You chose'}
                      </span>
                    )}
                    {/* Inert lightbulb (per-choice explanations are a later phase) */}
                    <button
                      type="button"
                      disabled
                      title="Explanation coming soon"
                      aria-label="Explanation coming soon"
                      className="mt-0.5 shrink-0 cursor-not-allowed p-1 text-muted-foreground/40"
                    >
                      <Lightbulb size={16} />
                    </button>
                  </div>

                  {isChosenWrong && (
                    <ReasoningCallout tone="wrong" label="Your wrong reasoning" text={wrongReasoning} />
                  )}
                  {isCorrect && (
                    <ReasoningCallout tone="correct" label="Your correct reasoning" text={correctReasoning} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
