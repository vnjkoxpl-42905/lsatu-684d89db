import { useId } from 'react';
import './conditional-scene.css';

type SceneMode = 'general' | 'linking' | 'missing-link' | 'must-be-true';

export interface ConditionalSceneProps {
  mode: SceneMode;
  step?: number;
  compact?: boolean;
}

const scenes: Record<SceneMode, { label: string; steps: string[]; descriptions: string[] }> = {
  general: {
    label: 'Worked example',
    steps: ['Start with the rule', 'Reverse and negate', 'Equivalent conditionals'],
    descriptions: ['P implies Q.', 'P implies Q. Its contrapositive is not Q implies not P.', 'P implies Q and not Q implies not P express the same relationship.'],
  },
  linking: {
    label: 'Connect the conditions',
    steps: ['Find the open ends', 'Connect Q to R', 'Follow the complete chain'],
    descriptions: ['P implies Q. R implies S. The connection between Q and R is missing.', 'Adding Q implies R connects the two rules.', 'P implies Q, Q implies R, and R implies S. Therefore P implies S.'],
  },
  'missing-link': {
    label: 'Missing link',
    steps: ['Aim for P → S', 'The missing link is Q → R', 'The target now follows'],
    descriptions: ['Given P implies Q and R implies S, find an additional conditional that establishes P implies S.', 'Q implies R supplies the missing link.', 'P implies Q, Q implies R, and R implies S together establish the target P implies S.'],
  },
  'must-be-true': {
    label: 'Follow what must happen',
    steps: ['Read the given rules', 'P must lead to R', 'The contrapositive follows too'],
    descriptions: ['P implies Q and Q implies R.', 'Following both rules establishes P implies R.', 'P implies R, so not R implies not P. Neither conclusion asserts that P actually occurs.'],
  },
};

/** A worked illustration only. Question-specific answers never enter this scene. */
export function ConditionalScene({ mode, step = 0, compact = false }: ConditionalSceneProps) {
  const uniqueId = useId().replace(/:/g, '');
  const stage = Math.max(0, Math.min(2, Math.floor(step)));
  const scene = scenes[mode];
  const id = (name: string) => `conditional-scene-${uniqueId}-${name}`;
  const arrow = `url(#${id('arrow')})`;
  const accentArrow = `url(#${id('accent-arrow')})`;

  const node = (letter: string, x: number, y: number, options: { negated?: boolean; accent?: boolean; active?: boolean } = {}) => (
    <g className={`cs-node${options.accent ? ' cs-node-accent' : ''}${options.active ? ' cs-node-active' : ''}`} transform={`translate(${x} ${y})`}>
      <circle className="cs-node-halo" r="43" />
      <circle className="cs-node-ring" r="33" />
      <circle className="cs-node-core" r="27" />
      <text className="cs-node-letter" textAnchor="middle" dominantBaseline="central">{letter}</text>
      {options.negated && <line className="cs-slash" x1="-13" y1="17" x2="13" y2="-17" />}
      <circle className="cs-node-pin" cx="0" cy="-33" r="2.5" />
    </g>
  );
  const edge = (d: string, accent = false, animate = false) => (
    <path d={d} pathLength="1" markerEnd={accent ? accentArrow : arrow}
      className={`cs-edge${accent ? ' cs-edge-accent' : ''}${animate ? ' cs-edge-draw' : ''}`} />
  );

  return <figure className={`conditional-scene cs-${mode}${compact ? ' cs-compact' : ''}`}>
    <div className="cs-topline" aria-hidden="true"><span className="cs-signal" /><span>{scene.label}</span><span className="cs-stage">0{stage + 1} / 03</span></div>
    <svg className="cs-canvas" viewBox="0 0 680 330" role="img" aria-labelledby={`${id('title')} ${id('description')}`}>
      <title id={id('title')}>{scene.steps[stage]}</title>
      <desc id={id('description')}>{scene.descriptions[stage]}</desc>
      <defs>
        <pattern id={id('grid')} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="currentColor" strokeWidth=".6" /></pattern>
        <radialGradient id={id('fade')}><stop offset="0%" stopColor="white" /><stop offset="100%" stopColor="black" /></radialGradient>
        <mask id={id('grid-mask')}><rect width="680" height="330" fill={`url(#${id('fade')})`} /></mask>
        <marker id={id('arrow')} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" className="cs-arrowhead" /></marker>
        <marker id={id('accent-arrow')} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" className="cs-arrowhead cs-arrowhead-accent" /></marker>
      </defs>
      <rect className="cs-grid" width="680" height="330" fill={`url(#${id('grid')})`} mask={`url(#${id('grid-mask')})`} />
      <ellipse className="cs-orbit" cx="340" cy="155" rx="277" ry="122" />
      <ellipse className="cs-orbit cs-orbit-inner" cx="340" cy="155" rx="223" ry="89" />
      <path className="cs-registration" d="M26 48V27H47 M633 27H654V48 M26 280V301H47 M633 301H654V280" />
      <g key={`${mode}-${stage}`} className="cs-diagram">
        {mode === 'general' ? <>
          <text className="cs-annotation" x="340" y="64" textAnchor="middle">GIVEN</text>
          {edge('M248 112H429', false, stage === 0)}
          {node('P', 210, 112, { active: stage === 2 })}
          {node('Q', 470, 112, { active: stage === 2 })}
          <path className="cs-guide" d="M210 157V187 M470 157V187" />
          {stage === 0 ? <text className="cs-prompt" x="340" y="242" textAnchor="middle">What follows when Q is absent?</text> : <g className="cs-reveal">
            <text className="cs-annotation cs-accent-text" x="340" y="190" textAnchor="middle">CONTRAPOSITIVE</text>
            {edge('M248 237H429', true, true)}
            {node('Q', 210, 237, { negated: true, accent: true, active: stage === 2 })}
            {node('P', 470, 237, { negated: true, accent: true, active: stage === 2 })}
          </g>}
        </> : mode === 'must-be-true' ? <>
          <text className="cs-annotation" x="340" y="66" textAnchor="middle">GIVEN</text>
          {edge('M193 132H298')}{edge('M378 132H483')}
          {node('P', 155, 132, { active: stage > 0 })}{node('Q', 340, 132)}{node('R', 525, 132, { active: stage > 0 })}
          {stage > 0 ? <g className="cs-reveal">
            {edge('M155 174V204Q155 227 180 227H500Q525 227 525 204V176', true, true)}
            <rect className="cs-label-plate" x="278" y="211" width="124" height="31" rx="15" />
            <text className="cs-result" x="340" y="233" textAnchor="middle">P → R</text>
          </g> : <text className="cs-prompt" x="340" y="236" textAnchor="middle">Follow the direction of both arrows.</text>}
          {stage === 2 && <g className="cs-reveal">
            <text className="cs-annotation" x="279" y="287" textAnchor="end">ALSO</text>
            <text className="cs-small-formula" x="317" y="291" textAnchor="middle">R</text><line className="cs-small-slash" x1="309" y1="296" x2="325" y2="275" />
            <text className="cs-small-formula" x="350" y="291" textAnchor="middle">→</text>
            <text className="cs-small-formula" x="383" y="291" textAnchor="middle">P</text><line className="cs-small-slash" x1="375" y1="296" x2="391" y2="275" />
          </g>}
        </> : <>
          <text className="cs-annotation" x="185" y="71" textAnchor="middle">PREMISE 01</text>
          <text className="cs-annotation" x="495" y="71" textAnchor="middle">PREMISE 02</text>
          {edge('M148 132H218')}{edge('M458 132H528')}
          {node('P', 110, 132, { active: stage === 2 })}{node('Q', 260, 132, { accent: stage > 0 })}
          {node('R', 420, 132, { accent: stage > 0 })}{node('S', 570, 132, { active: stage === 2 })}
          {stage === 0 ? <>
            <path className="cs-gap" d="M300 132H380" />
            <circle className="cs-question-disc" cx="340" cy="132" r="16" />
            <text className="cs-question" x="340" y="138" textAnchor="middle">?</text>
            <text className="cs-annotation cs-accent-text" x="340" y="194" textAnchor="middle">FIND THE BRIDGE</text>
          </> : <g className="cs-reveal">
            {edge('M300 132H378', true, true)}
            <text className="cs-annotation cs-accent-text" x="340" y="194" textAnchor="middle">Q → R</text>
          </g>}
          {stage === 2 ? <g className="cs-reveal">
            {edge('M110 176V222Q110 244 134 244H546Q570 244 570 222V176', true, true)}
            <rect className="cs-label-plate" x="270" y="228" width="140" height="32" rx="16" />
            <text className="cs-result" x="340" y="250" textAnchor="middle">P → S</text>
          </g> : <>
            <path className="cs-guide" d="M110 190V244H258 M570 190V244H422" />
            <text className="cs-annotation" x="340" y="235" textAnchor="middle">TARGET</text>
            <text className="cs-target" x="340" y="263" textAnchor="middle">P → S</text>
          </>}
        </>}
      </g>
    </svg>
    {!compact && <figcaption className="cs-caption"><span>{scene.steps[stage]}</span><span className="cs-step-dots" aria-hidden="true">{[0, 1, 2].map(index => <i key={index} className={index <= stage ? 'is-active' : ''} />)}</span></figcaption>}
  </figure>;
}
