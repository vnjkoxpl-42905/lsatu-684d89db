import { useClassroomDestinationAcknowledgment } from '@/hooks/useClassroomDestinationAcknowledgment';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DIAGRAM_ITEMS, FLASHCARDS, GROUPS, GROUP_LABEL, INDICATOR_POOL,
  negateToken, type DiagramItem, type GroupId,
} from "./content";
import { Diagram, Side, Tok } from "./Notation";
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ConditionalSkillActivity } from './ConditionalSkillActivity';
import UnlessDrill from "@/features/quick-drills/unless-drill/UnlessDrill";
import "./conditional-refresher.css";

const TABS = ["Cheat Sheet", "Sort Drills", "Flashcards", "Diagram Drills", "Unless Drill"] as const;
type Tab = (typeof TABS)[number];

const KEY = "lsatu.conditional-refresher.v1";

interface Saved {
  sort?: { done: number; correct: number };
  flash?: Record<string, "again" | "needs" | "got">;
  diagram?: { done: number; correct: number };
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

const TAB_ACTIVITIES = ['', 'sort', 'translate-cards', 'diagram', 'unless'] as const;
export default function ConditionalIndicatorsRefresher() {
  useClassroomDestinationAcknowledgment(true);
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const activity = params.get('activity') ?? '';
  const tabIndex = TAB_ACTIVITIES.indexOf(activity as typeof TAB_ACTIVITIES[number]);
  const groups = (params.get('groups') ?? 'g1,g2,g3,g4').split(',') as GroupId[];
  const stage = params.get('stage') ?? 'translate';
  const review = params.get('review') ?? 'all';
  const validSettings = ['translate', 'contrapositive'].includes(stage) && ['all', 'needs'].includes(review);
  const update = (key: string, value: string) => setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'item') next.delete('item'); return next; });
  const scope = user?.id ?? 'anonymous';
  return <div className="cir-root"><div className="cir-shell">
    <h1 className="cir-title">Conditional indicators</h1>
    <p className="cir-sub">Optional practice. Your work is saved in this browser for this learner.</p>
    <div className="cir-tabs" role="tablist" aria-label="Conditional indicators sections">{TABS.map((tab, index) => <button key={tab} type="button" role="tab" aria-selected={index === tabIndex} className="cir-tab" onClick={() => update('activity', TAB_ACTIVITIES[index])}>{tab}</button>)}</div>
    {tabIndex === 0 && <CheatSheet />}
    {tabIndex > 0 && tabIndex < 4 && <fieldset className="cir-settings"><legend>Practice settings</legend>
      <div className="cir-group-settings">{GROUPS.map(group => <label key={group.id}><input type="checkbox" checked={groups.includes(group.id)} onChange={() => update('groups', groups.includes(group.id) ? groups.filter(id => id !== group.id).join(',') : [...groups, group.id].join(','))} />Group {group.n}</label>)}</div>
      {activity !== 'sort' && <label>Task <select value={stage} onChange={event => update('stage', event.target.value)}><option value="translate">Translate</option><option value="contrapositive">Add the contrapositive</option></select></label>}
      {activity === 'translate-cards' && <label>Review <select value={review} onChange={event => update('review', event.target.value)}><option value="all">All cards</option><option value="needs">Needs practice</option></select></label>}
    </fieldset>}
    {tabIndex > 0 && tabIndex < 4 && validSettings && <ConditionalSkillActivity kind={activity as 'sort' | 'translate-cards' | 'diagram'} groups={groups} stage={stage as 'translate' | 'contrapositive'} review={review as 'all' | 'needs'} storageScope={scope} itemId={params.get('item') ?? undefined} />}
    {(tabIndex < 0 || !validSettings) && <p>This practice link has unavailable settings. Choose a section and valid settings above.</p>}
    {tabIndex === 4 && <UnlessDrill />}
  </div></div>;
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
