import type { ReactNode } from 'react';

interface RcPracticeLandingProps {
  onChooseAutomatic: () => void;
  onChooseManual: () => void;
  practice: ReactNode;
  assigned: ReactNode;
}

export function RcPracticeLanding({ onChooseAutomatic, onChooseManual, practice, assigned }: RcPracticeLandingProps) {
  return <div className="rc-practice-landing">
    <section className="rc-practice-hero" aria-label="Build an RC drill">
      <div className="rc-practice-choice">
        <h2>Choose for me</h2>
        <p>Choose how many passages and set your timing. We choose passages that match your filters for you to preview.</p>
        <button type="button" className="rc-practice-entry" onClick={onChooseAutomatic}>Set up an RC drill <span aria-hidden="true">→</span></button>
      </div>
      <div className="rc-practice-choice">
        <h2>Pick your passages</h2>
        <p>Find passages by title or PrepTest. Choose their order before you start.</p>
        <button type="button" className="rc-practice-entry" onClick={onChooseManual}>Pick passages <span aria-hidden="true">→</span></button>
      </div>
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
