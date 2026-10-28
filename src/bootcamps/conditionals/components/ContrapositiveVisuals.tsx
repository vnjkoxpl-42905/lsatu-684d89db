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

type DemoIdea = { text: string; tone: Tone; struck?: boolean };
type DemoProps = { left: DemoIdea; right: DemoIdea; captions: [string, string, string]; label: string; rule: string; result: string };

const lightPower: DemoProps = {
  left: { text: 'Light', tone: 'amber' },
  right: { text: 'Power', tone: 'teal' },
  label: 'Flip the sides, then put “not” on both',
  rule: 'If the light is on, then the power must be on.',
  result: 'If the power is off, then the light must be off.',
  captions: ['This is the rule. Click Step 1.', 'The sides are flipped. Now click Step 2.', 'Both ideas are crossed out. That is “not” on both, and it is the contrapositive.'],
};

const snowHot: DemoProps = {
  left: { text: 'Snowing', tone: 'amber' },
  right: { text: 'Hot', tone: 'teal', struck: true },
  label: 'A rule that already has a “not”',
  rule: 'If it is snowing, then it must not be hot.',
  result: 'If it is hot, then it must not be snowing.',
  captions: ['This rule already has a “not” on the right side. Click Step 1.', 'The sides are flipped. Now click Step 2.', 'Each idea gets a “not.” Hot already had one, so the two cancel and it turns positive. That is the contrapositive.'],
};

/** A rule becomes its contrapositive in two clicks: Step 1 swaps the sides, Step 2 puts "not" on each idea.
 *  A "not" that was already there cancels: the idea loses its strike and turns positive. */
function FlipAndNegate({ left, right, captions, label, rule, result }: DemoProps) {
  const [stage, setStage] = useState(0);
  const flipped = stage >= 1;
  const negated = stage >= 2;
  const chip = (idea: DemoIdea, side: 'left' | 'right') => {
    const struck = !!idea.struck !== negated;
    return <span className="ct-chip" data-tone={idea.tone} data-side={side} data-moved={flipped} data-struck={struck}>{struck && <span className="ct-sr">not </span>}{idea.text}</span>;
  };
  return <div className="ct-flip" data-stage={stage} role="group" aria-label={label}>
    <p className="ct-flip-sentence" data-kind="rule"><span>The rule</span>{rule}</p>
    <div className="ct-flip-row">
      {chip(left, 'left')}
      <span className="ct-flip-arrow" aria-hidden="true">→</span>
      {chip(right, 'right')}
    </div>
    <p className="ct-flip-sentence" data-kind="result" data-show={negated} aria-hidden={!negated}><span>The contrapositive</span>{result}</p>
    <p className="ct-flip-caption" role="status">{captions[stage]}</p>
    <div className="ct-flip-controls">
      <button type="button" className="ct-step" data-ready={stage === 0} data-done={stage >= 1} disabled={stage !== 0} onClick={() => setStage(1)}><b aria-hidden="true">{stage >= 1 ? <Check size={16} strokeWidth={3}/> : 1}</b>Step 1. Click here to flip the sides</button>
      <button type="button" className="ct-step" data-ready={stage === 1} data-done={stage >= 2} disabled={stage !== 1} onClick={() => setStage(2)}><b aria-hidden="true">{stage >= 2 ? <Check size={16} strokeWidth={3}/> : 2}</b>Step 2. Click here to put “not” on both</button>
      {stage > 0 && <button type="button" className="ct-flip-reset" onClick={() => setStage(0)}><RotateCcw size={15} aria-hidden="true"/>Start over</button>}
    </div>
  </div>;
}

export const FlipAndNegateDemo = () => <FlipAndNegate {...lightPower}/>;
export const DoubleNegativeDemo = () => <FlipAndNegate {...snowHot}/>;

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
        <p className="ct-move-how">{move.how}</p>
        <p className="ct-move-diagram"><strong>{move.left}</strong><span aria-hidden="true">→</span><strong>{move.to}</strong></p>
      </article>)}
    </div>
  </div>;
}

type Tone = 'amber' | 'teal';

/** One idea as a coloured pill. A struck pill is the idea with "not" on it. */
export function Pill({ text, tone, negated }: { text: string; tone: Tone; negated: boolean }) {
  return <span className="ct-pill" data-tone={tone} data-not={negated}>{negated && <span className="ct-sr">not </span>}{text}</span>;
}

type Idea = { short: string; negated: boolean };
type RuleCase = { tag: string; sentence: string; left: Idea; right: Idea; place: number; why: { reverse: string; inverse: string; contrapositive: string } };

const ruleCases: RuleCase[] = [
  {
    tag: 'No “not” in the rule',
    sentence: 'If a guest is on the list, the guest gets a wristband.',
    left: { short: 'On the list', negated: false },
    right: { short: 'Wristband', negated: false },
    place: 2,
    why: {
      reverse: "A wristband doesn't prove the guest is on the list.",
      inverse: "Being off the list doesn't rule out a wristband.",
      contrapositive: "If a guest doesn't get a wristband, then the guest isn't on the list.",
    },
  },
  {
    tag: 'A “not” on the right',
    sentence: 'If the shop is open, the shutters are not down.',
    left: { short: 'Shop open', negated: false },
    right: { short: 'Shutters down', negated: true },
    place: 0,
    why: {
      reverse: "Shutters that are up don't prove the shop is open.",
      inverse: "A closed shop can still have its shutters up.",
      contrapositive: "If the shutters are down, then the shop isn't open.",
    },
  },
  {
    tag: 'A “not” on the left',
    sentence: 'If the gate is not locked, the dog can get out.',
    left: { short: 'Gate locked', negated: true },
    right: { short: 'Dog gets out', negated: false },
    place: 1,
    why: {
      reverse: "The dog could get out another way.",
      inverse: "The rule only covers an unlocked gate.",
      contrapositive: "If the dog can't get out, then the gate is locked.",
    },
  },
  {
    tag: 'A “not” on both sides',
    sentence: 'If a ticket is not stamped, it is not valid.',
    left: { short: 'Ticket stamped', negated: true },
    right: { short: 'Ticket valid', negated: true },
    place: 2,
    why: {
      reverse: "An invalid ticket might still be stamped.",
      inverse: "A stamp alone doesn't make a ticket valid.",
      contrapositive: "If a ticket is valid, then it is stamped.",
    },
  },
];

type Choice = { kind: 'reverse' | 'inverse' | 'contrapositive'; left: Idea; right: Idea; leftTone: Tone; rightTone: Tone };

const spoken = (idea: Idea) => (idea.negated ? 'not ' : '') + idea.short.toLowerCase();

/** The three look-alikes for a rule, with the contrapositive at the position the case asks for. Colour follows the idea. */
function choicesFor(rule: RuleCase): Choice[] {
  const flip = (idea: Idea): Idea => ({ ...idea, negated: !idea.negated });
  const options: Choice[] = [
    { kind: 'reverse', left: rule.right, right: rule.left, leftTone: 'teal', rightTone: 'amber' },
    { kind: 'inverse', left: flip(rule.left), right: flip(rule.right), leftTone: 'amber', rightTone: 'teal' },
  ];
  options.splice(rule.place, 0, { kind: 'contrapositive', left: flip(rule.right), right: flip(rule.left), leftTone: 'teal', rightTone: 'amber' });
  return options;
}

/** Four rules, one at a time: which of three diagrams is the contrapositive? */
export function RuleDrill() {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);
  const rule = ruleCases[step];
  const choices = choicesFor(rule);
  const last = step === ruleCases.length - 1;
  const lastTried = wrong.length ? choices[wrong[wrong.length - 1]] : null;
  const message = solved !== null
    ? rule.why.contrapositive
    : lastTried ? `Not that one. ${rule.why[lastTried.kind as 'reverse' | 'inverse']}` : 'Pick the diagram that says the same thing as the rule.';
  const next = () => { setStep(value => value + 1); setWrong([]); setSolved(null); };
  const restart = () => { setStep(0); setWrong([]); setSolved(null); };
  return <div className="ct-drill" data-step={step}>
    <div className="ct-drill-top">
      <p className="ct-picker-kicker">Your turn</p>
      <p className="ct-drill-count">Rule {step + 1} of {ruleCases.length}<span className="ct-drill-dots" aria-hidden="true">{ruleCases.map((item, index) => <i key={item.tag} data-state={index < step ? 'done' : index === step ? 'now' : 'todo'}/>)}</span></p>
    </div>
    <p className="ct-drill-sentence">{rule.sentence}</p>
    <div className="ct-drill-original" role="img" aria-label={`The rule: ${spoken(rule.left)} implies ${spoken(rule.right)}`}>
      <Pill text={rule.left.short} tone="amber" negated={rule.left.negated}/><span className="ct-drill-arrow" aria-hidden="true">→</span><Pill text={rule.right.short} tone="teal" negated={rule.right.negated}/>
    </div>
    <p className="ct-picker-question" id={`ct-drill-q-${step}`}>Which one is the contrapositive?</p>
    <div className="ct-drill-options" role="group" aria-labelledby={`ct-drill-q-${step}`}>
      {choices.map((choice, index) => {
        const state = solved === index ? 'right' : wrong.includes(index) ? 'wrong' : 'open';
        return <button key={choice.kind} type="button" className="ct-drill-option" data-state={state} disabled={solved !== null && solved !== index} aria-label={`${spoken(choice.left)} → ${spoken(choice.right)}`} onClick={() => { if (solved !== null) return; if (choice.kind === 'contrapositive') setSolved(index); else setWrong(items => items.includes(index) ? items : [...items, index]); }}>
          <span aria-hidden="true" className="ct-drill-diagram"><Pill text={choice.left.short} tone={choice.leftTone} negated={choice.left.negated}/><span className="ct-drill-arrow">→</span><Pill text={choice.right.short} tone={choice.rightTone} negated={choice.right.negated}/></span>
          {state === 'right' && <span className="ct-drill-mark" data-kind="right"><Check size={16} strokeWidth={3} aria-hidden="true"/>Yes</span>}
          {state === 'wrong' && <span className="ct-drill-mark" data-kind="wrong"><X size={16} strokeWidth={3} aria-hidden="true"/>No</span>}
        </button>;
      })}
    </div>
    <p className="ct-picker-message" role="status" data-solved={solved !== null}>{message}</p>
    {solved !== null && (last
      ? <div className="ct-drill-end"><strong>That is all four. Same two steps every time.</strong><button type="button" className="ct-drill-next" onClick={restart}><RotateCcw size={15} aria-hidden="true"/>Try them again</button></div>
      : <button type="button" className="ct-drill-next" onClick={next}>Next rule</button>)}
  </div>;
}

const LECTURE_TRANSCRIPT = "Here's a rule: if the ceiling light is on, then the power must be on. Now flip the question. What if the power goes out? Could the light still be on? Nope. No power, no light. That's a second rule, and it was hiding inside the first one. If the power is off, then the light must be off. That's the contrapositive. If the necessary condition is absent, the sufficient condition is absent too. Here's how you write it. Start with the rule: Light, arrow, Power. Step one: flip the sides. Power goes on the left, and Light goes on the right. Step two: put a not on both. Not power, arrow, not light. Read it back: if there's no power, the light is not on. The original and the contrapositive are logically equivalent. If one is true, the other is true, so you can use either one. They're interchangeable! Be careful, though. Only flipping the sides is not the contrapositive, and neither is only adding a not. Each one is a different rule, and the original doesn't give it to you. You need both changes together. So when you see a rule, flip it, put a not on both sides, and you've got the contrapositive. Now try it on the next few rules yourself.";

/** Short narrated lecture. The written lesson below stands on its own if the video cannot load. */
export function ContrapositiveLecture() {
  const [failed, setFailed] = useState(false);
  const [read, setRead] = useState(false);
  return <figure className="ct-lecture">
    <video controls preload="metadata" playsInline poster="/media/conditionals/contrapositive/lecture.jpg" aria-label="A short lecture on the contrapositive" onError={() => setFailed(true)}>
      <source src="/media/conditionals/contrapositive/lecture.mp4" type="video/mp4" onError={() => setFailed(true)}/>
      <track kind="captions" src="/media/conditionals/contrapositive/lecture.vtt" srcLang="en" label="English"/>
      Your browser cannot play this video. The lesson is written out below.
    </video>
    {failed && <p role="alert" className="ct-lecture-error">The video couldn't load. The lesson is written out below.</p>}
    <details open={failed || undefined} onToggle={event => setRead(event.currentTarget.open)}><summary>Read the video</summary>{(read || failed) && <p>{LECTURE_TRANSCRIPT}</p>}</details>
  </figure>;
}

/** "Pop Quiz", centred. Each letter springs up in turn once the title scrolls into view, then a band of light keeps sweeping across the lettering. */
export function PopQuizTitle() {
  const [ref, inView] = useInView<HTMLHeadingElement>();
  const letters = 'Pop Quiz'.split('');
  return <h2 ref={ref} className="ct-popquiz" data-in-view={inView} aria-label="Pop Quiz">
    {letters.map((letter, index) => letter === ' '
      ? <span key={index} className="ct-popquiz-gap" aria-hidden="true"/>
      : <span key={index} className="ct-popquiz-letter" aria-hidden="true" style={{ animationDelay: `${index * 0.08}s` }}>{letter}</span>)}
  </h2>;
}
