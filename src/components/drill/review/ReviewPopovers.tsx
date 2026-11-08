import * as React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { BreakdownRow } from "@/lib/analyticsBreakdowns";

/**
 * Hover cards for the results table, 7Sage's shape. Every number traces to
 * the student's own attempts or to the question bank; nothing is estimated.
 * A line with no data behind it is left out, not filled with a placeholder.
 */

/** How often a tag appears on the test, from its share of the question bank. */
export function frequencyLabel(frequency: number): { label: string; bars: number } {
  if (frequency >= 0.08) return { label: "Very common on the test", bars: 4 };
  if (frequency >= 0.04) return { label: "Common on the test", bars: 3 };
  if (frequency >= 0.015) return { label: "Shows up regularly", bars: 2 };
  return { label: "Less common", bars: 1 };
}

export function TagPopover({ tag, stats, family, definition, children }: {
  tag: string;
  stats?: BreakdownRow;
  family?: string;
  definition?: string;
  children: React.ReactNode;
}) {
  const freq = stats ? frequencyLabel(stats.frequency) : null;
  const accuracy = stats?.accuracy != null ? Math.round(stats.accuracy * 100) : null;
  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-80 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold">{tag}</p>
        {family && <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{family}</p>}
        {freq && (
          <p className="mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span aria-hidden className="inline-flex items-end gap-[2px]">
              {[1, 2, 3, 4].map((b) => <span key={b} className={cn("w-[3px] rounded-sm", b <= freq.bars ? "bg-pink-600" : "bg-muted-foreground/25")} style={{ height: 4 + b * 3 }} />)}
            </span>
            {freq.label}
          </p>
        )}
        {definition && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{definition}</p>}
        <div className="mt-4 rounded-xl bg-muted/60 p-3">
          {accuracy == null ? (
            <p className="text-sm text-muted-foreground">No answers on this tag yet.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-[#1f6f8b]">Your accuracy: {accuracy}%</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-[#1f6f8b] transition-[width] duration-500" style={{ width: `${Math.max(accuracy, 2)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{stats!.correct} of {stats!.attempted} right, across all your practice</p>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function ResultPopover({ result, children }: {
  result: "correct" | "incorrect" | "unanswered";
  children: React.ReactNode;
}) {
  const text = result === "correct" ? "Correct" : result === "incorrect" ? "Incorrect" : "Not answered";
  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-56 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</p>
        <p className={cn("mt-1.5 font-semibold", result === "correct" ? "text-emerald-600" : result === "incorrect" ? "text-red-500" : "text-muted-foreground")}>{text}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blind review</p>
        <p className="mt-1.5 font-semibold">Not blind reviewed</p>
      </HoverCardContent>
    </HoverCard>
  );
}
