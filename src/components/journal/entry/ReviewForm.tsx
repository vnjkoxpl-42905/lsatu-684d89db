/**
 * ReviewForm — the right-rail review fields for a journal entry. Controlled +
 * presentational: it renders the current draft and reports edits via onPatch.
 * The parent surface owns debounced autosave (so there is NO Save button).
 *
 * Fields mirror the lsatjournal entry form: How did you do? · Date taken ·
 * Question Summary · Wrong Answer / Correct Answer · Wrong Reasoning ·
 * Correct Reasoning · Lesson · Other Notes.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { SelfRating } from '@/lib/wajNotesService';

export interface JournalDraft {
  self_rating: SelfRating | null;
  date_taken: string; // YYYY-MM-DD or ''
  question_summary: string;
  wrong_answer: string; // chosen letter or ''
  wrong_reasoning: string;
  correct_reasoning: string;
  lesson: string;
  other_notes: string;
}

const ANSWER_KEYS = ['A', 'B', 'C', 'D', 'E'];

const RATINGS: { value: SelfRating; label: string; cls: string }[] = [
  { value: 'correct', label: 'Correct', cls: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
  { value: 'unsure', label: 'Unsure', cls: 'border-amber-500 bg-amber-500/15 text-amber-300' },
  { value: 'wrong', label: 'Wrong', cls: 'border-rose-500 bg-rose-500/15 text-rose-300' },
];

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">{children}</div>;
}

interface Props {
  draft: JournalDraft;
  correctAnswer: string;
  answerKeys?: string[];
  onPatch: (patch: Partial<JournalDraft>) => void;
}

export function ReviewForm({ draft, correctAnswer, answerKeys = ANSWER_KEYS, onPatch }: Props) {
  return (
    <div className="space-y-5 px-5 py-6">
      {/* How did you do? */}
      <div>
        <Label>How did you do?</Label>
        <div className="grid grid-cols-3 gap-2">
          {RATINGS.map((r) => {
            const selected = draft.self_rating === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => onPatch({ self_rating: selected ? null : r.value })}
                className={cn(
                  'rounded-md border py-1.5 text-[12px] font-medium transition-colors',
                  selected ? r.cls : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date taken */}
      <div>
        <Label>Date taken</Label>
        <input
          type="date"
          value={draft.date_taken}
          onChange={(e) => onPatch({ date_taken: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Question Summary */}
      <div>
        <Label>Question Summary</Label>
        <Textarea
          className="min-h-[64px] resize-none text-[13px]"
          placeholder="Brief summary of what this question is asking…"
          value={draft.question_summary}
          onChange={(e) => onPatch({ question_summary: e.target.value })}
        />
      </div>

      {/* Wrong / Correct answer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Wrong Answer</Label>
          <select
            value={draft.wrong_answer}
            onChange={(e) => onPatch({ wrong_answer: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select…</option>
            {answerKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Correct Answer</Label>
          <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5 text-[13px] font-semibold text-emerald-300">
            {correctAnswer || '—'}
          </div>
        </div>
      </div>

      {/* Wrong Reasoning */}
      <div>
        <Label>Wrong Reasoning</Label>
        <Textarea
          className="min-h-[72px] resize-none text-[13px]"
          placeholder="What reasoning led you to the wrong answer?"
          value={draft.wrong_reasoning}
          onChange={(e) => onPatch({ wrong_reasoning: e.target.value })}
        />
      </div>

      {/* Correct Reasoning */}
      <div>
        <Label>Correct Reasoning</Label>
        <Textarea
          className="min-h-[72px] resize-none text-[13px]"
          placeholder="What makes the correct answer correct?"
          value={draft.correct_reasoning}
          onChange={(e) => onPatch({ correct_reasoning: e.target.value })}
        />
      </div>

      {/* Lesson */}
      <div>
        <Label>Lesson</Label>
        <Textarea
          className="min-h-[64px] resize-none text-[13px]"
          placeholder="What will you remember for next time?"
          value={draft.lesson}
          onChange={(e) => onPatch({ lesson: e.target.value })}
        />
      </div>

      {/* Other Notes */}
      <div>
        <Label>Other Notes</Label>
        <Textarea
          className="min-h-[56px] resize-none text-[13px]"
          placeholder="Anything else worth remembering…"
          value={draft.other_notes}
          onChange={(e) => onPatch({ other_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
