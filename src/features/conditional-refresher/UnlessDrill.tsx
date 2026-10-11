import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UNLESS_LETTERS,
  contrapositiveOf,
  unlessAnswer,
  unlessStatement,
  type UnlessPattern,
  type UnlessRound,
} from "./content";
import { Diagram, Tok } from "./Notation";
import "./conditional-refresher.css";

export const WINDOW_MS = 5000;

export interface UnlessResult extends UnlessRound {
  statement: string;
  chosenLeft: string | null;
  chosenRight: string | null;
  seconds: number;
}

const STORAGE_KEY = "lsatu.conditional-refresher.v1";

interface SavedState {
  sort?: { done: number; correct: number };
  flash?: Record<string, "again" | "needs" | "got">;
  diagram?: { done: number; correct: number };
  unless?: { rounds: number };
}

export function readUnlessSaved(): SavedState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as SavedState;
  } catch {
    return {};
  }
}

export function writeUnlessSaved(patch: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readUnlessSaved(), ...patch }));
  } catch {
    /* storage unavailable */
  }
}

export function shuffleItems<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRound(): UnlessRound[] {
  const patterns = shuffleItems<UnlessPattern>([1, 2, 3, 4]).slice(0, 3);
  const letters = shuffleItems(UNLESS_LETTERS);
  return shuffleItems(patterns).map((pattern, i) => ({
    pattern,
    x: letters[(i * 2) % letters.length],
    y: letters[(i * 2 + 1) % letters.length],
  }));
}

export interface UnlessDrillProps {
  onRoundComplete?: (results: UnlessResult[]) => void;
  className?: string;
}

export function UnlessDrill({ onRoundComplete, className }: UnlessDrillProps) {
  const [phase, setPhase] = useState<"idle" | "running" | "stop" | "summary">("idle");
  const [rounds, setRounds] = useState<UnlessRound[]>([]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [picked, setPicked] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [results, setResults] = useState<UnlessResult[]>([]);
  const startedAt = useRef(0);
  const pickRef = useRef(picked);
  pickRef.current = picked;

  const commit = useCallback((seconds: number) => {
    setRounds(current => {
      const round = current[index];
      if (round) {
        setResults(r => [...r, {
          ...round,
          statement: unlessStatement(round),
          chosenLeft: pickRef.current.left,
          chosenRight: pickRef.current.right,
          seconds,
        }]);
      }
      return current;
    });
  }, [index]);

  useEffect(() => {
    if (phase !== "running") return;
    startedAt.current = Date.now();
    setElapsed(0);
    const tick = window.setInterval(() => {
      const ms = Date.now() - startedAt.current;
      if (ms >= WINDOW_MS) {
        window.clearInterval(tick);
        setElapsed(WINDOW_MS);
        commit(WINDOW_MS / 1000);
        setPhase("stop");
      } else {
        setElapsed(ms);
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [phase, index, commit]);

  useEffect(() => {
    if (phase !== "stop") return;
    const t = window.setTimeout(() => {
      setPicked({ left: null, right: null });
      if (index + 1 >= rounds.length) {
        setPhase("summary");
      } else {
        setIndex(i => i + 1);
        setPhase("running");
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, index, rounds.length]);

  // When reaching summary, inform parent if callback provided
  useEffect(() => {
    if (phase === "summary" && results.length > 0) {
      onRoundComplete?.(results);
    }
  }, [phase, results, onRoundComplete]);

  const start = () => {
    setRounds(buildRound());
    setResults([]);
    setIndex(0);
    setPicked({ left: null, right: null });
    setPhase("running");
    const saved = readUnlessSaved().unless ?? { rounds: 0 };
    writeUnlessSaved({ unless: { rounds: saved.rounds + 1 } });
  };

  if (phase === "idle") {
    return (
      <section className={`cir-card ${className ?? ""}`.trim()}>
        <p className="cir-prompt">Three unless statements. Five seconds each, no stopping.</p>
        <p className="cir-feedback">
          The arrow is fixed. You only choose which idea goes left and which goes right. Feedback comes after all three.
        </p>
        <div className="cir-actions">
          <button type="button" className="cir-btn" onClick={start}>
            Start round
          </button>
        </div>
      </section>
    );
  }

  if (phase === "summary") {
    return (
      <section className={`cir-card ${className ?? ""}`.trim()}>
        <p className="cir-prompt">Round review</p>
        {results.map((r, i) => {
          const answer = unlessAnswer(r);
          const contra = contrapositiveOf(answer.left, answer.right);
          const ok =
            (r.chosenLeft === answer.left && r.chosenRight === answer.right) ||
            (r.chosenLeft === contra.left && r.chosenRight === contra.right);
          return (
            <div className="cir-summary-row" key={i}>
              <span>
                Statement {i + 1} · {r.seconds.toFixed(1)}s · {ok ? "correct" : "not correct"}
              </span>
              <p style={{ margin: 0 }}>
                Received: <UnlessText round={r} />
              </p>
              <p style={{ margin: 0 }}>
                Your diagram:{" "}
                {r.chosenLeft && r.chosenRight ? (
                  <Diagram left={r.chosenLeft} right={r.chosenRight} />
                ) : (
                  <em>no answer</em>
                )}
              </p>
              <p style={{ margin: 0 }}>
                Correct: <Diagram left={answer.left} right={answer.right} />
              </p>
              <p style={{ margin: 0 }}>
                Contrapositive: <Diagram left={contra.left} right={contra.right} />
              </p>
            </div>
          );
        })}
        <div className="cir-actions">
          <button type="button" className="cir-btn" onClick={start}>
            New round
          </button>
        </div>
      </section>
    );
  }

  const round = rounds[index];
  if (!round) return null;
  const options = [round.x, round.y, `/${round.x}`, `/${round.y}`];
  const seconds = Math.min(elapsed, WINDOW_MS) / 1000;

  return (
    <section className={`cir-card ${className ?? ""}`.trim()}>
      <p className="cir-meta">
        Statement {index + 1} of {rounds.length}
      </p>
      <p className="cir-timer">
        {phase === "stop" ? "STOP" : seconds.toFixed(1)}
        <small>{phase === "stop" ? "next statement" : "GO"}</small>
      </p>
      <p className="cir-statement">
        <UnlessText round={round} />
      </p>
      <div className="cir-build">
        <div className="cir-slot">
          {picked.left ? <Tok text={picked.left} /> : <span className="cir-stack-join">left</span>}
        </div>
        <span className="cir-arrow">&rarr;</span>
        <div className="cir-slot">
          {picked.right ? <Tok text={picked.right} /> : <span className="cir-stack-join">right</span>}
        </div>
      </div>
      <div className="cir-palette">
        {options.map(o => (
          <button
            key={`l-${o}`}
            type="button"
            className="cir-token"
            disabled={phase !== "running"}
            onClick={() => setPicked(p => ({ ...p, left: o }))}
          >
            Left: <Tok text={o} />
          </button>
        ))}
      </div>
      <div className="cir-palette">
        {options.map(o => (
          <button
            key={`r-${o}`}
            type="button"
            className="cir-token"
            disabled={phase !== "running"}
            onClick={() => setPicked(p => ({ ...p, right: o }))}
          >
            Right: <Tok text={o} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function UnlessText({ round }: { round: UnlessRound }) {
  const text = unlessStatement(round);
  const parts = useMemo(() => text.split(/(\/?[A-Z])/).filter(Boolean), [text]);
  return (
    <span>
      {parts.map((p, i) =>
        /^\/?[A-Z]$/.test(p) ? <Tok key={i} text={p} /> : <span key={i}>{p}</span>
      )}
    </span>
  );
}
