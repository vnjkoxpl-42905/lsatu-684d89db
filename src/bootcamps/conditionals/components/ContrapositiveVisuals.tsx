import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, RotateCcw, X, Zap, ZapOff } from 'lucide-react';
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

type Side = 'original' | 'contrapositive';
type Lamp = 'on' | 'off' | 'unknown';

/** The rule and its contrapositive, one tab each. Original: switch the light on and the power has to be on.
 *  Contrapositive: cut the power and the light has to be off. One switch, two lamps, one sentence. */
export function RuleStage() {
  const [side, setSide] = useState<Side>('original');
  const [light, setLight] = useState(false);
  const [power, setPower] = useState(true);
  const [touched, setTouched] = useState<Record<Side, boolean>>({ original: false, contrapositive: false });
  const original = side === 'original';
  const powerLamp: Lamp = original ? (light ? 'on' : 'unknown') : (power ? 'on' : 'off');
  const lightLamp: Lamp = original ? (light ? 'on' : 'off') : (power ? 'unknown' : 'off');
  const message = original
    ? (light ? 'The light is on, so the power must be on.' : touched.original ? 'The light is off. The rule says nothing about the power.' : 'Turn the light on. Watch the power.')
    : (!power ? 'There is no power, so the light can\'t be on.' : touched.contrapositive ? 'The power is on. The rule says nothing about the light.' : 'Cut the power. Watch the light.');
  const flip = () => { setTouched(value => ({ ...value, [side]: true })); if (original) setLight(value => !value); else setPower(value => !value); };
  return <div className="ct-stage" data-side={side}>
    <div className="ct-tabs" role="tablist" aria-label="The rule and its contrapositive">
      <button type="button" role="tab" id="ct-tab-original" aria-selected={original} aria-controls="ct-panel" data-kind="original" onClick={() => setSide('original')}><small>Original</small><span>Light → Power</span></button>
      <button type="button" role="tab" id="ct-tab-contrapositive" aria-selected={!original} aria-controls="ct-panel" data-kind="contrapositive" onClick={() => setSide('contrapositive')}><small>Contrapositive</small><span><Neg>Power</Neg> → <Neg>Light</Neg></span></button>
    </div>
    <div className="ct-stage-panel" role="tabpanel" id="ct-panel" aria-labelledby={`ct-tab-${side}`}>
      <div className="ct-lamps">
        <div className="ct-lamp" data-kind="light" data-state={lightLamp}>
          <Bulb lit={lightLamp === 'on'} broken={false}/>
          <span className="ct-lamp-name">Light</span>
        </div>
        <div className="ct-lamp" data-kind="power" data-state={powerLamp}>
          <span className="ct-power-ring"><Zap size={38} aria-hidden="true"/></span>
          <span className="ct-lamp-name">Power</span>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={original ? light : power} className="ct-switch" data-invite={!touched[side]} onClick={flip}><span className="ct-switch-track"><span className="ct-switch-knob"/></span>{original ? 'Light switch' : 'Power switch'}: {(original ? light : power) ? 'on' : 'off'}</button>
      <p className="ct-stage-message" role="status">{message}</p>
    </div>
  </div>;
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

const stageText = ['This is the rule. Click Step 1.', 'The sides are flipped. Now click Step 2.', 'Both ideas are crossed out. That is “not” on both, and it is the contrapositive.'];

/** Light → Power becomes the contrapositive in two clicks: Step 1 swaps the sides, Step 2 crosses out each idea. */
export function FlipAndNegateDemo() {
  const [stage, setStage] = useState(0);
  const flipped = stage >= 1;
  const negated = stage >= 2;
  return <div className="ct-flip" data-stage={stage}>
    <div className="ct-flip-row">
      <span className="ct-chip" data-tone="amber" data-side="left" data-moved={flipped} data-struck={negated}>Light</span>
      <span className="ct-flip-arrow" aria-hidden="true">→</span>
      <span className="ct-chip" data-tone="teal" data-side="right" data-moved={flipped} data-struck={negated}>Power</span>
    </div>
    <p className="ct-flip-caption" role="status">{stageText[stage]}</p>
    <div className="ct-flip-controls">
      <button type="button" className="ct-step" data-ready={stage === 0} data-done={stage >= 1} disabled={stage !== 0} onClick={() => setStage(1)}><b aria-hidden="true">{stage >= 1 ? <Check size={16} strokeWidth={3}/> : 1}</b>Step 1. Click here to flip the sides</button>
      <button type="button" className="ct-step" data-ready={stage === 1} data-done={stage >= 2} disabled={stage !== 1} onClick={() => setStage(2)}><b aria-hidden="true">{stage >= 2 ? <Check size={16} strokeWidth={3}/> : 2}</b>Step 2. Click here to put “not” on both</button>
      {stage > 0 && <button type="button" className="ct-flip-reset" onClick={() => setStage(0)}><RotateCcw size={15} aria-hidden="true"/>Start over</button>}
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
