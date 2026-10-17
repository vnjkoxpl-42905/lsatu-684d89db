import './negated-condition.css';

/** One diagonal across the whole condition, including a phrase that wraps. */
export function NegatedCondition({ text }: { text: string }) {
  return <span className="conditional-not" role="img" aria-label={`not ${text}`}>
    <span aria-hidden="true">{text}</span>
    <svg className="conditional-not-stroke" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="7" y1="88" x2="93" y2="12" vectorEffect="non-scaling-stroke" />
    </svg>
  </span>;
}
