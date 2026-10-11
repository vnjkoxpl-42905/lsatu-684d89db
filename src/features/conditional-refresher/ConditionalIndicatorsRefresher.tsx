import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIAGRAM_ITEMS, FLASHCARDS, GROUPS, GROUP_LABEL, INDICATOR_POOL, UNLESS_LETTERS,
  contrapositiveOf, negateToken, unlessAnswer, unlessStatement,
  type DiagramItem, type GroupId, type UnlessPattern, type UnlessRound,
} from "./content";
import { Diagram, Side, Tok } from "./Notation";
import "./conditional-refresher.css";

const TABS = ["Cheat Sheet", "Sort Drills", "Flashcards", "Diagram Drills", "Unless Drill"] as const;
type Tab = (typeof TABS)[number];

const KEY = "lsatu.conditional-refresher.v1";

interface Saved {
  sort?: { done: number; correct: number };
  flash?: Record<string, "again" | "needs" | "got">;
  diagram?: { done: number; correct: number };
  unless?: { rounds: number };
}

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

/* -------------------------------------------------------------------------- */

export default function ConditionalIndicatorsRefresher() {
  const [tab, setTab] = useState<Tab>("Cheat Sheet");
  return (
    <div className="cir-root">
      <div className="cir-shell">
        <h1 className="cir-title">Conditional indicators</h1>
        <p className="cir-sub">Your progress on this page is saved in this browser.</p>
        <div className="cir-tabs" role="tablist" aria-label="Conditional indicators sections">
          {TABS.map(t => (
            <button key={t} type="button" role="tab" aria-selected={tab === t}
              className="cir-tab" onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {tab === "Cheat Sheet" && <CheatSheet />}
        {tab === "Sort Drills" && <SortDrills />}
        {tab === "Flashcards" && <Flashcards />}
        {tab === "Diagram Drills" && <DiagramDrills />}
        {tab === "Unless Drill" && <UnlessDrill />}
      </div>
    </div>
  );
}

/* --------------------------------- Cheat ---------------------------------- */

function CheatSheet() {
  return (
    <section>
      <p className="cir-lead">Review below</p>
      <div className="cir-quadrants">
        {GROUPS.map(g => (
          <article key={g.id} className="cir-quad">
            <div className="cir-quad-n">Group {g.n}</div>
            <h2>{g.title}</h2>
            <div className="cir-words">
              {g.words.map(w => <span key={w} className="cir-word">{w}</span>)}
            </div>
            {g.rule && <p>{g.rule}</p>}
            {g.steps && (
              <ol className="cir-steps">
                {g.steps.map(s => <li key={s}>{s}</li>)}
              </ol>
            )}
            {g.note && <p className="cir-note">{g.note}</p>}
          </article>
        ))}
      </div>
      <div className="cir-legend">
        <div>Negation: <Tok text="/A" /></div>
        <div>And: <Side text="A + B" /></div>
        <div>Or: <Side text="A or B" /></div>
        <div>Conditional: <Diagram left="A" right="/B" /></div>
      </div>
    </section>
  );
}

/* ------------------------------- Sort drills ------------------------------- */

function SortDrills() {
  const [queue, setQueue] = useState(() => shuffle(INDICATOR_POOL));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<GroupId | null>(null);
  const [correct, setCorrect] = useState(0);
  const item = queue[index];
  const finished = index >= queue.length;

  const choose = (group: GroupId) => {
    if (picked) return;
    setPicked(group);
    if (group === item.group) setCorrect(c => c + 1);
    writeSaved({ sort: { done: index + 1, correct: correct + (group === item.group ? 1 : 0) } });
  };
  const next = () => { setPicked(null); setIndex(i => i + 1); };
  const restart = () => { setQueue(shuffle(INDICATOR_POOL)); setIndex(0); setPicked(null); setCorrect(0); };

  return (
    <section className="cir-card">
      <div className="cir-bar" role="progressbar" aria-label="Sort drill progress"
        aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={Math.min(index, queue.length)}>
        <span style={{ width: `${Math.round((Math.min(index, queue.length) / queue.length) * 100)}%` }} />
      </div>
      {finished ? (
        <>
          <p className="cir-prompt">Pool complete.</p>
          <div className="cir-actions"><button type="button" className="cir-btn" onClick={restart}>Run it again</button></div>
        </>
      ) : (
        <>
          <p className="cir-meta">Which group?</p>
          <p className="cir-prompt">{item.word}</p>
          <div className="cir-choices">
            {GROUPS.map(g => {
              const state = !picked ? "" : g.id === item.group ? " is-right" : g.id === picked ? " is-wrong" : "";
              return (
                <button key={g.id} type="button" className={`cir-choice${state}`} disabled={!!picked}
                  onClick={() => choose(g.id)}>{GROUP_LABEL[g.id]}</button>
              );
            })}
          </div>
          {picked && (
            <>
              <p className="cir-feedback">
                {picked === item.group ? "Right." : "Not quite."} <strong>{item.word}</strong> is {GROUP_LABEL[item.group]}.
              </p>
              <div className="cir-actions"><button type="button" className="cir-btn" onClick={next}>Next</button></div>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------- Flashcards -------------------------------- */

function Flashcards() {
  const [queue, setQueue] = useState(() => shuffle(FLASHCARDS));
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const card = queue[index];
  const done = index >= queue.length;

  const rate = (value: "again" | "needs" | "got") => {
    const flash = { ...(readSaved().flash ?? {}), [card.id]: value };
    writeSaved({ flash });
    if (value === "again") setQueue(q => [...q, card]);
    setStep(1);
    setIndex(i => i + 1);
  };

  if (done) {
    return (
      <section className="cir-card">
        <p className="cir-prompt">Deck complete.</p>
        <div className="cir-actions">
          <button type="button" className="cir-btn" onClick={() => { setQueue(shuffle(FLASHCARDS)); setIndex(0); setStep(1); }}>Shuffle again</button>
        </div>
      </section>
    );
  }

  return (
    <section className="cir-card">
      <div className="cir-bar"><span style={{ width: `${Math.round((index / queue.length) * 100)}%` }} /></div>
      <p className="cir-meta">Card {index + 1} of {queue.length}</p>
      <p className="cir-prompt">{card.front}</p>
      <div className="cir-step"><b>Step 1.</b> Translate it — write the diagram out on your paper before you go on.</div>
      {step >= 2 && (
        <div className="cir-step"><b>Step 2.</b> Say the diagram out loud as ordinary English: &ldquo;If &hellip;, then &hellip;&rdquo; using the actual complete ideas and every negative.</div>
      )}
      {step < 3 ? (
        <div className="cir-actions">
          <button type="button" className="cir-btn" onClick={() => setStep(s => (s === 1 ? 2 : 3))}>
            {step === 1 ? "I have the diagram" : "I said it in English"}
          </button>
        </div>
      ) : (
        <>
          <div className="cir-reveal">
            <div className="cir-reveal-row"><span>Conditional</span><p>{card.conditional}</p></div>
            <div className="cir-reveal-row"><span>Contrapositive</span><p>{card.contrapositive}</p></div>
            <div className="cir-reveal-row"><span>In English</span><p>{card.englishConditional}</p></div>
            <div className="cir-reveal-row"><span>Contrapositive in English</span><p>{card.englishContrapositive}</p></div>
            {card.note && <div className="cir-reveal-row"><span>Why</span><p>{card.note}</p></div>}
          </div>
          <div className="cir-actions">
            <button type="button" className="cir-btn ghost" onClick={() => rate("again")}>Again</button>
            <button type="button" className="cir-btn ghost" onClick={() => rate("needs")}>Needs work</button>
            <button type="button" className="cir-btn" onClick={() => rate("got")}>Got it</button>
          </div>
        </>
      )}
    </section>
  );
}

/* ----------------------------- Diagram drills ------------------------------ */

function sideContrapositive(text: string): string {
  if (text.includes(" + ")) return text.split(" + ").map(t => negateToken(t.trim())).join(" or ");
  if (text.includes(" or ")) return text.split(" or ").map(t => negateToken(t.trim())).join(" + ");
  return negateToken(text.trim());
}

function itemContrapositive(item: DiagramItem): { left: string; right: string } {
  return { left: sideContrapositive(item.right), right: sideContrapositive(item.left) };
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export interface DiagramDrillsProps {
  items?: DiagramItem[];
  persistProgress?: boolean;
  allowContrapositive?: boolean;
  allowNegation?: boolean;
  shuffleItems?: boolean;
  explanations?: Record<string, string>;
  embedded?: boolean;
  onResult?: (result: { itemId: string; left: string; right: string; correct: boolean } | null) => void;
  feedbackForResult?: (result: { left: string; right: string; correct: boolean }) => string;
}

export function DiagramDrills({
  items = DIAGRAM_ITEMS,
  persistProgress = true,
  allowContrapositive = true,
  allowNegation = true,
  shuffleItems = true,
  explanations = {},
  embedded = false,
  onResult,
  feedbackForResult,
}: DiagramDrillsProps = {}) {
  const [queue, setQueue] = useState(() => shuffleItems ? shuffle(items) : [...items]);
  const [index, setIndex] = useState(0);
  const [side, setSide] = useState<"left" | "right">("left");
  const [left, setLeft] = useState<string[]>([]);
  const [right, setRight] = useState<string[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const leftButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (checked !== null) retryButton.current?.focus(); }, [checked]);
  const item = queue[index];
  const done = index >= queue.length;

  const reset = useCallback(() => { leftButton.current?.focus(); setLeft([]); setRight([]); setSide("left"); setChecked(null); onResult?.(null); }, [onResult]);
  const push = (token: string) => {
    if (checked !== null) return;
    (side === "left" ? setLeft : setRight)(v => [...v, token]);
  };
  const undo = () => (side === "left" ? setLeft : setRight)(v => v.slice(0, -1));

  const check = () => {
    const mine = { left: norm(left.join(" ")), right: norm(right.join(" ")) };
    const target = { left: norm(item.left), right: norm(item.right) };
    const contra = itemContrapositive(item);
    const ok = (mine.left === target.left && mine.right === target.right)
      || (allowContrapositive && mine.left === norm(contra.left) && mine.right === norm(contra.right));
    setChecked(ok);
    onResult?.({ itemId: item.id, left: mine.left, right: mine.right, correct: ok });
    if (persistProgress) {
      const saved = readSaved().diagram ?? { done: 0, correct: 0 };
      writeSaved({ diagram: { done: saved.done + 1, correct: saved.correct + (ok ? 1 : 0) } });
    }
  };

  if (done) {
    return (
      <section className="cir-card">
        <p className="cir-prompt">All diagram drills done.</p>
        <div className="cir-actions">
          <button type="button" className="cir-btn" onClick={() => { setQueue(shuffleItems ? shuffle(items) : [...items]); setIndex(0); reset(); }}>{shuffleItems ? "Shuffle again" : "Practice again"}</button>
        </div>
      </section>
    );
  }

  const contra = itemContrapositive(item);
  return (
    <section className="cir-card">
      {!embedded && <><div className="cir-bar"><span style={{ width: `${Math.round((index / queue.length) * 100)}%` }} /></div>
      <p className="cir-meta">Statement {index + 1} of {queue.length}. {allowContrapositive ? "Diagram it. Contrapositives count." : "Build the original diagram."}</p></>}
      <p className="cir-prompt">{item.prompt}</p>

      <div className="cir-build">
        <div className={`cir-slot${side === "left" ? " active" : ""}`} onClick={() => checked === null && setSide("left")}>
          {left.length ? left.map((t, i) => <Tok key={`${t}-${i}`} text={t} />) : <span className="cir-stack-join">left</span>}
        </div>
        <span className="cir-arrow">&rarr;</span>
        <div className={`cir-slot${side === "right" ? " active" : ""}`} onClick={() => checked === null && setSide("right")}>
          {right.length ? right.map((t, i) => <Tok key={`${t}-${i}`} text={t} />) : <span className="cir-stack-join">right</span>}
        </div>
      </div>

      <div className="cir-side-toggle">
        <button ref={leftButton} type="button" aria-pressed={side === "left"} className={`cir-btn ${side === "left" ? "" : "ghost"}`} onClick={() => setSide("left")}>{embedded ? 'Choose the left condition' : 'Building left'}</button>
        <button type="button" aria-pressed={side === "right"} className={`cir-btn ${side === "right" ? "" : "ghost"}`} onClick={() => setSide("right")}>{embedded ? 'Choose the right condition' : 'Building right'}</button>
      </div>

      <div className="cir-palette">
        {item.names.flatMap(name => allowNegation ? [name, `/${name}`] : [name]).map(token => (
          <button key={token} type="button" className="cir-token" aria-label={token.startsWith("/") ? `Not ${token.slice(1)}` : token} disabled={checked !== null} onClick={() => push(token)}><Tok text={token} /></button>
        ))}
        {(item.connectors ?? []).map(c => (
          <button key={c} type="button" className="cir-token" onClick={() => push(c)}>{c}</button>
        ))}
        <button type="button" className="cir-token" onClick={undo} disabled={checked !== null}>Undo</button>
      </div>

      <div className="cir-actions">
        {checked === null ? (
          <button type="button" className="cir-btn" disabled={!left.length || !right.length} onClick={check}>{embedded ? 'Check answer' : 'Check'}</button>
        ) : (
          <>
            <button ref={retryButton} type="button" className="cir-btn ghost" onClick={reset}>Try again</button>
            {!embedded && <button type="button" className="cir-btn" onClick={() => { setIndex(i => i + 1); reset(); }}>Next</button>}
          </>
        )}
      </div>

      <div className={checked !== null ? "cir-feedback" : undefined} role="status" aria-atomic="true">
        {checked !== null && <>
          {!embedded && <p>{checked ? "Right." : "Not quite."}</p>}
          {feedbackForResult && <p>{feedbackForResult({ left: norm(left.join(' ')), right: norm(right.join(' ')), correct: checked })}</p>}
          <p>Conditional: <Diagram left={item.left} right={item.right} /></p>
          {explanations[item.id] && <p>{explanations[item.id]}</p>}
          {allowContrapositive && <p>Contrapositive: <Diagram left={contra.left} right={contra.right} /></p>}
        </>}
      </div>
    </section>
  );
}

/* ------------------------------ Unless drill ------------------------------- */

const WINDOW_MS = 5000;

interface UnlessResult extends UnlessRound {
  statement: string;
  chosenLeft: string | null;
  chosenRight: string | null;
  seconds: number;
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

function UnlessDrill() {
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
          ...round, statement: unlessStatement(round),
          chosenLeft: pickRef.current.left, chosenRight: pickRef.current.right, seconds,
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
      } else setElapsed(ms);
    }, 50);
    return () => window.clearInterval(tick);
  }, [phase, index, commit]);

  useEffect(() => {
    if (phase !== "stop") return;
    const t = window.setTimeout(() => {
      setPicked({ left: null, right: null });
      if (index + 1 >= rounds.length) setPhase("summary");
      else { setIndex(i => i + 1); setPhase("running"); }
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, index, rounds.length]);

  const start = () => {
    setRounds(buildRound());
    setResults([]);
    setIndex(0);
    setPicked({ left: null, right: null });
    setPhase("running");
    const saved = readSaved().unless ?? { rounds: 0 };
    writeSaved({ unless: { rounds: saved.rounds + 1 } });
  };

  if (phase === "idle") {
    return (
      <section className="cir-card">
        <p className="cir-prompt">Three unless statements. Five seconds each, no stopping.</p>
        <p className="cir-feedback">The arrow is fixed. You only choose which idea goes left and which goes right. Feedback comes after all three.</p>
        <div className="cir-actions"><button type="button" className="cir-btn" onClick={start}>Start round</button></div>
      </section>
    );
  }

  if (phase === "summary") {
    return (
      <section className="cir-card">
        <p className="cir-prompt">Round review</p>
        {results.map((r, i) => {
          const answer = unlessAnswer(r);
          const contra = contrapositiveOf(answer.left, answer.right);
          const ok = (r.chosenLeft === answer.left && r.chosenRight === answer.right)
            || (r.chosenLeft === contra.left && r.chosenRight === contra.right);
          return (
            <div className="cir-summary-row" key={i}>
              <span>Statement {i + 1} · {r.seconds.toFixed(1)}s · {ok ? "correct" : "not correct"}</span>
              <p style={{ margin: 0 }}>Received: <UnlessText round={r} /></p>
              <p style={{ margin: 0 }}>Your diagram: {r.chosenLeft && r.chosenRight
                ? <Diagram left={r.chosenLeft} right={r.chosenRight} />
                : <em>no answer</em>}</p>
              <p style={{ margin: 0 }}>Correct: <Diagram left={answer.left} right={answer.right} /></p>
              <p style={{ margin: 0 }}>Contrapositive: <Diagram left={contra.left} right={contra.right} /></p>
            </div>
          );
        })}
        <div className="cir-actions"><button type="button" className="cir-btn" onClick={start}>New round</button></div>
      </section>
    );
  }

  const round = rounds[index];
  const options = [round.x, round.y, `/${round.x}`, `/${round.y}`];
  const seconds = Math.min(elapsed, WINDOW_MS) / 1000;

  return (
    <section className="cir-card">
      <p className="cir-meta">Statement {index + 1} of {rounds.length}</p>
      <p className="cir-timer">
        {phase === "stop" ? "STOP" : seconds.toFixed(1)}
        <small>{phase === "stop" ? "next statement" : "GO"}</small>
      </p>
      <p className="cir-statement"><UnlessText round={round} /></p>
      <div className="cir-build">
        <div className="cir-slot">{picked.left ? <Tok text={picked.left} /> : <span className="cir-stack-join">left</span>}</div>
        <span className="cir-arrow">&rarr;</span>
        <div className="cir-slot">{picked.right ? <Tok text={picked.right} /> : <span className="cir-stack-join">right</span>}</div>
      </div>
      <div className="cir-palette">
        {options.map(o => (
          <button key={`l-${o}`} type="button" className="cir-token" disabled={phase !== "running"}
            onClick={() => setPicked(p => ({ ...p, left: o }))}>Left: <Tok text={o} /></button>
        ))}
      </div>
      <div className="cir-palette">
        {options.map(o => (
          <button key={`r-${o}`} type="button" className="cir-token" disabled={phase !== "running"}
            onClick={() => setPicked(p => ({ ...p, right: o }))}>Right: <Tok text={o} /></button>
        ))}
      </div>
    </section>
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
