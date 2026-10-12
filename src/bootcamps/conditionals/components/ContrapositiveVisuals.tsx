import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Play, RotateCcw, X, Zap, ZapOff } from 'lucide-react';
import './contrapositive-visuals.css';

/** True once the element has scrolled into view. Without IntersectionObserver (old browsers, tests) it is true straight away. */
function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setInView(true); observer.disconnect(); } }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** An idea shown as false: struck through from its top left corner to its bottom right, with a hidden "not" for screen readers. */
export function Neg({ children }: { children: ReactNode }) {
  return <span className="ct-neg"><span className="ct-sr">not </span>{children}</span>;
}

/** Plain text where a leading ~ on a letter code (like ~W or ~B) is drawn as the struck idea instead of a squiggle. */
export function Notation({ text }: { text: string }) {
  return <>{text.split(/(~[A-Za-z]+)/g).map((part, index) => part.startsWith('~') ? <Neg key={index}>{part.slice(1)}</Neg> : part)}</>;
}

/** A word that punches the screen once, when it scrolls into view, then keeps a steady glow. */
export function PunchWord({ children }: { children: ReactNode }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  return <span ref={ref} className="ct-punch" data-in-view={inView}>{children}</span>;
}

/** A key term that keeps breathing: a glowing highlight that swells and settles for as long as the page is open. */
export function PulseWord({ children }: { children: ReactNode }) {
  return <span className="ct-pulse-word">{children}</span>;
}

type Tone = 'amber' | 'teal';

/** One rule as two coloured ideas joined by a flowing arrow. Colour follows the idea, so it stays with it when the sides swap. */
export function ArrowRule({ left, right, leftNot, rightNot, tones = ['amber', 'teal'] }: { left: string; right: string; leftNot?: boolean; rightNot?: boolean; tones?: [Tone, Tone] }) {
  const pill = (text: string, negated: boolean | undefined, tone: Tone) => <span className="ct-pill" data-tone={tone} data-not={!!negated}>{negated && <span className="ct-sr">not </span>}{text}</span>;
  return <div className="ct-arrow-rule" role="img" aria-label={`${leftNot ? 'not ' : ''}${left} implies ${rightNot ? 'not ' : ''}${right}`}>
    {pill(left, leftNot, tones[0])}
    <svg className="ct-flow" viewBox="0 0 90 20" aria-hidden="true"><path className="ct-flow-line" d="M4 10h70"/><path className="ct-flow-head" d="M66 3l16 7-16 7"/></svg>
    {pill(right, rightNot, tones[1])}
  </div>;
}

/** Two sides of one rule, with a pulsing "same rule" badge between them. */
export function TwinRules({ original, contrapositive }: { original: ReactNode; contrapositive: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return <div className="ct-twin-frame"><div ref={ref} className="ct-twin" data-in-view={inView}>
    <div className="ct-twin-side"><p className="ct-twin-label" data-kind="original">Original</p>{original}</div>
    <div className="ct-equals" aria-label="These say the same thing"><span aria-hidden="true">=</span><small>same rule</small></div>
    <div className="ct-twin-side"><p className="ct-twin-label" data-kind="contrapositive">Contrapositive</p>{contrapositive}</div>
  </div></div>;
}

type World = { key: string; light: boolean; power: boolean; allowed: boolean; reason: string };

const worlds: World[] = [
  { key: 'light-on-power-on', light: true, power: true, allowed: true, reason: 'The light is on, and the power is on, just as the rule demands.' },
  { key: 'light-off-power-on', light: false, power: true, allowed: true, reason: 'The rule only speaks when the light is on. Power with the light off breaks nothing.' },
  { key: 'light-on-power-off', light: true, power: false, allowed: false, reason: 'A light that is on must have power. No power, no light. That is the contrapositive at work.' },
  { key: 'light-off-power-off', light: false, power: false, allowed: true, reason: 'The light is off, so the rule has nothing to say about the power.' },
];

const worldName = (world: World) => `Light ${world.light ? 'on' : 'off'}, power ${world.power ? 'on' : 'off'}`;

function Bulb({ lit, broken }: { lit: boolean; broken: boolean }) {
  return <svg className="ct-bulb-icon" viewBox="0 0 80 100" width="54" height="68" aria-hidden="true" data-lit={lit} data-broken={broken}>
    <circle className="ct-glass" cx="40" cy="38" r="26"/>
    <path className="ct-base" d="M28 64h24v9H28zM31 75h18v8H31z"/>
    <path className="ct-filament" d="M32 42l8-10 8 10"/>
    <path className="ct-cross" d="M26 24l28 28M54 24L26 52"/>
  </svg>;
}

/** The four possible worlds. The student taps the one the rule rules out. */
export function WorldPicker() {
  const [picked, setPicked] = useState<string | null>(null);
  const pickedWorld = worlds.find(world => world.key === picked);
  const found = !!pickedWorld && !pickedWorld.allowed;
  const message = !pickedWorld
    ? 'Tap the world you think the rule rules out.'
    : found
      ? `Yes. Can't happen! ${pickedWorld.reason}`
      : `Not that one. That world is allowed. ${pickedWorld.reason} Try another.`;
  return <div className="ct-picker" data-found={found}>
    <p className="ct-picker-kicker">Your turn</p>
    <p className="ct-picker-rule">The rule: <strong>If the light is on, then the power must be on.</strong></p>
    <p className="ct-picker-question">Which ONE of these four worlds can't happen?</p>
    <div className="ct-worlds" role="group" aria-label="Four possible worlds">
      {worlds.map(world => {
        const shown = found || picked === world.key;
        const broken = shown && !world.allowed;
        return <button key={world.key} type="button" className="ct-world" aria-label={worldName(world)} aria-pressed={picked === world.key} data-verdict={shown ? (world.allowed ? 'allowed' : 'broken') : 'open'} onClick={() => setPicked(world.key)}>
          <Bulb lit={world.light} broken={broken}/>
          <span className="ct-world-line" data-on={world.light}>Light {world.light ? 'on' : 'off'}</span>
          <span className="ct-world-line" data-on={world.power}>{world.power ? <Zap size={15} aria-hidden="true"/> : <ZapOff size={15} aria-hidden="true"/>}Power {world.power ? 'on' : 'off'}</span>
          <span className="ct-world-verdict">{shown ? (world.allowed ? 'Allowed' : "Can't happen") : 'Tap to test'}</span>
        </button>;
      })}
    </div>
    <p className="ct-picker-message" role="status">{message}</p>
  </div>;
}

const stageText = ['Start with the rule.', 'Flip the sides.', 'Cross out both ideas. That is “not” on both, and it is the contrapositive.'];

/** Light → Power becomes the contrapositive in two moves: the sides swap, then each idea gets crossed out. */
export function FlipAndNegateDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [stage, setStage] = useState(0);
  const [runId, setRunId] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    if (!inView || reducedMotion()) return;
    setStage(0);
    timers.current.forEach(window.clearTimeout);
    timers.current = [window.setTimeout(() => setStage(1), 1600), window.setTimeout(() => setStage(2), 3600)];
    return () => timers.current.forEach(window.clearTimeout);
  }, [inView, runId]);
  const flipped = stage >= 1;
  const negated = stage >= 2;
  return <div ref={ref} className="ct-flip" data-stage={stage}>
    <div className="ct-flip-row">
      <span className="ct-chip" data-tone="amber" data-side="left" data-moved={flipped} data-struck={negated}>Light</span>
      <span className="ct-flip-arrow" aria-hidden="true">→</span>
      <span className="ct-chip" data-tone="teal" data-side="right" data-moved={flipped} data-struck={negated}>Power</span>
    </div>
    <p className="ct-flip-caption" role="status">{stageText[stage]}</p>
    <div className="ct-flip-controls">
      <button type="button" disabled={stage >= 2} onClick={() => setStage(value => Math.min(2, value + 1))}><Play size={15} aria-hidden="true"/>Next step</button>
      <button type="button" onClick={() => { setStage(0); setRunId(value => value + 1); }}><RotateCcw size={15} aria-hidden="true"/>Play it again</button>
    </div>
  </div>;
}

const moves: { key: string; right: boolean; name: string; how: string; left: ReactNode; to: ReactNode; why: string }[] = [
  { key: 'reverse', right: false, name: 'The reverse', how: 'Flip the sides only.', left: 'Power', to: 'Light', why: 'The power can be on while the light is off. Power does not force the light on.' },
  { key: 'inverse', right: false, name: 'The inverse', how: 'Add “not” only.', left: <Neg>Light</Neg>, to: <Neg>Power</Neg>, why: 'The light can be off while the power is on. An off light does not mean the power is off.' },
  { key: 'contrapositive', right: true, name: 'The contrapositive', how: 'Flip the sides and add “not” to both.', left: <Neg>Power</Neg>, to: <Neg>Light</Neg>, why: 'No power, no light. It says exactly what the original says.' },
];

/** The original rule beside the two look-alikes that fail and the one move that holds. */
export function ThreeMoves() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return <div ref={ref} className="ct-moves3" data-in-view={inView}>
    <p className="ct-moves3-start"><span>The original rule</span><strong>Light → Power</strong></p>
    <div className="ct-moves3-grid">
      {moves.map(move => <article key={move.key} className="ct-move" data-verdict={move.right ? 'right' : 'wrong'}>
        <p className="ct-move-badge">{move.right ? <Check size={16} strokeWidth={3} aria-hidden="true"/> : <X size={16} strokeWidth={3} aria-hidden="true"/>}{move.right ? 'Right' : 'Wrong'}</p>
        <p className="ct-move-name">{move.name}</p>
        <p className="ct-move-how">{move.how}</p>
        <p className="ct-move-diagram"><strong>{move.left}</strong><span aria-hidden="true">→</span><strong>{move.to}</strong></p>
        <p className="ct-move-why">{move.why}</p>
      </article>)}
    </div>
  </div>;
}
