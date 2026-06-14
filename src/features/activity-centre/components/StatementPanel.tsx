import type { ActivityItem } from "../api/types";

interface StatementPanelProps {
  item: ActivityItem;
  showQuestionType: boolean;
}

/** Statement block: question type chip + the prompt, styled like the reference. */
export function StatementPanel({ item, showQuestionType }: StatementPanelProps) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:p-9">
      {showQuestionType && item.category && (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {item.category}
        </span>
      )}
      <p className="ac-display text-2xl font-semibold leading-snug text-foreground md:text-[32px]">
        {item.prompt}
      </p>
    </div>
  );
}
