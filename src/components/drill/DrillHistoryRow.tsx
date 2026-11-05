import * as React from "react";
import { AlertCircle, CheckCircle2, EyeOff, Lock, Repeat2, Timer } from "lucide-react";
import { RC_TAKE_LABELS, type StandaloneDrillHistoryItem } from "@/lib/standaloneDrillHistory";

/**
 * One drill in the Completed / In progress history.
 *
 * Surface job: a row is an interactive plane on the section's single card, so it
 * is separated by a hairline and lifts on hover instead of being a card of its
 * own. The left circle says where the drill stands: a ring with the accuracy
 * when it is finished and scored, a lock when the score is still hidden, and a
 * pulsing dot while it is still open.
 *
 * "Needs review" is worked out from the answers: a finished drill with missed
 * questions needs review, one with none does not. The ledger does not record
 * whether the student actually opened Review, so this never claims they did.
 */

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TIMING_LABEL = { timed: "Timed", untimed: "Untimed", unknown: "Timing unknown" } as const;

export function DrillHistoryRow({ run, completed, children }: {
  run: StandaloneDrillHistoryItem;
  completed: boolean;
  /** Action buttons. The page owns them, including the discard confirmation. */
  children: React.ReactNode;
}) {
  const score = completed ? run.score ?? null : null;
  const percent = score ? Math.round((score.correct / score.total) * 100) : null;
  const missed = score ? score.total - score.correct : 0;
  const hidden = completed && !score && run.section === "rc";
  const dateLabel = formatDate(run.date);

  const detail = score
    ? `${score.correct} of ${score.total} correct`
    : hidden ? "Results stay hidden until you reveal them"
    : run.detail;

  const review = !completed ? null
    : score ? (missed > 0
      ? { need: true, label: `${missed} to review` }
      : { need: false, label: "Nothing to review" })
    : hidden ? { need: null, label: "Reveal results to see what to review" }
    : null;

  return (
    <li className="dh-row" data-state={completed ? "completed" : "open"}>
      <div className="dh-lead">
        {score && percent !== null ? (
          <span className="dh-ring" style={{ "--dh-p": percent } as React.CSSProperties} role="img" aria-label={`${percent} percent correct, ${score.correct} of ${score.total}`}>
            <span className="dh-ring-inner">{percent}<small>%</small></span>
          </span>
        ) : (
          <span className="dh-glyph" data-state={hidden ? "hidden" : completed ? "done" : "open"} aria-hidden>
            {hidden ? <Lock /> : completed ? <CheckCircle2 /> : <span className="dh-pulse"><span className="dh-dot" /></span>}
          </span>
        )}
      </div>

      <div className="dh-main">
        <p className="dh-title">{run.title}</p>
        <div className="dh-statusrow">
          <span className="dh-status" data-state={completed ? "completed" : "open"}>{completed ? "Completed" : "In progress"}</span>
          {review && (
            <span className="dh-review" data-need={review.need === null ? "unknown" : String(review.need)}>
              {review.need ? <AlertCircle aria-hidden /> : review.need === false ? <CheckCircle2 aria-hidden /> : null}
              {review.label}
            </span>
          )}
        </div>
        {detail && <p className="dh-detail">{detail}</p>}
        {run.section === "rc" && (
          <ul className="dh-chips" aria-label="Drill settings">
            <li className="dh-chip"><Timer aria-hidden />{TIMING_LABEL[run.rcTiming ?? "unknown"]}</li>
            <li className="dh-chip"><Repeat2 aria-hidden />{RC_TAKE_LABELS[run.rcTake ?? "unknown"]}</li>
            {run.rcExcluded && <li className="dh-chip dh-chip-flag"><EyeOff aria-hidden />Excluded from analytics</li>}
          </ul>
        )}
      </div>

      <div className="dh-side">
        {dateLabel && <time className="dh-date" dateTime={run.date}>{dateLabel}</time>}
        <div className="dh-actions">{children}</div>
      </div>
    </li>
  );
}
