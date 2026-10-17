/** Keeps the rule readable while drawing attention to its complete required clause. */
export function NecessaryConditionStatement() {
  return <figure className="nc-statement">
    <blockquote>
      <span className="nc-statement-if">If you are enrolled in law school,</span>{' '}
      <strong className="nc-statement-then nc-statement-emphasis">
        then you are a student.
      </strong>
    </blockquote>
    <figcaption>
      <div className="nc-statement-roles">
        <div><span>Sufficient condition</span><strong>You are enrolled in law school</strong><p>Enough to prove that you are a student.</p></div>
        <div><span>Necessary condition</span><strong>You are a student</strong><p>Required whenever you are enrolled in law school.</p></div>
      </div>
    </figcaption>
  </figure>;
}
