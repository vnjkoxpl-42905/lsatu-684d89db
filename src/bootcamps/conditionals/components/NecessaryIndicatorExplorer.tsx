import { useId, useRef, useState, type KeyboardEvent } from 'react';
import './necessary-indicator-explorer.css';

const examples = [
  { expression: 'Only', necessaryCondition: 'You are a student.', content: <><blockquote><strong>Only</strong> students are enrolled in law school.</blockquote><p>This excludes nonstudents from the law-school group. It does not put every student in that group. Being a student remains required; being enrolled remains enough to prove it.</p></> },
  { expression: 'Only if', necessaryCondition: 'You are a student.', content: <><blockquote>You are enrolled in law school <strong>only if</strong> you are a student.</blockquote><p>Only if introduces the requirement: <strong>you are a student</strong>. Read the whole phrase. The if inside only if does not make being a student sufficient.</p></> },
  { expression: 'Only when', necessaryCondition: 'You are a student.', content: <><blockquote>You are enrolled in law school <strong>only when</strong> you are a student.</blockquote><p>On any occasion when enrollment is true, being a student must be true too. This does not say you become enrolled whenever you are a student, or that one condition has to happen later than the other.</p></> },
  { expression: 'Only where', necessaryCondition: 'A tutor is present where the seminar takes place.', content: <><p>This indicator restricts places, so use a setting example:</p><blockquote>A seminar takes place <strong>only where</strong> a tutor is present.</blockquote><p>At any place with that seminar, <strong>a tutor must be present</strong>. A tutor could also be somewhere without a seminar. A seminar taking place is sufficient to prove a tutor's presence there; the tutor's presence is necessary for the seminar.</p></> },
  { expression: 'Always', necessaryCondition: 'You are a student.', content: <><blockquote>While you are enrolled in law school, you are <strong>always</strong> a student.</blockquote><p>Always allows no exception within the situation described: being enrolled in law school. It does not say every student is enrolled, or that someone remains a student after enrollment ends.</p></> },
  { expression: 'Requires', necessaryCondition: 'You are a student.', content: <><blockquote>Being enrolled in law school <strong>requires</strong> being a student.</blockquote><p>What does enrollment require? <strong>Being a student.</strong> Requires is the indicator; being a student is the condition it identifies. They are not the same thing.</p></> },
  { expression: 'Must', necessaryCondition: 'You are a student.', content: <><blockquote>If you are enrolled in law school, you <strong>must</strong> be a student.</blockquote><p>Must makes the certainty explicit: enrollment cannot coexist with not being a student. Here it describes what has to be true, not a task someone has been told to complete.</p></> },
];

export function NecessaryIndicatorExplorer() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowDown': case 'ArrowRight': next = (index + 1) % examples.length; break;
      case 'ArrowUp': case 'ArrowLeft': next = (index + examples.length - 1) % examples.length; break;
      case 'Home': next = 0; break;
      case 'End': next = examples.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return <div className="ni-explorer">
    <p className="ni-instruction">Choose an indicator to see the necessary condition it identifies in a complete sentence.</p>
    <div className="ni-layout">
      <ol className="ni-expression-list" role="tablist" aria-label="Necessary-condition indicators" aria-orientation="vertical">
        {examples.map((example, index) => <li key={example.expression} role="presentation">
          <button type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1} aria-controls={`${id}-example-${index}`}
            ref={element => { tabs.current[index] = element; }} onKeyDown={event => navigate(event, index)}
            onPointerEnter={event => {
              if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (min-width: 621px)').matches) setSelected(index);
            }}
            onFocus={() => setSelected(index)} onClick={() => setSelected(index)}>
            <span className="ni-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span>{example.expression.toLowerCase()}</span><span className="ni-indicator" aria-hidden="true">↗</span>
          </button>
        </li>)}
      </ol>
      <div className="ni-examples">
        {examples.map((example, index) => <section key={example.expression} id={`${id}-example-${index}`}
          role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={selected !== index} className="ni-example">
          <p className="ni-example-label">{String(index + 1).padStart(2, '0')} / {String(examples.length).padStart(2, '0')} · The rule and its meaning</p>
          <dl className="nc-indicator-examples"><div><dt>{example.expression}</dt><dd>{example.content}</dd></div></dl>
          <div className="ni-requirement"><span>Necessary condition</span><strong>{example.necessaryCondition}</strong></div>
        </section>)}
      </div>
    </div>
  </div>;
}
