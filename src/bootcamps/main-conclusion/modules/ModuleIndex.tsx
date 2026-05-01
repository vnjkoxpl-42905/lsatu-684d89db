import { Link } from 'react-router-dom';

const BC = '/bootcamp/structure';
const modules = [
  { id: 'M1', name: 'Lessons', to: `${BC}/lessons`, desc: '12 voice-led lessons + capstone calibration. Voice register 2 (whimsical) for prose; register 1 (decisive) for callouts.' },
  { id: 'M2', name: 'Reference + Indicator Vault', to: `${BC}/reference`, desc: 'Glanceable companion. The Indicator Vault, FABS, the 2-Part Conclusion Check. Always accessible.' },
  { id: 'M3', name: 'Drills', to: `${BC}/drills`, desc: '9 drills, stratified by mechanic. Each drill is its own Stage-Gate.' },
  { id: 'M4', name: 'Question Simulator + Trap Master', to: `${BC}/simulator`, desc: 'Real LSAT-format questions with full 5-choice answer set + 7-trait diagnostic. Unlocks after Drill 3.4.' },
  { id: 'M5', name: 'Reading Hard Sentences', to: `${BC}/hard-sentences`, desc: 'Decompose monsters called cluster sentences.' },
  { id: 'M6', name: 'Diagnostics + AI Tutor + Progress', to: `${BC}/diagnostics`, desc: 'Calibration after teaching, not gatekeeping before. Populates after Lesson 1.13 capstone.' },
];

export function ModuleIndex(): JSX.Element {
  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1000px] mx-auto">
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">Main Conclusion / Argument Structure Bootcamp</div>
      <h1 className="font-mc-serif text-display font-semibold mt-2 leading-tight">
        The most salvageable question type ever.
      </h1>
      <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[64ch]">
        A premium private-academy bootcamp for Main Conclusion / Argument Structure. Six modules,
        gate-driven, calibration after teaching. Start with Lesson 1.1.
      </p>

      <ul className="mt-12 grid desktop:grid-cols-2 gap-4">
        {modules.map((m) => (
          <li key={m.id}>
            <Link
              to={m.to}
              className="block px-5 py-4 rounded-5 border border-[rgb(var(--border)/0.08)] bg-surface hover:border-[rgb(var(--accent)/0.4)] hover:bg-surface-elev transition-colors duration-150 ease-eased"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">{m.id}</span>
                <span className="font-mc-serif text-h3 grow">{m.name}</span>
              </div>
              <p className="text-body text-ink-soft mt-2">{m.desc}</p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 font-mc-mono text-mono text-ink-faint">
        Gate 4 — Module 1 Lesson 1.1 vertical slice review. Per-lesson template locks at this review.
      </p>
    </div>
  );
}
