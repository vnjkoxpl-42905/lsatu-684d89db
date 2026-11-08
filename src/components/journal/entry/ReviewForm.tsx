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
import { PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { SelfRating } from '@/lib/wajNotesService';

// ── Onboarding coachmark tour (shown once per user) ──────────────────────────
const TOUR_KEY = 'waj_review_tour_done_v1';
type TourKey = 'self_rating' | 'wrong_reasoning' | 'correct_reasoning' | 'lesson';
const TOUR_STEPS: { key: TourKey; text: string }[] = [
  { key: 'self_rating', text: 'Start by rating how you did. It sorts this entry into the right bucket.' },
  { key: 'wrong_reasoning', text: 'Name the specific trap that pulled you to the wrong answer, so you recognize it next time.' },
  { key: 'correct_reasoning', text: 'Explain in your own words why the correct answer is correct. Bonus: why you dismissed it initially.' },
  { key: 'lesson', text: 'Distill one takeaway you can carry to the next question of this type.' },
];

export interface JournalDraft {
  self_rating: SelfRating | null;
  date_taken: string; // YYYY-MM-DD or ''
  question_summary: string;
  wrong_answer: string; // chosen letter or ''
  wrong_reasoning: string;
  correct_reasoning: string;
  lesson: string;
  other_notes: string;
  /** The free note written from the drill review's Journal panel. */
  student_note?: string;
  /** The trap that caught the student. */
  trap_pattern?: string;
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

function TourTip({
  active,
  text,
  stepIndex,
  total,
  onBack,
  onNext,
}: {
  active: boolean;
  text: string;
  stepIndex: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
}) {
  if (!active) return null;
  return (
    <div className="mt-2 rounded-md border border-border bg-muted p-3">
      <p className="text-[12px] leading-relaxed text-foreground/90">{text}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn('h-1.5 w-1.5 rounded-full', i === stepIndex ? 'bg-foreground' : 'bg-border')}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button type="button" onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
          >
            {stepIndex === total - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  draft: JournalDraft;
  correctAnswer: string;
  answerKeys?: string[];
  onPatch: (patch: Partial<JournalDraft>) => void;
  onCollapse?: () => void;
}

export function ReviewForm({ draft, correctAnswer, answerKeys = ANSWER_KEYS, onPatch, onCollapse }: Props) {
  const [tourStep, setTourStep] = React.useState<number>(() => {
    if (typeof window === 'undefined') return -1;
    return window.localStorage.getItem(TOUR_KEY) ? -1 : 0;
  });

  const advance = () => {
    setTourStep((s) => {
      const next = s + 1;
      if (next >= TOUR_STEPS.length) {
        try {
          window.localStorage.setItem(TOUR_KEY, '1');
        } catch {
          /* ignore storage failures */
        }
        return -1;
      }
      return next;
    });
  };
  const back = () => setTourStep((s) => Math.max(0, s - 1));

  const tipFor = (key: TourKey) => {
    const idx = TOUR_STEPS.findIndex((t) => t.key === key);
    return (
      <TourTip
        active={tourStep === idx}
        text={TOUR_STEPS[idx].text}
        stepIndex={idx}
        total={TOUR_STEPS.length}
        onBack={back}
        onNext={advance}
      />
    );
  };

  return (
    <div className="space-y-5 px-5 py-6">
      {onCollapse && (
        <div className="-mb-1 flex justify-end">
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse review"
            aria-label="Collapse review"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
        {tipFor('self_rating')}
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
        {tipFor('wrong_reasoning')}
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
        {tipFor('correct_reasoning')}
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
        {tipFor('lesson')}
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
