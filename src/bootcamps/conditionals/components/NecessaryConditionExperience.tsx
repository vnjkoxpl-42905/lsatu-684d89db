import { useId, useState } from 'react';

const cases = [
  { label: 'Law student', fact: 'Suppose this person is enrolled in law school.', student: 'Must be a student', studentNote: 'Follows from the rule', enrollment: 'Enrolled', note: 'Given in this example', title: 'Enrollment guarantees being a student.', explanation: 'Enrollment requires being a student. So this person must be a student.' },
  { label: 'History student', fact: 'Suppose this person is a history student who is not enrolled in law school.', student: 'Is a student', studentNote: 'Given in this example', enrollment: 'Not enrolled', note: 'Given in this example', title: 'Being a student does not guarantee law-school enrollment.', explanation: 'This person is a student, but is not enrolled in law school. That fits the rule. Being a student is required for enrollment, but it is not enough to establish enrollment.' },
  { label: 'Not a student', fact: 'Suppose this person is not a student.', student: 'Not a student', studentNote: 'Given in this example', enrollment: 'Ruled out', note: 'Follows from the rule', title: 'Without being a student, this person cannot be enrolled in law school.', explanation: 'Anyone enrolled in law school has to be a student. Because this person is not a student, enrollment is ruled out. The requirement cannot be false while enrollment is true.' },
] as const;

export function NecessaryConditionExperience() {
  const [selected, setSelected] = useState(0);
  const current = cases[selected];
  const id = useId();
  return <section className="nc-experience" aria-labelledby={`${id}-heading`}>
    <header>
      <h3 id={`${id}-heading`}>Compare three people</h3>
      <p>Keep the same rule. Choose a person and see what their situation tells you.</p>
    </header>
    <div className="nc-controls" role="group" aria-label="Choose a person to compare">
      {cases.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} aria-controls={`${id}-reading`} onClick={() => setSelected(index)}>{item.label}</button>)}
    </div>
    <p className="nc-case-fact" aria-hidden="true">{current.fact}</p>
    <div className="nc-relationship" data-required-present={selected !== 2} aria-hidden="true">
      <div className="nc-condition"><span>Being a student</span><strong key={selected} className="nc-verdict">{current.student}</strong><small>{current.studentNote}</small></div>
      <div className="nc-enrollment"><span>Law-school enrollment</span><strong key={selected} className="nc-verdict">{current.enrollment}</strong><small>{current.note}</small></div>
    </div>
    <div className="nc-reading" id={`${id}-reading`} role="status" aria-live="polite" aria-atomic="true">
      <p className="nc-sr-fact">{current.fact}</p>
      <h4>{current.title}</h4>
      <p>{current.explanation}</p>
    </div>
  </section>;
}
