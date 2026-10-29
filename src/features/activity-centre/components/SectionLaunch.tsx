import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import {
  readMyRecentSectionGrades,
  type RecentSectionRun,
} from "../api/activitiesClient";
import { MethodSummary } from "./MethodSummary";
import { SectionLaunchFrame } from "./SectionLaunchFrame";
import { clock, signedClock, statsFor, ticksFor } from "../recall/runStats";
import "./section-launch.css";
import { useNoKeyboard } from "../recall/noKeyboard";

/** How many past runs the history block shows. */
const RUNS_SHOWN = 3;

export interface SectionLaunchProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** Stimuli in this section, from the assignment snapshot. */
  itemCount?: number;
  /** The clock this section is run against. */
  timeGoalMinutes?: number | null;
  /** `PT105.S2`. Scopes the history read to this section. */
  sourceSection?: string | null;
  /**
   * Whose runs to read. Passed to the QUERY, not used as a display filter: the
   * admin SELECT policy on `activity_section_grades` returns every student's
   * rows, and no flag on this component can undo that. Only the `.eq` can.
   */
  studentId?: string | null;
  /**
   * Whether to show run history at all. False for a teacher reading a student's
   * page and for the authoring preview, where "her last three runs" is either
   * somebody else's record or nobody's.
   */
  showHistory?: boolean;
  onStart: () => void;
  onExit?: () => void;
}

type HistoryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; runs: RecentSectionRun[] }
  | { kind: "failed" };

/**
 * The door to a Read, Recall, Colour section.
 *
 * What it has to do that the editorial intro could not: fit. The page it
 * replaces ran 2778px, put its one button below the fold and grew a sticky dock
 * to compensate. This is one card, Start in the top right, and the long briefing
 * folded into a drawer that opens a beat at a time.
 *
 * Everything numeric on it is derived from runs she has already done -- see
 * `recall/runStats.ts`, which holds the arithmetic and the refusals. Nothing
 * here is scored, predicted, or filled in when the evidence is missing.
 */
export function SectionLaunch({
  title,
  subtitle,
  instructions,
  itemCount,
  timeGoalMinutes,
  sourceSection,
  studentId,
  showHistory = false,
  onStart,
  onExit,
}: SectionLaunchProps) {
  const [history, setHistory] = useState<HistoryState>({ kind: "idle" });
  const noKeyboard = useNoKeyboard();

  const canRead = showHistory && Boolean(sourceSection) && Boolean(studentId);

  useEffect(() => {
    if (!canRead) {
      setHistory({ kind: "idle" });
      return;
    }
    // A resolution that arrives after this effect has been superseded, or after
    // the component is gone, must not land. Without the guard a slow first read
    // can overwrite a fast second one and show the wrong section's runs.
    let live = true;
    setHistory({ kind: "loading" });
    readMyRecentSectionGrades(RUNS_SHOWN, {
      sourceSection: sourceSection ?? undefined,
      studentId: studentId ?? undefined,
    })
      .then((result) => {
        if (!live) return;
        setHistory(result.failed ? { kind: "failed" } : { kind: "ready", runs: result.runs });
      })
      .catch(() => {
        if (live) setHistory({ kind: "failed" });
      });
    return () => {
      live = false;
    };
  }, [canRead, sourceSection, studentId]);

  // Derived inside the memo rather than above it. A `[]` literal computed on
  // every render is a new array every render, so hoisting it would give the
  // memo a dependency that never compares equal and recompute the stats each
  // pass -- a memo that memoises nothing.
  const runs = useMemo(
    () => (history.kind === "ready" ? history.runs : []),
    [history],
  );
  const stats = useMemo(
    () => statsFor(runs, timeGoalMinutes ?? null),
    [runs, timeGoalMinutes],
  );

  return (
    <SectionLaunchFrame
      title={title}
      subtitle={subtitle}
      instructions={instructions}
      onExit={onExit}
      meta={
        <>
          {sourceSection ? `${sourceSection} · ` : ""}
          {typeof itemCount === "number" ? `${itemCount} stimuli` : ""}
          {timeGoalMinutes ? ` · est ${timeGoalMinutes} min` : ""}
        </>
      }
      primaryAction={
        <button type="button" className="sl-start" onClick={onStart}>
          Start the section
          <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      }
      closingAction={
        <button type="button" className="sl-start" onClick={onStart}>
          Start now
          <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      }
      /* Warned, not refused: Joshua's call, 2026-09-04. She is told what the
         run needs and left free to make the call herself, which is why nothing
         here disables Start. The run itself carries an on-screen way to advance
         so that going ahead is a real choice rather than a trap. */
      notice={
        noKeyboard ? (
          <p className="sl-notice" role="status">
            This one is built for a laptop. It records you for the whole section
            in one take, so a call or a locked screen ends the run, and the
            microphone on a phone hears you less well. You can carry on if you
            want to.
          </p>
        ) : null
      }
      strip={showHistory ? <StatStrip state={history} stats={stats} /> : null}
    >
      {showHistory && <RunHistory state={history} />}
    </SectionLaunchFrame>
  );
}

/**
 * The four numbers, or an honest account of why there are not four numbers.
 *
 * A failed read and a student who has never run this section produce the same
 * empty array and must not produce the same sentence: one of them is being told
 * her work is gone.
 */
function StatStrip({
  state,
  stats,
}: {
  state: HistoryState;
  stats: ReturnType<typeof statsFor>;
}) {
  if (state.kind === "loading") {
    return (
      <div className="sl-stats" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="sl-stat" key={i}>
            <span className="sl-label">&nbsp;</span>
            <span className="sl-sv">
              <span className="sl-skel" style={{ width: "60%" }} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (state.kind === "failed" || state.kind === "idle") return null;
  if (stats.totalRuns === 0) return null;

  return (
    <div className="sl-stats">
      <div className="sl-stat">
        <span className="sl-label">Last run</span>
        <span className="sl-sv" data-empty={stats.lastRunSeconds === null || undefined}>
          {stats.lastRunSeconds === null ? "no runs yet" : clock(stats.lastRunSeconds)}
        </span>
        <span className="sl-sd">{stats.totalRuns === 1 ? "first run" : "most recent"}</span>
      </div>
      <div className="sl-stat">
        <span className="sl-label">Trend</span>
        <span
          className="sl-sv"
          data-dir={(stats.trendSeconds ?? 0) < 0 ? "down" : undefined}
          data-empty={stats.trendSeconds === null || undefined}
        >
          {stats.trendSeconds === null ? "first run" : signedClock(stats.trendSeconds)}
        </span>
        <span className="sl-sd">
          {stats.trendSeconds === null ? "nothing to compare yet" : `across ${stats.trendRuns} runs`}
        </span>
      </div>
      {/* "Recorded", because that is what it counts: stimuli she spoke into.
          It was "Recalled", which is a different question and the one the card
          answers with Held. A student could record every stimulus in the
          section and recall almost nothing on any of them. */}
      <div className="sl-stat">
        <span className="sl-label">Recorded</span>
        <span className="sl-sv" data-empty={stats.recorded === null || undefined}>
          {stats.recorded === null ? "not recorded" : stats.recorded}
          {stats.recordedOf !== null && <small>/{stats.recordedOf}</small>}
        </span>
        <span className="sl-sd">
          {stats.recorded === null ? "not recorded" : "stimulus by stimulus"}
        </span>
      </div>
      <div className="sl-stat">
        <span className="sl-label">Target</span>
        <span className="sl-sv" data-empty={stats.targetMinutes === null || undefined}>
          {stats.targetMinutes === null ? "no clock set" : `${stats.targetMinutes}:00`}
        </span>
        <span className="sl-sd">
          {stats.targetMinutes === null
            ? "no clock set"
            : stats.targetRuns === 0
              ? "no run on this clock yet"
              : `met on ${stats.metTarget} of ${stats.targetRuns}`}
        </span>
      </div>
    </div>
  );
}

/** Her last few runs, and what each one covered. */
function RunHistory({ state }: { state: HistoryState }) {
  if (state.kind === "idle") return null;

  return (
    <div className="sl-runs">
      <div>
        <span className="sl-label">
          {state.kind === "ready" && state.runs.length > 0
            ? state.runs.length === 1
              ? "Your first run"
              : `Your last ${state.runs.length} runs`
            : "Your recent runs"}
        </span>
        {state.kind === "loading" && (
          <p className="sl-note" style={{ marginTop: 10 }}>
            <span className="sl-skel" style={{ display: "block", width: "70%" }} />
          </p>
        )}
        {state.kind === "failed" && (
          <p className="sl-note" style={{ marginTop: 10 }}>
            Your run history is not available right now. The section still starts
            normally.
          </p>
        )}
        {state.kind === "ready" && state.runs.length === 0 && (
          <p className="sl-note" style={{ marginTop: 10 }}>
            No runs yet. The first one is the baseline, not the test.
          </p>
        )}
        {state.kind === "ready" && state.runs.length > 0 && (
          <div className="sl-scroll">
            <table className="sl-rtable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  {/* The card's own section figure, under the card's own name.
                      The door used to talk about her runs in a vocabulary the
                      Report Card never used, so the number she remembered from
                      one surface did not appear on the other. */}
                  <th>Held</th>
                  <th>Recorded</th>
                  <th className="sl-r">Stimulus by stimulus</th>
                </tr>
              </thead>
              <tbody>
                {state.runs.map((run) => {
                  const t = ticksFor(run);
                  // `created_at` rather than `graded_at`: a regrade rewrites the
                  // second one, and the date beside a stable sort has to be as
                  // stable as the sort.
                  const when = run.created_at ?? run.graded_at;
                  return (
                    <tr key={`${run.assignment_id}-${run.attempt_no}`}>
                      <td>
                        {new Date(when).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td>{clock(run.section.total_seconds)}</td>
                      <td>{run.section.mean_coverage}%</td>
                      <td>{t ? `${t.recorded} of ${t.slots}` : "not recorded"}</td>
                      <td className="sl-r">
                        {t ? (
                          <span
                            className="sl-ticks"
                            aria-label={`${t.recorded} of ${t.slots} stimuli recorded`}
                          >
                            {t.ticks.map((s, i) => (
                              <span key={i} className="sl-tick" data-state={s} />
                            ))}
                          </span>
                        ) : (
                          <span className="sl-note">not recorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="sl-aside">
        <span className="sl-label">Before you start</span>
        <MethodSummary />
        <p>
          Your entire section is recorded in <strong>one take</strong>. You can
          pause: the text hides and the clock stops while you are away, and you
          cannot go back to a stimulus.
        </p>
        <p>
          <span className="sl-key">Space</span> is the only key, and you press it twice
          per stimulus. Nothing advances on its own.
        </p>
      </aside>
    </div>
  );
}
