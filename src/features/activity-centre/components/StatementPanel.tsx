import type { ActivityItem } from "../api/types";
import { PROMPT_SCALE_CLASS, promptScale, renderPrompt } from "../prompt-format";

interface StatementPanelProps {
  item: ActivityItem;
  showQuestionType: boolean;
  /**
   * Whether to draw the prompt here. False when the Activity's world already
   * shows it as written, which would otherwise put the same text on screen
   * twice. The question-type chip is not a duplicate and still appears.
   */
  showPrompt?: boolean;
}

/**
 * Statement block: question type chip + the prompt, styled like the reference.
 *
 * The prompt is authored text that may carry inline emphasis (Spot the Callback
 * marks its callback phrase, Vocab Rehab marks its target word) and may run to
 * two paragraphs. It is rendered through the prompt formatter rather than as a
 * bare string so those marks appear as emphasis instead of asterisks, and so a
 * passage-length prompt steps down off display type into something readable.
 */
export function StatementPanel({ item, showQuestionType, showPrompt = true }: StatementPanelProps) {
  const scale = promptScale(item.prompt);
  // Spot categories are internal difficulty metadata, including older snapshots.
  const isRelationship = !!item.answer_key || /^Rung\s+\d/i.test(item.category ?? "");
  const chip = showQuestionType && !isRelationship && item.category ? (
    <span className="inline-flex w-fit items-center rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {item.category}
    </span>
  ) : null;

  // The world already has the prompt. The chip is not a duplicate and stays,
  // but on its own it does not earn a card: an empty panel with one small tag
  // in it reads as a box that failed to load.
  if (!showPrompt) return chip;

  return (
    <div className="rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(30,24,16,0.05)] md:p-9">
      {chip && <div className="mb-4">{chip}</div>}
      <div className={`ac-display text-foreground ${PROMPT_SCALE_CLASS[scale]}`}>
        {renderPrompt(item.prompt)}
      </div>
    </div>
  );
}
