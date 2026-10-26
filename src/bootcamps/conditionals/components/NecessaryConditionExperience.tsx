import { useId, useRef, useState, type KeyboardEvent } from 'react';
import './necessary-condition-tabs.css';

const cases = [
  { label: 'Law student', fact: 'Suppose this person is enrolled in law school.', student: 'Must be a student', studentNote: 'Follows from the rule', enrollment: 'Enrolled', note: 'Given in this example', title: 'Enrollment guarantees being a student.', explanation: 'Enrollment requires being a student. So this person must be a student.' },
  { label: 'History student', fact: 'Suppose this person is a history student who is not enrolled in law school.', student: 'Is a student', studentNote: 'Given in this example', enrollment: 'Not enrolled', note: 'Given in this example', title: 'Being a student does not guarantee law-school enrollment.', explanation: 'This person is a student, but is not enrolled in law school. That fits the rule. Being a student is required for enrollment, but it is not enough to prove enrollment.' },
  { label: 'Not a student', fact: 'Suppose this person is not a student.', student: 'Not a student', studentNote: 'Given in this example', enrollment: 'Ruled out', note: 'Follows from the rule', title: 'Without being a student, this person cannot be enrolled in law school.', explanation: 'Anyone enrolled in law school has to be a student. Because this person is not a student, enrollment is ruled out. The requirement cannot be false while enrollment is true.' },
] as const;

export function NecessaryConditionExperience() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % cases.length; break;
      case 'ArrowUp': next = (index + cases.length - 1) % cases.length; break;
      case 'Home': next = 0; break;
      case 'End': next = cases.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return <section className="nc-experience" aria-labelledby={`${id}-heading`}>
    <header>
      <h3 id={`${id}-heading`}>What does each case tell you?</h3>
      <div className="nc-case-rule"><span>The rule</span><p>If you are enrolled in law school, then you are a student.</p></div>
    </header>
    <div className="nc-tab-layout">
      <div className="nc-person-tabs" role="tablist" aria-label="Choose a person to compare" aria-orientation="vertical">
        {cases.map((item, index) => <button key={item.label} ref={(element) => { tabs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} aria-controls={`${id}-panel-${index}`} onKeyDown={(event) => navigateTabs(event, index)} onClick={() => setSelected(index)}>{item.label}</button>)}
      </div>
      <div className="nc-person-panels">
        {cases.map((item, index) => <div key={item.label} className="nc-person-panel" id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={selected !== index}>
          <p className="nc-person-fact">{item.fact}</p>
          <dl className="nc-person-facts">
            <div><dt>Being a student</dt><dd><strong>{item.student}</strong><span>{item.studentNote}</span></dd></div>
            <div><dt>Law-school enrollment</dt><dd><strong>{item.enrollment}</strong><span>{item.note}</span></dd></div>
          </dl>
          <div className="nc-reading">
            <h4>{item.title}</h4>
            <p>{item.explanation}</p>
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}
