import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UNLESS_LETTERS, contrapositiveOf, gradeUnless, negateToken, unlessAnswer, unlessParts, unlessStatement,
  type UnlessPattern, type UnlessRound, type UnlessVerdict,
} from "./content";
import { Diagram, Tok } from "./Notation";
import "./conditional-refresher.css";

/* The timed Unless drill. Used as a tab of the Conditional Indicators
   Refresher and as its own assignable page (/unless-drill). The statements are
   the refresher's originals: three of the four unless patterns per round, with
   fresh letters each time. */

const KEY = "lsatu.unless-drill.v1";
const PACES = [
  { ms: 5000, label: "5 seconds" },
  { ms: 10000, label: "10 seconds (warm-up)" },
] as const;
const READY_STEPS = 3;
const READY_STEP_MS = 550;
const BETWEEN_MS = 850;
const WARN_MS = 1500;

interface Saved { pace?: number; rounds?: number; bestPerfectAvg?: number }

function readSaved(): Saved {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Saved; } catch { return {}; }
}
function writeSaved(patch: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readSaved(), ...patch })); } catch { /* storage unavailable */ }
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
  const patterns = shuffle<UnlessPattern>([1, 2, 3, 4]).slice(0, 3);
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
  "not-negated": "You kept the unless idea as written. Group 3 negates it before it goes left.",
  reversed: "Right pieces, wrong direction. The negated unless idea goes on the left.",
  "both-negated": "You negated both ideas. Only the unless idea changes. The other stays as written.",
  other: "Each side needs a different idea: one from each part of the statement.",
};

export default function UnlessDrill() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pace, setPace] = useState<number>(() => readSaved().pace ?? PACES[0].ms);
  const [rounds, setRounds] = useState<UnlessRound[]>([]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<Placed>(EMPTY);
  const [results, setResults] = useState<UnlessResult[]>([]);
  const [remaining, setRemaining] = useState(pace);
  const [ready, setReady] = useState(READY_STEPS);
  const [best, setBest] = useState<number | undefined>(() => readSaved().bestPerfectAvg);

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
    const seconds = timedOut ? pace / 1000 : (performance.now() - startedAt.current) / 1000;
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
    const saved = readSaved();
    const patch: Saved = { rounds: (saved.rounds ?? 0) + 1 };
    if (results.every(r => r.verdict === "correct")) {
      const avg = results.reduce((s, r) => s + r.seconds, 0) / results.length;
      if (saved.bestPerfectAvg === undefined || avg < saved.bestPerfectAvg) {
        patch.bestPerfectAvg = avg;
        setBest(avg);
      }
    }
    writeSaved(patch);
  }, [phase, results]);

  const begin = (set: UnlessRound[]) => {
    setRounds(set);
    setResults([]);
    setIndex(0);
    setPlaced(EMPTY);
    setReady(READY_STEPS);
    setPhase("ready");
  };

  const choosePace = (ms: number) => { setPace(ms); writeSaved({ pace: ms }); };

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
      <section className="cir-card">
        <p className="cir-prompt">Three unless statements. Beat the clock on each one.</p>
        <div className="ud-move">
          <p className="ud-move-title">The Group 3 move</p>
          <ol className="cir-steps">
            <li>Find the idea right after <strong>unless</strong>.</li>
            <li>Negate it.</li>
            <li>Put it on the left of the arrow.</li>
            <li>Keep the other idea exactly as written on the right.</li>
          </ol>
          <div className="ud-example">
            <span className="ud-example-label">Example</span>
            <span className="ud-example-statement"><UnlessText round={{ pattern: 1, x: "A", y: "B" }} /></span>
            <span className="ud-example-row">After unless: <Tok text="B" />. Negate it: <Tok text="/B" />. <Tok text="/A" /> stays as written.</span>
            <span className="ud-example-row"><Diagram left="/B" right="/A" /></span>
            <span className="ud-example-row ud-muted">The contrapositive, <Diagram left="A" right="B" />, also counts.</span>
          </div>
        </div>
        <p className="cir-feedback">
          Tap the idea that goes left, then the idea that goes right. Lock it in as soon as you are sure.
          Your review comes after all three.
        </p>
        <div className="ud-pace" role="radiogroup" aria-label="Time per statement">
          {PACES.map(p => (
            <button key={p.ms} type="button" role="radio" aria-checked={pace === p.ms}
              className="cir-tab" onClick={() => choosePace(p.ms)}>{p.label}</button>
          ))}
        </div>
        <div className="cir-actions"><button type="button" className="cir-btn" onClick={() => begin(buildRound())}>Start round</button></div>
        {best !== undefined && <p className="cir-meta ud-best">Fastest perfect round: {best.toFixed(1)}s per statement</p>}
      </section>
    );
  }

  /* --------------------------------- Ready -------------------------------- */
  if (phase === "ready") {
    return (
      <section className="cir-card ud-stage">
        <p className="cir-meta">Get ready</p>
        <p className="ud-ready" aria-live="assertive">{ready > 0 ? ready : "Go"}</p>
      </section>
    );
  }

  /* -------------------------------- Review -------------------------------- */
  if (phase === "summary") {
    const correct = results.filter(r => r.verdict === "correct").length;
    const avg = results.reduce((s, r) => s + r.seconds, 0) / Math.max(results.length, 1);
    const missed: UnlessRound[] = results
      .filter(r => r.verdict !== "correct")
      .map(({ pattern, x, y }) => ({ pattern, x, y }));
    return (
      <section className="cir-card">
        <p className="cir-prompt">Round review</p>
        <div className="ud-score">
          <div><b>{correct} of {results.length}</b><span>correct</span></div>
          <div><b>{avg.toFixed(1)}s</b><span>average per statement</span></div>
          {best !== undefined && <div><b>{best.toFixed(1)}s</b><span>fastest perfect round</span></div>}
        </div>
        {results.map((r, i) => <ReviewRow key={i} n={i + 1} result={r} />)}
        <div className="cir-actions">
          {missed.length > 0 && (
            <button type="button" className="cir-btn" onClick={() => begin(shuffle(missed))}>
              Retry the {missed.length === 1 ? "one I missed" : `${missed.length} I missed`}
            </button>
          )}
          <button type="button" className={`cir-btn${missed.length ? " ghost" : ""}`} onClick={() => begin(buildRound())}>New round</button>
          <button type="button" className="cir-btn ghost" onClick={() => setPhase("idle")}>Change pace</button>
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
    <section className="cir-card ud-stage">
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
  const ok = result.verdict === "correct";
  return (
    <div className={`cir-summary-row ud-row${ok ? " is-right" : " is-wrong"}`}>
      <div className="cir-summary-meta">
        Statement {n} · {result.timedOut ? "time ran out" : `${result.seconds.toFixed(1)}s`} · {ok ? "correct" : "not correct"}
      </div>
      <p className="ud-row-statement"><UnlessText round={result} /></p>
      <div className="ud-row-grid">
        <span className="ud-row-label">Your diagram</span>
        <span>{result.chosenLeft && result.chosenRight
          ? <Diagram left={result.chosenLeft} right={result.chosenRight} />
          : <em>no answer</em>}</span>
        <span className="ud-row-label">Correct</span>
        <span><Diagram left={answer.left} right={answer.right} /></span>
        <span className="ud-row-label">Also counts</span>
        <span><Diagram left={contra.left} right={contra.right} /> <span className="ud-muted">(contrapositive)</span></span>
      </div>
      {!ok && <p className="ud-why">{VERDICT_TEXT[result.verdict as Exclude<UnlessVerdict, "correct">]}</p>}
      <p className="ud-steps">
        After unless: <Tok text={after} />. Negate it: <Tok text={negateToken(after)} />
        {after.startsWith("/") ? " (the two slashes cancel)" : ""}. That goes left.{" "}
        <Tok text={other} /> stays as written on the right.
      </p>
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
