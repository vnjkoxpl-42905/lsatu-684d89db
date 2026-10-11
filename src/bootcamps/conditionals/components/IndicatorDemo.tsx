import './indicator-demo.css';

const words = ['You', 'can', 'board', 'only', 'if', 'you', 'have', 'a', 'ticket.'];

/**
 * A short looping demonstration of the indicator step: the pointer clicks
 * "only", then "if", and the group appears. Pure CSS motion; with reduced
 * motion it shows the finished state.
 */
export function IndicatorDemo() {
  return <figure className="id-demo" aria-label="Example: in “You can board only if you have a ticket,” click only and if, then choose Group 2.">
    <div className="id-stage" aria-hidden="true">
      <p className="id-sentence">{words.map((word, index) => <span key={index} className={index === 3 ? 'id-word id-first' : index === 4 ? 'id-word id-second' : 'id-word'}>{word}</span>)}</p>
      <span className="id-group">Group 2: necessary</span>
    </div>
    <figcaption>Click each word of the indicator, then choose its group.</figcaption>
  </figure>;
}
