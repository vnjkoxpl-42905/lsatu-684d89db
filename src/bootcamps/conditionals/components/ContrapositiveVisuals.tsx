import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, RotateCcw } from 'lucide-react';
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

/** A word that punches the screen once, when it scrolls into view, then keeps a steady glow. */
export function PunchWord({ children }: { children: ReactNode }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  return <span ref={ref} className="ct-punch" data-in-view={inView}>{children}</span>;
}

/** Two diagrams of one rule, with a pulsing "same rule" badge between them. */
export function TwinRules({ original, contrapositive }: { original: ReactNode; contrapositive: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return <div ref={ref} className="ct-twin" data-in-view={inView}>
    <div className="ct-twin-side">{original}</div>
    <div className="ct-equals" aria-label="These say the same thing"><span aria-hidden="true">=</span><small>same rule</small></div>
    <div className="ct-twin-side">{contrapositive}</div>
  </div>;
}

/** Light and power, four possible worlds. Three fit the rule. The one with a lit light and no power breaks it. */
export function BulbBoard() {
  const [power, setPower] = useState(true);
  const [light, setLight] = useState(true);
  const broken = light && !power;
  const lit = light && power;
  const message = broken
    ? 'Can\'t happen! If the light is on, the power must be on. No power means the light cannot be on.'
    : lit
      ? 'Fits the rule. The light is on, so the power must be on. And it is.'
      : power
        ? 'Fits the rule. The power is on, but that doesn\'t force the light on. The rule says nothing about it.'
        : 'Fits the rule. The light is off, so the rule has nothing to say about the power.';
  return <div className="ct-board" data-state={broken ? 'broken' : lit ? 'lit' : 'dark'}>
    <div className="ct-bulb" aria-hidden="true">
      <svg viewBox="0 0 80 110" width="96" height="132">
        <circle className="ct-glass" cx="40" cy="40" r="28"/>
        <path className="ct-base" d="M28 70h24v10H28zM31 82h18v8H31z"/>
        <path className="ct-filament" d="M32 44l8-10 8 10"/>
        <path className="ct-cross" d="M26 26l28 28M54 26L26 54"/>
      </svg>
    </div>
    <div className="ct-board-body">
      <div className="ct-toggles" role="group" aria-label="Set the light and the power">
        <button type="button" aria-pressed={power} onClick={() => setPower(value => !value)}>Power: {power ? 'on' : 'off'}</button>
        <button type="button" aria-pressed={light} onClick={() => setLight(value => !value)}>Light: {light ? 'on' : 'off'}</button>
      </div>
      <p className="ct-board-message" role="status">{message}</p>
    </div>
  </div>;
}

const stageText = ['Start with the rule.', 'Flip the sides.', 'Cross out both ideas. That is “not” on both, and it is the contrapositive.'];

/** Light → Power becomes ~Power → ~Light in two moves: the sides swap, then each idea gets crossed out. */
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
      <span className="ct-chip" data-side="left" data-moved={flipped} data-struck={negated}>Light</span>
      <span className="ct-flip-arrow" aria-hidden="true">→</span>
      <span className="ct-chip" data-side="right" data-moved={flipped} data-struck={negated}>Power</span>
    </div>
    <p className="ct-flip-caption" role="status">{stageText[stage]}</p>
    <div className="ct-flip-controls">
      <button type="button" disabled={stage >= 2} onClick={() => setStage(value => Math.min(2, value + 1))}><Play size={15} aria-hidden="true"/>Next step</button>
      <button type="button" onClick={() => { setStage(0); setRunId(value => value + 1); }}><RotateCcw size={15} aria-hidden="true"/>Play it again</button>
    </div>
  </div>;
}
