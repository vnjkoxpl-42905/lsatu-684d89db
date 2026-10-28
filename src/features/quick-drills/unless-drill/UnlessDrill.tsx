import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UNLESS_LETTERS, contrapositiveOf, gradeUnless, negateToken, unlessAnswer, unlessParts, unlessStatement,
  type UnlessPattern, type UnlessRound, type UnlessVerdict,
} from "@/features/conditional-refresher/content";
import { Diagram, Tok } from "@/features/conditional-refresher/Notation";
import { useUnlessMilestones } from "./unlessProgress";
import { useAuth } from '@/contexts/AuthContext';
import { unlessLockTiming } from './unlessTiming';
import { UnlessRoundResults, unlessOutcome } from './UnlessRoundResults';
import { ResultBadge } from '@/features/conditional-feedback/ConditionalResults';
import "@/features/conditional-refresher/conditional-refresher.css";

/* The timed Unless drill. Used as a tab of the Conditional Indicators
   Refresher and as its own assignable page (/unless-drill). The statements are
   Joshua's four unless patterns, all four every round in a new order, with
   fresh letters each time. */

const KEY = "lsatu.unless-drill.v1";
// Students start at 10 seconds. A full round at 100% accuracy at 10 seconds
// unlocks 5; the same at 5 seconds clears the drill. Both are saved to the account.
const SLOW_MS = 10000;
const FAST_MS = 5000;
const READY_STEPS = 3;
const READY_STEP_MS = 550;
const BETWEEN_MS = 850;
const WARN_MS = 1500;

interface Saved { pace?: number; rounds?: number; bestPerfectAvg?: number }

function readSaved(key = KEY): Saved {
  try { return JSON.parse(localStorage.getItem(key) || "{}") as Saved; } catch { return {}; }
}
function writeSaved(patch: Saved, key = KEY) {
  try { localStorage.setItem(key, JSON.stringify({ ...readSaved(key), ...patch })); } catch { /* storage unavailable */ }
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(): UnlessRound[] {
  const patterns = shuffle<UnlessPattern>([1, 2, 3, 4]);
  const letters = shuffle(UNLESS_LETTERS);
  return shuffle(patterns).map((pattern, i) => ({
    pattern,
    x: letters[(i * 2) % letters.length],
    y: letters[(i * 2 + 1) % letters.length],
  }));
}

interface UnlessResult extends UnlessRound {
  chosenLeft: string | null;
  chosenRight: string | null;
  seconds: number;
  timedOut: boolean;
  verdict: UnlessVerdict;
}

type Phase = "idle" | "ready" | "running" | "between" | "summary";
type Placed = { left: string | null; right: string | null };
const EMPTY: Placed = { left: null, right: null };

const VERDICT_TEXT: Record<Exclude<UnlessVerdict, "correct">, string> = {
  "no-answer": "Time ran out before both sides were filled.",
  "kept-both": "You left both ideas as written. Choose one, negate it and put it on the left.",
  reversed: "Right pieces, wrong direction. The idea you negated goes on the left.",
  "changed-unless": "You negated both ideas. Negate only one. The other goes on the right exactly as written.",
  other: "Each side needs a different idea: one from each part of the statement.",
};

export default function UnlessDrill({ edition = 'legacy' }: { edition?: string } = {}) {
  const { user } = useAuth();
  return <UnlessRun key={`${user?.id ?? 'anonymous'}:${edition}`} actor={user?.id ?? 'anonymous'} edition={edition}/>;
}
function UnlessRun({ actor, edition }: { actor: string; edition: string }) {
  const deviceKey = `${KEY}:v2:${actor}:${edition}`;
  const [phase, setPhase] = useState<Phase>("idle");
  const { milestones, loading: milestonesLoading, record, pending, error: saveError, retry } = useUnlessMilestones(edition);
  const fastUnlocked = milestones.has("cleared-10s");
  const cleared = milestones.has("cleared-5s");
  const [chosenPace, setPace] = useState<number>(() => readSaved(deviceKey).pace ?? SLOW_MS);
  // A remembered 5-second choice only applies once the account has unlocked it.
  const pace = fastUnlocked ? chosenPace : SLOW_MS;
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [rounds, setRounds] = useState<UnlessRound[]>([]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<Placed>(EMPTY);
  const [results, setResults] = useState<UnlessResult[]>([]);
  const reviewTargets = useRef<(HTMLDivElement | null)[]>([]);
  const [remaining, setRemaining] = useState(pace);
  const [ready, setReady] = useState(READY_STEPS);
  const [best, setBest] = useState<number | undefined>(() => readSaved(deviceKey).bestPerfectAvg);

  // The clock reads these through refs so one animation loop serves the whole
  // statement and the result is recorded exactly once.
  const roundsRef = useRef(rounds);
  roundsRef.current = rounds;
  const indexRef = useRef(index);
  indexRef.current = index;
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const startedAt = useRef(0);
  const settled = useRef(false);

  const settle = useCallback((timedOut: boolean) => {
    if (settled.current) return;
    settled.current = true;
    const round = roundsRef.current[indexRef.current];
    if (!round) return;
    const { left, right } = placedRef.current;
    const timing = unlessLockTiming(startedAt.current, performance.now(), pace, timedOut);
    timedOut = timing.timedOut;
    const seconds = timing.seconds;
    setResults(r => [...r, {
      ...round, chosenLeft: left, chosenRight: right, seconds, timedOut,
      verdict: gradeUnless(round, left, right),
    }]);
    setPhase("between");
  }, [pace]);

  // Get-ready count before the first statement.
  useEffect(() => {
    if (phase !== "ready") return;
    const t = window.setTimeout(() => {
      if (ready <= 0) setPhase("running");
      else setReady(n => n - 1);
    }, READY_STEP_MS);
    return () => window.clearTimeout(t);
  }, [phase, ready]);

  // The clock for one statement.
  useEffect(() => {
    if (phase !== "running") return;
    settled.current = false;
    startedAt.current = performance.now();
    setRemaining(pace);
    let frame = 0;
    const loop = () => {
      const left = pace - (performance.now() - startedAt.current);
      if (left <= 0) { setRemaining(0); settle(true); return; }
      setRemaining(left);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, index, pace, settle]);

  // Short pause on the result, then the next statement or the review.
  useEffect(() => {
    if (phase !== "between") return;
    const t = window.setTimeout(() => {
      setPlaced(EMPTY);
      if (indexRef.current + 1 >= roundsRef.current.length) setPhase("summary");
      else { setIndex(i => i + 1); setPhase("running"); }
    }, BETWEEN_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Record the round once the review opens (once, even under StrictMode).
  const recorded = useRef<UnlessResult[] | null>(null);
  useEffect(() => {
    if (phase !== "summary" || !results.length || recorded.current === results) return;
    recorded.current = results;
    const saved = readSaved(deviceKey);
    const patch: Saved = { rounds: (saved.rounds ?? 0) + 1 };
    const perfect = results.every(r => r.verdict === "correct" && !r.timedOut);
    // Only a full round of all four counts toward the unlock, not a retry of misses.
    if (perfect && results.length === 4) {
      if (pace === SLOW_MS && !fastUnlocked) { void record("cleared-10s").then(saved => { if (saved) setJustUnlocked(true); }); }
      if (pace === FAST_MS && !cleared) { void record("cleared-5s").then(saved => { if (saved) setJustCleared(true); }); }
    }
    if (perfect) {
      const avg = results.reduce((s, r) => s + r.seconds, 0) / results.length;
      if (saved.bestPerfectAvg === undefined || avg < saved.bestPerfectAvg) {
        patch.bestPerfectAvg = avg;
        setBest(avg);
      }
    }
    writeSaved(patch, deviceKey);
  }, [phase, results, pace, fastUnlocked, cleared, record, deviceKey]);

  const begin = (set: UnlessRound[]) => {
    setRounds(set);
    setResults([]);
    setIndex(0);
    setPlaced(EMPTY);
    setReady(READY_STEPS);
    setJustUnlocked(false);
    setJustCleared(false);
    setPhase("ready");
  };

  const choosePace = (ms: number) => { setPace(ms); writeSaved({ pace: ms }, deviceKey); };
  const savingNotice = <>{pending && <p role="status">Saving your round unlock…</p>}{saveError && <p role="alert">{saveError} <button type="button" className="cir-btn" onClick={() => void retry()}>Retry saving</button></p>}</>;

  const place = useCallback((token: string) => {
    setPlaced(p => (!p.left ? { ...p, left: token } : !p.right ? { ...p, right: token } : p));
  }, []);
  const clearLast = useCallback(() => {
    setPlaced(p => (p.right ? { ...p, right: null } : { ...p, left: null }));
  }, []);

  const round = rounds[index];
  const options = useMemo(
    () => (round ? [round.x, round.y, `/${round.x}`, `/${round.y}`] : []),
    [round],
  );

  // Keys: 1-4 place a token, Backspace takes the last one back, Enter locks in.
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) { place(options[n - 1]); e.preventDefault(); }
      else if (e.key === "Backspace") { clearLast(); e.preventDefault(); }
      else if (e.key === "Enter" && placedRef.current.left && placedRef.current.right) { settle(false); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, options, place, clearLast, settle]);

  /* --------------------------------- Idle --------------------------------- */
  if (phase === "idle") {
    return (
      <section className="cir-card ud-native">
        {savingNotice}
        <p className="cir-prompt">Four unless statements. Beat the clock on each one.</p>
        <div className="ud-move">
          <p className="ud-move-title">The Group 3 move</p>
          <ol className="cir-steps">
            <li>Choose either idea.</li>
            <li>Negate it.</li>
            <li>Put it on the left.</li>
            <li>Take the other idea and put it on the right, exactly as written.</li>
          </ol>
        </div>
        <DrillPreview />
        <p className="cir-feedback">
          Tap the idea that goes left, then the idea that goes right. Lock it in as soon as you are sure.
          Your review comes after all four.
        </p>
        <div className="ud-pace" role="radiogroup" aria-label="Time per statement">
          <button type="button" role="radio" aria-checked={pace === SLOW_MS}
            className="cir-tab" onClick={() => choosePace(SLOW_MS)}>10 seconds</button>
          <button type="button" role="radio" aria-checked={pace === FAST_MS} disabled={!fastUnlocked}
            className="cir-tab" onClick={() => choosePace(FAST_MS)}>
            {fastUnlocked ? "5 seconds" : "5 seconds (locked)"}
          </button>
        </div>
        <p className="cir-meta ud-unlock-note">
          {milestonesLoading ? "\u00a0"
            : cleared ? "Cleared at 5 seconds. Keep it as your warm-up."
            : fastUnlocked ? "Next: all four right at 5 seconds to clear the drill."
            : "Clear 10 seconds first: all four right in one round. That unlocks 5 seconds."}
        </p>
        <p className="ud-instruction">
          Start every LSAT study session with this quick workout until you can diagram Unless accurately in under 5 seconds.
        </p>
        <div className="cir-actions"><button type="button" className="cir-btn" disabled={milestonesLoading || pending} onClick={() => begin(buildRound())}>Start round</button></div>
        {best !== undefined && <p className="cir-meta ud-best">Fastest perfect round: {best.toFixed(1)}s per statement</p>}
      </section>
    );
  }

  /* --------------------------------- Ready -------------------------------- */
  if (phase === "ready") {
    return (
      <section className="cir-card ud-stage ud-native">
        <p className="cir-meta">Get ready</p>
        <p className="ud-ready" aria-live="assertive">{ready > 0 ? ready : "Go"}</p>
      </section>
    );
  }

  /* -------------------------------- Review -------------------------------- */
  if (phase === "summary") {
    const correct = results.filter(r => r.verdict === "correct" && !r.timedOut).length;
    const avg = results.reduce((s, r) => s + r.seconds, 0) / Math.max(results.length, 1);
    const missed: UnlessRound[] = results
      .filter(r => r.verdict !== "correct" || r.timedOut)
      .map(({ pattern, x, y }) => ({ pattern, x, y }));
    return (
      <section className="cir-card ud-native">
        {savingNotice}
        <p className="cir-prompt">Round review</p>
        {justUnlocked && (
          <p className="ud-goal">All four right at 10 seconds. 5 seconds is unlocked.</p>
        )}
        {justCleared && (
          <p className="ud-goal">Drill cleared: all four right at 5 seconds.</p>
        )}
        {!justCleared && pace === FAST_MS && results.length === 4 && correct === results.length && (
          <p className="ud-goal">You hit the goal: all four accurate, each under 5 seconds.</p>
        )}
        <div className="ud-score">
          <div><b>{correct} of {results.length}</b><span>correct</span></div>
          <div><b>{avg.toFixed(1)}s</b><span>average per statement</span></div>
          {best !== undefined && <div><b>{best.toFixed(1)}s</b><span>fastest perfect round</span></div>}
        </div>
        <UnlessRoundResults results={results} paceSeconds={pace / 1000} onSelect={index => { const target = reviewTargets.current[index]; if (target) { target.focus(); target.scrollIntoView?.({ block: 'nearest', behavior: 'auto' }); } }}/>
        {results.map((r, i) => <div key={i} className="ud-review-target" tabIndex={-1} ref={element => { reviewTargets.current[i] = element; }}><ReviewRow n={i + 1} result={r} /></div>)}
        <div className="cir-actions">
          {missed.length > 0 && (
            <button type="button" className="cir-btn" onClick={() => begin(shuffle(missed))}>
              Retry the {missed.length === 1 ? "one I missed" : `${missed.length} I missed`}
            </button>
          )}
          <button type="button" className={`cir-btn${missed.length ? " ghost" : ""}`} onClick={() => begin(buildRound())}>New round</button>
          {justUnlocked ? (
            <button type="button" className="cir-btn" onClick={() => { choosePace(FAST_MS); begin(buildRound()); }}>Try 5 seconds</button>
          ) : (
            <button type="button" className="cir-btn ghost" onClick={() => setPhase("idle")}>Change pace</button>
          )}
        </div>
      </section>
    );
  }

  /* --------------------------- Running / between -------------------------- */
  const last = results[results.length - 1];
  const live = phase === "running";
  const fraction = Math.max(0, Math.min(1, remaining / pace));
  const warn = live && remaining <= WARN_MS;
  const canLock = live && !!placed.left && !!placed.right;

  return (
    <section className="cir-card ud-stage ud-native">
      <div className="ud-head">
        <span className="cir-meta">Statement {index + 1} of {rounds.length}</span>
        <span className={`ud-count${warn ? " is-warn" : ""}`} aria-hidden="true">
          {live ? (remaining / 1000).toFixed(1) : last?.timedOut ? "Time" : "Locked"}
        </span>
      </div>
      <div className={`ud-clock${warn ? " is-warn" : ""}`} role="timer" aria-label="Time left">
        <span style={{ transform: `scaleX(${live ? fraction : last?.timedOut ? 0 : fraction})` }} />
      </div>

      <p className="cir-statement">{round && <UnlessText round={round} />}</p>

      <div className="cir-build ud-build">
        <button type="button" className="cir-slot ud-slot" disabled={!live || !placed.left}
          aria-label={placed.left ? `Left side ${placed.left}, tap to clear` : "Left side, empty"}
          onClick={() => setPlaced(p => ({ ...p, left: null }))}>
          {placed.left ? <Tok text={placed.left} /> : <span className="cir-stack-join">left</span>}
        </button>
        <span className="cir-arrow">&rarr;</span>
        <button type="button" className="cir-slot ud-slot" disabled={!live || !placed.right}
          aria-label={placed.right ? `Right side ${placed.right}, tap to clear` : "Right side, empty"}
          onClick={() => setPlaced(p => ({ ...p, right: null }))}>
          {placed.right ? <Tok text={placed.right} /> : <span className="cir-stack-join">right</span>}
        </button>
      </div>

      <div className="ud-tokens">
        {options.map((o, i) => (
          <button key={o} type="button" className="cir-token ud-token" disabled={!live || (!!placed.left && !!placed.right)}
            onClick={() => place(o)}>
            <Tok text={o} /><kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>

      <div className="cir-actions ud-lock">
        <button type="button" className="cir-btn" disabled={!canLock} onClick={() => settle(false)}>Lock in</button>
      </div>
      <p className="cir-meta ud-hint">Tap a side to clear it. Keys: 1 to 4 place, Backspace undoes, Enter locks in.</p>
    </section>
  );
}

function ReviewRow({ n, result }: { n: number; result: UnlessResult }) {
  const answer = unlessAnswer(result);
  const contra = contrapositiveOf(answer.left, answer.right);
  const { after, other } = unlessParts(result);
  const ok = result.verdict === "correct" && !result.timedOut;
  return (
    <div className={`cir-summary-row ud-row${ok ? " is-right" : " is-wrong"}`}>
      <div className="cir-summary-meta ud-row-meta">
        <ResultBadge {...unlessOutcome(result)}/>
        <span>Statement {n} · {result.timedOut ? "time ran out" : `${result.seconds.toFixed(1)}s`}</span>
      </div>
      <p className="ud-row-statement"><UnlessText round={result} /></p>
      <div className="ud-row-grid">
        <span className="ud-row-label">Your diagram</span>
        <span>{result.chosenLeft && result.chosenRight
          ? <Diagram left={result.chosenLeft} right={result.chosenRight} />
          : <em>no answer</em>}</span>
        {ok ? (
          <>
            <span className="ud-row-label">Contrapositive</span>
            <span>{result.chosenLeft === answer.left
              ? <Diagram left={contra.left} right={contra.right} />
              : <Diagram left={answer.left} right={answer.right} />}</span>
          </>
        ) : (
          <>
            <span className="ud-row-label">Correct</span>
            <span><Diagram left={answer.left} right={answer.right} /></span>
            <span className="ud-row-label">Also correct</span>
            <span><Diagram left={contra.left} right={contra.right} /> <span className="ud-muted">(contrapositive)</span></span>
          </>
        )}
      </div>
      {!ok && (
        <>
          <p className="ud-why">{result.timedOut ? 'Time ran out before you locked in. Filled boxes do not count as a timed success.' : VERDICT_TEXT[result.verdict as Exclude<UnlessVerdict, "correct">]}</p>
          <p className="ud-steps">
            Choose <Tok text={other} />. Negate it: <Tok text={negateToken(other)} />
            {other.startsWith("/") ? " (the two slashes cancel)" : ""}. That goes left.{" "}
            <Tok text={after} /> goes right, exactly as written.
          </p>
        </>
      )}
    </div>
  );
}

function UnlessText({ round }: { round: UnlessRound }) {
  const text = unlessStatement(round);
  const parts = useMemo(() => text.split(/(\/?[A-Z])/).filter(Boolean), [text]);
  return (
    <span>
      {parts.map((p, i) => (/^\/?[A-Z]$/.test(p) ? <Tok key={i} text={p} /> : <span key={i}>{p}</span>))}
    </span>
  );
}

/* A looping preview of one statement, played on the real drill furniture. */
const PREVIEW = { pattern: 1 as const, x: "K", y: "M" }; // /K, unless M.  ->  K -> M
const PREVIEW_LOOP_MS = 7000;
const PREVIEW_BEATS = [
  { at: 0, caption: "The statement appears and the clock starts." },
  { at: 1400, caption: "Choose an idea and negate it: /K becomes K. Tap it for the left." },
  { at: 2900, caption: "Tap the other idea, M, for the right. It stays exactly as written." },
  { at: 4300, caption: "Lock it in." },
  { at: 4900, caption: "Correct. Your review shows every statement after the round." },
];

function DrillPreview() {
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setT(PREVIEW_BEATS[4].at); setPlaying(false); setPlayed(true); return; }
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed >= PREVIEW_LOOP_MS) { setPlaying(false); setPlayed(true); return; }
      setT(elapsed);
    }, 80);
    return () => window.clearInterval(id);
  }, [playing, reduced]);
  const play = () => { setT(0); setPlayed(false); setPlaying(true); };

  const beat = PREVIEW_BEATS.reduce((b, x, i) => (t >= x.at ? i : b), 0);
  const left = beat >= 1 ? "K" : null;
  const right = beat >= 2 ? "M" : null;
  const pressed = beat === 1 ? "K" : beat === 2 ? "M" : null;
  const locked = beat >= 3;
  const remaining = Math.max(0, SLOW_MS - Math.min(t, PREVIEW_BEATS[3].at));
  const fraction = remaining / SLOW_MS;

  return (
    <div className="ud-preview">
      <div className="ud-preview-frame">
      <span className="ud-preview-label">Preview</span>
      <div className="ud-preview-screen" aria-hidden="true">
        <div className="ud-head">
          <span className="cir-meta">Statement 1 of 4</span>
          <span className="ud-count">{locked ? "Locked" : (remaining / 1000).toFixed(1)}</span>
        </div>
        <div className="ud-clock"><span style={{ transform: `scaleX(${fraction})` }} /></div>
        <p className="cir-statement"><UnlessText round={PREVIEW} /></p>
        <div className="cir-build ud-build">
          <span className="cir-slot ud-slot">{left ? <Tok text={left} /> : <span className="cir-stack-join">left</span>}</span>
          <span className="cir-arrow">&rarr;</span>
          <span className="cir-slot ud-slot">{right ? <Tok text={right} /> : <span className="cir-stack-join">right</span>}</span>
        </div>
        <div className="ud-tokens">
          {["K", "M", "/K", "/M"].map(o => (
            <span key={o} className={`cir-token ud-token${pressed === o ? " is-pressed" : ""}`}><Tok text={o} /></span>
          ))}
        </div>
        <div className="cir-actions ud-lock">
          {beat >= 4
            ? <span className="ud-preview-result">Correct: <Diagram left="K" right="M" /></span>
            : <span className={`cir-btn${beat === 3 ? " is-pressed" : ""}`}>Lock in</span>}
        </div>
      </div>
      {!playing && (
        <button type="button" className="ud-play" onClick={play}
          aria-label={played ? "Replay the preview" : "Play a preview of the drill"}>
          <span className="ud-play-icon" aria-hidden="true">{played ? "\u21BB" : "\u25B6"}</span>
          <span>{played ? "Replay preview" : "Watch a preview"}</span>
        </button>
      )}
      </div>
      <p className="ud-preview-caption" aria-live="off">
        {playing || played ? PREVIEW_BEATS[beat].caption : "See one statement played through before you start."}
      </p>
    </div>
  );
}
