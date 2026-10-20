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
        <p>Set the passage count and filters. We’ll choose a matching set for you to preview.</p>
        <button type="button" className="rc-practice-entry" onClick={onChooseAutomatic}>Set up an RC drill <span aria-hidden="true">→</span></button>
      </div>
      <div className="rc-practice-choice">
        <h2>Pick your passages</h2>
        <p>Find passages by title or PrepTest. Arrange your selection before you start.</p>
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

export function RcPracticeResume({ title, source, detail, onResume }: { title: string; source?: string; detail: string; onResume: () => void }) {
  const firstAnswers = detail.match(/^(\d+) first answers? saved$/);
  const progress = firstAnswers ? Number(firstAnswers[1]) === 0 ? 'No answers saved yet'
    : `${Number(firstAnswers[1])} answer${Number(firstAnswers[1]) === 1 ? '' : 's'} saved` : detail;
  return <button type="button" className="rc-practice-resume" aria-label={`Resume RC drill: ${title}`} onClick={onResume}>
    <span><span className="rc-practice-resume-label">Resume your drill</span><strong>{title}</strong>{source && <span className="rc-practice-resume-source">{source}</span>}<small>{progress}</small></span>
    <span className="rc-practice-resume-continue">Continue <span aria-hidden="true">→</span></span>
  </button>;
}
