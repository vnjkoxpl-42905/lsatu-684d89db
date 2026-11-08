import * as React from "react";
import type { JournalDraft } from "@/components/journal/entry/ReviewForm";
import type { SelfRating } from "@/lib/wajNotesService";

const ANSWER_KEYS = ["A", "B", "C", "D", "E"];
const RATINGS: { value: SelfRating; label: string }[] = [
  { value: "wrong", label: "Wrong" },
  { value: "unsure", label: "Unsure" },
  { value: "correct", label: "Correct" },
];

type JournalReviewPanelProps = {
  draft: JournalDraft;
  correctAnswer: string;
  answerKeys?: string[];
  onPatch: (patch: Partial<JournalDraft>) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="classroom-review-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function JournalReviewPanel({
  draft,
  correctAnswer,
  answerKeys = ANSWER_KEYS,
  onPatch,
}: JournalReviewPanelProps) {
  return (
    <div className="classroom-review-form">
      <div className="classroom-review-field">
        <span>How did you do?</span>
        <div className="classroom-review-ratings">
          {RATINGS.map((rating) => {
            const selected = draft.self_rating === rating.value;
            return (
              <button
                key={rating.value}
                type="button"
                className={`classroom-review-rating classroom-review-rating-${rating.value}${
                  selected ? " classroom-review-rating-active" : ""
                }`}
                aria-pressed={selected}
                onClick={() =>
                  onPatch({
                    self_rating: selected ? null : rating.value,
                  })
                }
              >
                {rating.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Date taken">
        <input
          type="date"
          className="classroom-review-control"
          value={draft.date_taken}
          onChange={(event) => onPatch({ date_taken: event.target.value })}
        />
      </Field>

      <Field label="Question Summary">
        <textarea
          className="classroom-textarea"
          rows={3}
          placeholder="Brief summary of what this question is asking…"
          value={draft.question_summary}
          onChange={(event) =>
            onPatch({ question_summary: event.target.value })
          }
        />
      </Field>

      <div className="classroom-review-answer-grid">
        <Field label="Wrong Answer">
          <select
            className="classroom-review-control"
            value={draft.wrong_answer}
            onChange={(event) =>
              onPatch({ wrong_answer: event.target.value })
            }
          >
            <option value="">Select…</option>
            {answerKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Correct Answer">
          <output className="classroom-review-correct-answer">
            {correctAnswer || "Not available"}
          </output>
        </Field>
      </div>

      <Field label="Wrong Reasoning">
        <textarea
          className="classroom-textarea"
          rows={4}
          placeholder="What reasoning led you to the wrong answer?"
          value={draft.wrong_reasoning}
          onChange={(event) =>
            onPatch({ wrong_reasoning: event.target.value })
          }
        />
      </Field>

      <Field label="Correct Reasoning">
        <textarea
          className="classroom-textarea"
          rows={4}
          placeholder="What makes the correct answer correct?"
          value={draft.correct_reasoning}
          onChange={(event) =>
            onPatch({ correct_reasoning: event.target.value })
          }
        />
      </Field>

      <Field label="The Trap">
        <textarea
          className="classroom-textarea"
          rows={2}
          placeholder="Name the pattern that caught you."
          value={draft.trap_pattern ?? ""}
          onChange={(event) => onPatch({ trap_pattern: event.target.value })}
        />
      </Field>

      <Field label="Lesson">
        <textarea
          className="classroom-textarea"
          rows={3}
          placeholder="What will you remember for next time?"
          value={draft.lesson}
          onChange={(event) => onPatch({ lesson: event.target.value })}
        />
      </Field>

      <Field label="Note">
        <textarea
          className="classroom-textarea"
          rows={3}
          placeholder="Your note on this question"
          value={draft.student_note ?? ""}
          onChange={(event) => onPatch({ student_note: event.target.value })}
        />
      </Field>

      <Field label="Other Notes">
        <textarea
          className="classroom-textarea"
          rows={3}
          placeholder="Anything else worth remembering…"
          value={draft.other_notes}
          onChange={(event) => onPatch({ other_notes: event.target.value })}
        />
      </Field>
    </div>
  );
}
