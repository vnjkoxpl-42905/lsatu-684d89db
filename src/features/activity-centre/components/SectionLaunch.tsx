import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import {
  readMyRecentSectionGrades,
  type RecentSectionRun,
} from "../api/activitiesClient";
import { ActivityExitButton } from "./ActivityExitButton";
import { renderInlineMarks } from "../prompt-format";
import { clock, signedClock, statsFor, ticksFor } from "../recall/runStats";
import "./section-launch.css";

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
  /**
   * The four beats are `steps` inside ONE briefing section, not the sections.
   *
   * The briefing has six sections and only one of them -- "What you actually
   * do." -- carries the procedure. Rendering `sections` here would put the essay
   * headings in the strip and lose the method entirely.
   */
  const beatSection = useMemo(
    () => instructions.briefing?.sections.find((s) => (s.steps?.length ?? 0) > 0),
    [instructions.briefing],
  );
  const beats = beatSection?.steps ?? [];

  const [beat, setBeat] = useState(0);
  const [pane, setPane] = useState<"beat" | "briefing">("beat");
  const [history, setHistory] = useState<HistoryState>({ kind: "idle" });

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

  /**
   * Arrow-key traversal, which is what makes a tablist a tablist rather than a
   * row of buttons wearing the role.
   */
  const beatRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onBeatKey = useCallback(
    (e: React.KeyboardEvent) => {
      const last = beats.length - 1;
      let next: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = beat === last ? 0 : beat + 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = beat === 0 ? last : beat - 1;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = last;
      if (next === null) return;
      e.preventDefault();
      setBeat(next);
      setPane("beat");
      beatRefs.current[next]?.focus();
    },
    [beat, beats.length],
  );

  const paneRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onPaneKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = pane === "beat" ? "briefing" : "beat";
      setPane(next);
      paneRefs.current[next === "beat" ? 0 : 1]?.focus();
    },
    [pane],
  );

  const briefing = instructions.briefing;
  const current = beats[beat];

  return (
    <div className="sl">
      <div className="sl-sheet">
        <div className="sl-crumbs">
          <span className="sl-label">
            Library / Out Loud / <strong>{title}</strong>
          </span>
          <span className="sl-label sl-meta">
            {sourceSection ? `${sourceSection} · ` : ""}
            {typeof itemCount === "number" ? `${itemCount} stimuli` : ""}
            {timeGoalMinutes ? ` · est ${timeGoalMinutes} min` : ""}
          </span>
        </div>

        <div className="sl-head">
          <div>
            {onExit && (
              <div style={{ marginBottom: 10 }}>
                <ActivityExitButton onExit={onExit} tone="light" />
              </div>
            )}
            <span className="sl-chip">Out loud</span>
            <h2 className="sl-title">{title}</h2>
            {(instructions.tagline || subtitle) && (
              <p className="sl-tagline">
                {instructions.tagline
                  ? renderInlineMarks(instructions.tagline, "sl-tagline")
                  : subtitle}
              </p>
            )}
          </div>
          <div className="sl-cta">
            <button type="button" className="sl-start" onClick={onStart}>
              Start the section
              <ArrowRight size={16} strokeWidth={2.25} style={{ marginLeft: 8 }} />
            </button>
            {briefing && (
              <button
                type="button"
                className="sl-brief"
                onClick={() => {
                  setPane("briefing");
                }}
              >
                Read the full briefing
              </button>
            )}
          </div>
        </div>

        {showHistory && <StatStrip state={history} stats={stats} />}

        {beats.length > 0 && (
          <>
            <div className="sl-mhead">
              <h3>The method</h3>
              <span className="sl-label">Select a beat to read it</span>
            </div>
            <div
              className="sl-beats"
              role="tablist"
              aria-label="The method, beat by beat"
              onKeyDown={onBeatKey}
              style={{ ["--sl-beat-count" as string]: String(beats.length) }}
            >
              {beats.map((step, i) => (
                <button
                  key={i}
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`sl-beat-tab-${i}`}
                  aria-controls="sl-beat-panel"
                  aria-selected={pane === "beat" && beat === i}
                  tabIndex={beat === i ? 0 : -1}
                  className="sl-beat"
                  onClick={() => {
                    setBeat(i);
                    setPane("beat");
                  }}
                >
                  <span className="sl-n">0{i + 1}</span>
                  <span className="sl-l">{renderInlineMarks(step.label, `sl-bl-${i}`)}</span>
                  <span className="sl-d">{renderInlineMarks(step.body, `sl-bd-${i}`)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {briefing && (
          <div className="sl-drawer">
            <div
              className="sl-dr-tabs"
              role="tablist"
              aria-label="Briefing detail"
              onKeyDown={onPaneKey}
            >
              <button
                ref={(el) => {
                  paneRefs.current[0] = el;
                }}
                type="button"
                role="tab"
                id="sl-pane-tab-beat"
                aria-selected={pane === "beat"}
                aria-controls="sl-beat-panel"
                tabIndex={pane === "beat" ? 0 : -1}
                className="sl-dr-tab"
                onClick={() => setPane("beat")}
              >
                This beat
              </button>
              <button
                ref={(el) => {
                  paneRefs.current[1] = el;
                }}
                type="button"
                role="tab"
                id="sl-pane-tab-briefing"
                aria-selected={pane === "briefing"}
                aria-controls="sl-beat-panel"
                tabIndex={pane === "briefing" ? 0 : -1}
                className="sl-dr-tab"
                onClick={() => setPane("briefing")}
              >
                The full briefing
              </button>
              {briefing.closer && (
                <span className="sl-dr-note">
                  {renderInlineMarks(briefing.closer, "sl-closer")}
                </span>
              )}
            </div>

            <div
              className="sl-dr-view"
              id="sl-beat-panel"
              role="tabpanel"
              tabIndex={-1}
              data-pane={pane}
              /*
               * The panel names the tab it is currently showing. Two tablists
               * swap the same region, so without this a screen reader can reach
               * the panel and not be told which of the six tabs it belongs to.
               */
              aria-labelledby={
                pane === "beat"
                  ? `sl-pane-tab-beat sl-beat-tab-${beat}`
                  : "sl-pane-tab-briefing"
              }
            >
              {pane === "beat" && current ? (
                <div>
                  <span className="sl-label">
                    Briefing · beat {beat + 1} of {beats.length}
                  </span>
                  <h3 className="sl-dr-title">
                    {renderInlineMarks(current.label, `sl-dt-${beat}`)}
                  </h3>
                  <p className="sl-dr-body">
                    {renderInlineMarks(current.body, `sl-db-${beat}`)}
                  </p>
                </div>
              ) : (
                <div className="sl-essay">
                  {briefing.lede && <p>{renderInlineMarks(briefing.lede, "sl-lede")}</p>}
                  {briefing.sections.map((section, i) => (
                    <section key={i}>
                      <h4>{renderInlineMarks(section.heading, `sl-h-${i}`)}</h4>
                      {section.body.map((para, j) => (
                        <p key={j}>{renderInlineMarks(para, `sl-p-${i}-${j}`)}</p>
                      ))}
                      {section.steps && (
                        <ol>
                          {section.steps.map((step, j) => (
                            <li key={j}>
                              <strong>
                                {renderInlineMarks(step.label, `sl-sl-${i}-${j}`)}
                              </strong>{" "}
                              {renderInlineMarks(step.body, `sl-sb-${i}-${j}`)}
                            </li>
                          ))}
                        </ol>
                      )}
                      {section.demo && (
                        <ol>
                          {section.demo.beats.map((b, j) => (
                            <li key={j}>
                              <strong>{b.kind}</strong>{" "}
                              {renderInlineMarks(b.text, `sl-demo-${i}-${j}`)}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  ))}
                </div>
              )}
              {/* Only from the essay. On the beat pane it was an action back to
                  where she already was, sitting in an otherwise empty column. */}
              {pane === "briefing" && (
                <div className="sl-dr-side">
                  <button type="button" className="sl-close" onClick={() => setPane("beat")}>
                    Back to the beat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showHistory && <RunHistory state={history} />}
      </div>
    </div>
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
      <div className="sl-stat">
        <span className="sl-label">Recalled</span>
        <span className="sl-sv" data-empty={stats.recalled === null || undefined}>
          {stats.recalled === null ? "not recorded" : stats.recalled}
          {stats.recalledOf !== null && <small>/{stats.recalledOf}</small>}
        </span>
        <span className="sl-sd">
          {stats.recalled === null ? "not recorded" : "stimulus by stimulus"}
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
                  <th>Recalled</th>
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
        <p>
          Everything here is out loud. The whole section records in{" "}
          <strong>one take</strong>, and it never pauses.
        </p>
        <p>
          <span className="sl-key">Space</span> is the only key, and you press it twice
          per stimulus. Nothing advances on its own.
        </p>
      </aside>
    </div>
  );
}
