import { useEffect, useRef, useState } from 'react';

/** Keeps the rule readable while drawing attention to its complete required clause. */
export function NecessaryConditionStatement() {
  const container = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    if (!container.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPlay(value => value || 1);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return <figure className="nc-statement" ref={container}>
    <blockquote>
      <span className="nc-statement-if">If you are enrolled in law school,</span>{' '}
      <strong key={play} className={`nc-statement-then${play ? ' nc-statement-emphasis' : ''}`}>
        <span className="nc-then-indicator">then</span> you are a student.
      </strong>
    </blockquote>
    <figcaption>
      <div className="nc-statement-roles">
        <div><span>Sufficient condition</span><strong>You are enrolled in law school</strong><p>Enough to establish that you are a student.</p></div>
        <div><span>Necessary condition</span><strong>You are a student</strong><p>Required whenever you are enrolled in law school.</p></div>
      </div>
      <p className="nc-statement-key"><strong>Then</strong> is the indicator. <strong>You are a student</strong> is the complete condition it introduces.</p>
    </figcaption>
    <button type="button" className="nc-replay" onClick={() => setPlay(value => value + 1)}>Replay emphasis</button>
  </figure>;
}
