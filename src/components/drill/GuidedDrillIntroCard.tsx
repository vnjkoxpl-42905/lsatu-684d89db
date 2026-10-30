/**
 * Pre-start instructional card shown before a guided drill begins.
 *
 * Reads `instructions_markdown` from a homework_set, splits it on the
 * canonical `### Left Column` / `### Right Column` markers, and renders
 * a 2-column layout on desktop / stacked layout on mobile. The same body
 * is reused inside <GuidedDrillIntroModal> for the in-drill Info button.
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, Layers, Sparkles, BookOpen } from 'lucide-react';
import type { HomeworkSet } from '@/hooks/useHomeworkSets';

interface Props {
  set: Pick<
    HomeworkSet,
    | 'title'
    | 'description'
    | 'question_qids'
    | 'instructions_markdown'
    | 'instruction_layout'
    | 'guided_set_type'
    | 'question_type'
    | 'reasoning_type'
    | 'question_feature'
    | 'estimated_minutes'
    | 'source_pts'
    | 'difficulty_min'
    | 'difficulty_max'
    | 'start_button_label'
  >;
  questionCount?: number;
  onStart: () => void;
  onCancel?: () => void;
  /** Hide the start button — used inside the in-drill Info modal. */
  readOnly?: boolean;
}

const COLUMN_HEADER = /^###\s+(left|right)\s+column\s*$/im;

function splitColumns(md: string | null | undefined): { left: string; right: string | null } {
  if (!md) return { left: '', right: null };
  const lines = md.split('\n');
  const sections: { name: 'left' | 'right' | 'preamble'; lines: string[] }[] = [
    { name: 'preamble', lines: [] },
  ];
  for (const line of lines) {
    const m = line.match(COLUMN_HEADER);
    if (m) {
      const name = m[1].toLowerCase() as 'left' | 'right';
      sections.push({ name, lines: [] });
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }
  const left = sections.find((s) => s.name === 'left')?.lines.join('\n').trim() ?? '';
  const right = sections.find((s) => s.name === 'right')?.lines.join('\n').trim() ?? null;
  // If no Left/Right markers were present, fall back to the entire body as left.
  if (!left && !right) {
    return { left: md.trim(), right: null };
  }
  return { left, right };
}

function difficultyLabel(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return null;
  if (min == null) return `Up to L${max}`;
  if (max == null) return `From L${min}`;
  if (min === max) return `Level ${min}`;
  return `Levels ${min}–${max}`;
}

export function GuidedDrillIntroCard({ set, questionCount, onStart, onCancel, readOnly }: Props) {
  const { left, right } = useMemo(() => splitColumns(set.instructions_markdown), [set.instructions_markdown]);
  const layout = set.instruction_layout ?? (right ? 'two_column' : 'single_column');
  const buttonLabel = set.start_button_label || 'Start';
  const count = questionCount ?? set.question_qids?.length ?? 0;
  const difficulty = difficultyLabel(set.difficulty_min, set.difficulty_max);
  const sourcePts = set.source_pts && set.source_pts.length > 0 ? set.source_pts.join(', ') : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 space-y-3">
        {set.guided_set_type && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {set.guided_set_type}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{set.title}</h1>
        {set.description && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">{set.description}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {count > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {count} question{count === 1 ? '' : 's'}
            </Badge>
          )}
          {set.estimated_minutes != null && (
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              ~{set.estimated_minutes} min
            </Badge>
          )}
          {difficulty && (
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {difficulty}
            </Badge>
          )}
          {sourcePts && (
            <Badge variant="secondary" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              PT {sourcePts}
            </Badge>
          )}
          {set.question_type && (
            <Badge variant="outline" className="text-xs">
              {set.question_type}
            </Badge>
          )}
          {set.question_feature && set.question_feature !== set.question_type && (
            <Badge variant="outline" className="text-xs">
              {set.question_feature}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className={
          layout === 'two_column' && right
            ? 'grid gap-6 lg:gap-10 md:grid-cols-2'
            : 'space-y-4'
        }
      >
        <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none rounded-xl border border-border bg-card p-5 sm:p-7">
          <ReactMarkdown>{left}</ReactMarkdown>
        </article>
        {right && (
          <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none rounded-xl border border-border bg-card p-5 sm:p-7">
            <ReactMarkdown>{right}</ReactMarkdown>
          </article>
        )}
      </div>

      {/* CTA */}
      {!readOnly && (
        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Back
            </Button>
          )}
          <Button size="lg" onClick={onStart} className="gap-2 min-w-[160px]">
            {buttonLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
