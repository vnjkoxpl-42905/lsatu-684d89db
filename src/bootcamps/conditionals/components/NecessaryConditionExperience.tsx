import { useId, useState } from 'react';

export function NecessaryConditionExperience() {
  const [isStudent, setIsStudent] = useState(true);
  const id = useId();
  return <section className="nc-experience" aria-labelledby={`${id}-heading`}>
    <header>
      <h3 id={`${id}-heading`}>Can you be enrolled without being a student?</h3>
      <p>Being a student is required for law-school enrollment. Compare what happens with and without that condition.</p>
    </header>
    <div className="nc-controls" role="group" aria-label="Compare the requirement being present or missing">
      <button type="button" aria-pressed={isStudent} aria-controls={`${id}-reading`} onClick={() => setIsStudent(true)}>A student</button>
      <button type="button" aria-pressed={!isStudent} aria-controls={`${id}-reading`} onClick={() => setIsStudent(false)}>Not a student</button>
    </div>
    <div className="nc-relationship" data-required-present={isStudent} aria-hidden="true">
      <div className="nc-condition"><span>The requirement</span><strong>Being a student</strong><small>{isStudent ? 'Present' : 'Missing'}</small></div>
      <div className="nc-enrollment"><span>Law-school enrollment</span><strong>{isStudent ? 'Possible' : 'Ruled out'}</strong><small>{isStudent ? 'Still needs to be established' : 'Cannot hold without being a student'}</small></div>
    </div>
    <div className="nc-reading" id={`${id}-reading`} role="status" aria-live="polite" aria-atomic="true">
      <h4>{isStudent ? "Being a student doesn't tell us whether you're enrolled in law school." : "Without being a student, you can't be enrolled in law school."}</h4>
      <p>{isStudent ? "You could be enrolled in law school, or you could study something else. Either way, you're a student. Meeting this requirement alone doesn't establish enrollment." : "Anyone enrolled in law school has to be a student. You can't have enrollment while being a student is missing. That's why being a student is necessary."}</p>
    </div>
  </section>;
}
