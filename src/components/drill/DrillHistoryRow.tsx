import * as React from "react";
import { CheckCircle2, EyeOff, Lock, Repeat2, Timer } from "lucide-react";
import { RC_TAKE_LABELS, type StandaloneDrillHistoryItem } from "@/lib/standaloneDrillHistory";

/**
 * One drill in the Completed / In progress history.
 *
 * Surface job: a row is an interactive plane on the section's single card, so it
 * is separated by a hairline and lifts on hover instead of being a card of its
 * own. The left column carries the one number a student scans for (accuracy);
 * everything else is quieter and sits behind it in reading order.
 */

type ParsedScore = { correct: number; total: number; percent: number; rest: string };

/** The ledger writes "1/7 correct · 14%" into `detail`; lift it out for display. */
export function parseScoreDetail(detail: string): ParsedScore | null {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s+correct(?:\s*·\s*(\d+)\s*%)?\s*(?:·\s*)?(.*)$/.exec(detail);
  if (!match) return null;
  const correct = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;
  const percent = match[3] !== undefined ? Number(match[3]) : Math.round((correct / total) * 100);
  return { correct, total, percent: Math.max(0, Math.min(100, percent)), rest: match[4].trim() };
}

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
  const score = completed ? parseScoreDetail(run.detail) : null;
  const hidden = completed && !score && /results hidden/i.test(run.detail);
  const detail = score ? score.rest : run.detail;
  const dateLabel = formatDate(run.date);

  return (
    <li className="dh-row">
      <div className="dh-lead" aria-hidden={score ? undefined : true}>
        {score ? (
          <span className="dh-ring" style={{ "--dh-p": score.percent } as React.CSSProperties} role="img" aria-label={`${score.percent} percent correct, ${score.correct} of ${score.total}`}>
            <span className="dh-ring-inner">{score.percent}<small>%</small></span>
          </span>
        ) : (
          <span className="dh-glyph" data-state={hidden ? "hidden" : completed ? "done" : "open"}>
            {hidden ? <Lock aria-hidden /> : completed ? <CheckCircle2 aria-hidden /> : <span className="dh-dot" />}
          </span>
        )}
      </div>

      <div className="dh-main">
        <p className="dh-title">{run.title}</p>
        {score && <p className="dh-detail">{score.correct} of {score.total} correct{detail ? ` · ${detail}` : ""}</p>}
        {!score && detail && <p className="dh-detail">{detail}</p>}
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
