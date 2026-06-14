import type { ActivityItem } from "../api/types";

interface StatementPanelProps {
  item: ActivityItem;
}

/** Left panel: the statement to negate, presented calm and large. */
export function StatementPanel({ item }: StatementPanelProps) {
  return (
    <div className="flex h-full flex-col justify-center rounded-[24px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:p-9">
      {item.category && (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {item.category}
        </span>
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Statement</p>
      <p className="ac-display mt-3 text-2xl leading-snug text-foreground md:text-[28px]">
        {item.prompt}
      </p>
    </div>
  );
}
