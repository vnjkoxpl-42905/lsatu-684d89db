import { useId, useState } from 'react';

export function NecessaryConditionExperience() {
  const [isStudent, setIsStudent] = useState(true);
  const id = useId();
  return <section className="nc-experience" aria-labelledby={`${id}-heading`}>
    <header>
      <h3 id={`${id}-heading`}>Can enrollment still fit without the requirement?</h3>
      <p>Being a student is required for law-school enrollment. Compare what happens with and without that condition.</p>
    </header>
    <div className="nc-controls" role="group" aria-label="Compare the requirement being present or missing">
      <button type="button" aria-pressed={isStudent} aria-controls={`${id}-reading`} onClick={() => setIsStudent(true)}>A student</button>
      <button type="button" aria-pressed={!isStudent} aria-controls={`${id}-reading`} onClick={() => setIsStudent(false)}>Not a student</button>
    </div>
    <div className="nc-relationship" data-required-present={isStudent} aria-hidden="true">
      <div className="nc-condition"><span>The requirement</span><strong>{isStudent ? 'Being a student' : 'Not a student'}</strong><small>{isStudent ? 'Present' : 'Missing'}</small></div>
      <div className="nc-enrollment"><span>Law-school enrollment</span><strong>{isStudent ? 'Possible' : 'Ruled out'}</strong><small>{isStudent ? 'Still needs to be established' : 'Cannot hold without being a student'}</small></div>
    </div>
    <div className="nc-reading" id={`${id}-reading`} role="status" aria-live="polite" aria-atomic="true">
      <h4>{isStudent ? 'The requirement is met. Enrollment is still an open question.' : "Without being a student, you can't be enrolled in law school."}</h4>
      <p>{isStudent ? "A law-school student and a history student both meet this requirement. Being a student allows law-school enrollment, but doesn't establish it." : "Anyone enrolled in law school has to be a student. Take away being a student, and enrollment no longer fits the relationship. That's why being a student is necessary."}</p>
    </div>
  </section>;
}
