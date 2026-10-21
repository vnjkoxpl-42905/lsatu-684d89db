import type { ReactNode } from 'react';

interface RcPracticeLandingProps {
  onChooseAutomatic: () => void;
  onChooseManual: () => void;
  practice: ReactNode;
  assigned: ReactNode;
}

export function RcPracticeLanding({ onChooseAutomatic, onChooseManual, practice, assigned }: RcPracticeLandingProps) {
  return <div className="rc-practice-landing">
    <section className="rc-practice-hero rc-practice-unified" aria-label="Create an RC drill">
      <div className="rc-practice-choice"><h2>Create your own RC drill</h2><p>Choose your passages and settings, review the selection, then start.</p><div className="rc-practice-entry-actions"><button type="button" className="rc-practice-entry rc-practice-primary" onClick={onChooseAutomatic}>Create your own RC drill</button><button type="button" className="rc-practice-secondary" onClick={onChooseManual}>Pick specific passages</button></div></div>
    </section>
    <div className="rc-practice-deck">
      <section className="drill-observatory-practice-bay rc-practice-history" aria-label="Your practice">
        <h2>Your practice</h2>
        {practice}
      </section>
      <section className="drill-observatory-today-bay">{assigned}</section>
    </div>
  </div>;
}

export function RcPracticeResume({ title, detail, onResume }: { title: string; detail: string; onResume: () => void }) {
  return <button type="button" className="rc-practice-resume" aria-label={`Resume RC drill: ${title}`} onClick={onResume}>
    <span><span className="rc-practice-resume-label">Resume your drill</span><strong>{title}</strong><small>{detail}</small></span>
    <span aria-hidden="true">→</span>
  </button>;
}
