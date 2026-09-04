import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ActivityAssignmentSummary } from "../api/types";
import { cardIdentityFor, slugFromTitle, worldForTitle } from "../worlds/registry";
import "./activity-scenes.css";

const STATUS_LABEL: Record<ActivityAssignmentSummary["status"], string> = {
  assigned: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Not finished",
};

interface ActivityCardProps {
  /**
   * A list row, not a run. The card draws a title, a status, a score and a
   * count; it never needed the question snapshot, and taking it off this type
   * is what keeps the narrowed query honest.
   */
  assignment: ActivityAssignmentSummary;
  /** Position in the teaching progression, 1-based. */
  position: number;
  onOpen: () => void;
}

/**
 * One Activity in the Centre's list.
 *
 * Split out of the page so it can be looked at in the Activity Lab without a
 * signed-in student, which is the same reason the intro moved there: the list
 * is behind auth and a feature flag, so its visual defects were invisible while
 * building.
 *
 * The card carries the world it opens into, by name and by a hairline of that
 * world's hue. Eight Activities drawn as eight identical rows read as one
 * undifferentiated list, which is the wrong impression when each is a different
 * place. The hue is a 3px edge and an eyebrow, never a fill: the surface stays
 * monochrome editorial and the colour only does identification.
 */
export function ActivityCard({ assignment, position, onOpen }: ActivityCardProps) {
  const done = assignment.status === "completed";
  const world = worldForTitle(assignment.title);
  /**
   * The eyebrow. Falls back for an Activity that has no world, so the spoken
   * one is not the single unlabelled row in a list of labelled ones.
   */
  const identity = cardIdentityFor(assignment.title);
  const slug = slugFromTitle(assignment.title);
  const accent = identity ? `hsl(${identity.accent})` : "hsl(var(--muted-foreground))";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-[20px] border border-border bg-card p-2.5 pb-5 text-left transition-shadow hover:shadow-[0_10px_32px_rgba(16,24,40,0.14)]"
    >
      {/* The doorway: a painted miniature of the world this card opens into. */}
      {world ? (
        <span aria-hidden className={`act-scene act-scene--${slug}`}>
          <span className="act-scene-extra" />
        </span>
      ) : (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      )}

      <div className="flex items-baseline gap-2 px-2.5">
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {String(position).padStart(2, "0")}
        </span>
        {identity && (
          <>
            <span
              className="text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: accent }}
            >
              {identity.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{identity.scope}</span>
          </>
        )}
      </div>

      <div className="min-w-0 px-2.5">
        <p className="ac-display text-xl leading-tight text-foreground">{assignment.title}</p>
        {assignment.subtitle && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{assignment.subtitle}</p>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border px-2.5 pt-3 text-xs">
        {done ? (
          <span className="inline-flex items-center gap-1 font-medium text-[hsl(var(--ac-emerald-strong))]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {assignment.score != null ? `${assignment.score}%` : "Completed"}
          </span>
        ) : (
          <span className="text-muted-foreground">{STATUS_LABEL[assignment.status]}</span>
        )}
        <span className="text-muted-foreground">· {assignment.item_count} items</span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
