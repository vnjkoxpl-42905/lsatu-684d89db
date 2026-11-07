import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import './prototype/progress-prototype.css';
import './strengths.css';
import { useReviewProgressSnapshot } from '@/components/review/ReviewProgressSnapshotBoundary';
import { useStrengthsWeaknesses, type StrengthsResult } from '@/hooks/useStrengthsWeaknesses';
import {
  MIN_TYPE_ANSWERS,
  STRENGTH_AT,
  WEAKNESS_BELOW,
  practiceTypePath,
  typeEvidencePath,
  type TypeEarly,
  type TypeResult,
} from '@/lib/strengthsWeaknesses';

function ResultRows({
  rows,
  tone,
  onOpen,
}: {
  rows: TypeResult[];
  tone: 'strength' | 'weakness' | 'steady';
  onOpen: (topic: string) => void;
}) {
  return (
    <div className="pp-topic-rows">
      {rows.map((row) => (
        <button
          type="button"
          key={row.topic}
          className="pp-topic-row"
          onClick={() => onOpen(row.topic)}
          aria-label={`${row.topic}, ${row.percent} percent, ${row.correct} of ${row.denominator} first answers correct. Open the questions behind it.`}
        >
          <span className="pp-topic-name">
            {row.topic}
            <small>{row.denominator} first answers</small>
          </span>
          <span className="pp-topic-bar" aria-hidden="true">
            <span style={{ width: `${row.percent}%` }} />
            <i className="pp-topic-missed" style={{ width: `${100 - row.percent}%` }} />
          </span>
          <span className="pp-topic-stat" data-tone={tone}>
            <strong>{row.percent}%</strong>
            <small>{row.correct} of {row.denominator} correct</small>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function Building({ rows }: { rows: TypeEarly[] }) {
  if (!rows.length) return null;
  return (
    <section className="pp-panel" aria-label="Still building">
      <div className="pp-panel-heading">
        <div>
          <h3>Still building</h3>
          <p>
            These types have fewer than {MIN_TYPE_ANSWERS} first answers, so they are not
            sorted yet. A couple of answers can be luck either way.
          </p>
        </div>
      </div>
      <ul className="pp-sw-building">
        {rows.map((row) => (
          <li key={row.topic}>
            <strong>{row.topic}</strong>
            <span>{row.correct} of {row.denominator} so far</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The student's own strengths and weaknesses, by LR question type. Reads only; nothing here writes. */
export default function StrengthsWeaknessesPage() {
  const snapshot = useReviewProgressSnapshot();
  return <StrengthsWeaknessesView result={useStrengthsWeaknesses({ snapshot })} />;
}

/** The page with its data handed in, so it can be previewed and tested without a student account. */
export function StrengthsWeaknessesView({ result }: { result: StrengthsResult }) {
  const navigate = useNavigate();
  const { status, summary, overall, refresh } = result;
  const open = (topic: string) => navigate(typeEvidencePath(topic));

  if (status === 'loading')
    return <div className="progress-lab"><p role="status" className="pp-empty">Loading your saved answers…</p></div>;
  if (status === 'denied')
    return <div className="progress-lab"><p className="pp-empty">This account cannot view this progress.</p></div>;
  if (status === 'error')
    return (
      <div className="progress-lab">
        <p role="alert" className="pp-empty">
          Your saved answers could not be loaded.{' '}
          <button type="button" className="pp-text-action" onClick={refresh}>Try again</button>
        </p>
      </div>
    );

  const { strengths, weaknesses, steady, building, recommended, withheld, totalAnswers } = summary;
  const nothingSorted = !strengths.length && !weaknesses.length && !steady.length;

  return (
    <div className="progress-lab is-production pp-sw">
      <header className="pp-sw-head">
        <span className="pp-kicker">Logical Reasoning · all your saved answers</span>
        <h2>Strengths and weaknesses</h2>
        <p>
          Sorted by how often your first answer to a question was right. A type needs{' '}
          {MIN_TYPE_ANSWERS} first answers before it is sorted: {STRENGTH_AT}% or more is a
          strength, under {WEAKNESS_BELOW}% is a weakness. This updates every time you finish
          a drill.
        </p>
      </header>

      {withheld ? (
        <p className="pp-empty">
          Some saved LR answers could not be checked, so nothing is sorted right now. This
          is better than showing you a wrong picture. Try again in a moment.
        </p>
      ) : nothingSorted ? (
        <section className="pp-panel" aria-label="Nothing to sort yet">
          <h3>Your picture fills in as you practise</h3>
          <p>
            {totalAnswers === 0
              ? 'You have no saved first answers yet. Finish a drill and your strengths and weaknesses start here.'
              : `You have ${totalAnswers} saved first ${totalAnswers === 1 ? 'answer' : 'answers'} so far. Once a question type has ${MIN_TYPE_ANSWERS} of them, it appears below.`}
          </p>
          <button type="button" className="pp-button" onClick={() => navigate('/classroom')}>
            Back to Home
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </section>
      ) : (
        <>
          {overall.percent !== null && (
            <p className="pp-sw-overall">
              Overall: <strong>{overall.percent}%</strong> of your first answers are right
              ({overall.correct} of {overall.denominator}).
            </p>
          )}
          {recommended && (
            <aside className="pp-focus-panel pp-sw-next" aria-label="Practise next">
              <span className="pp-kicker">Practise next</span>
              <h2>{recommended.topic}</h2>
              <p className="pp-focus-figure">
                <strong>{recommended.correct} of {recommended.denominator}</strong> first answers right
              </p>
              <button
                type="button"
                className="pp-button pp-button-light"
                onClick={() => navigate(practiceTypePath(recommended.topic, '/review/strengths'))}
              >
                Practise 6 {recommended.topic} questions
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              <small>Starts with easier questions. Smart Drill keeps adjusting from your answers.</small>
            </aside>
          )}
          <section className="pp-panel" aria-label="Strengths">
            <div className="pp-panel-heading">
              <div><h3>Strengths</h3><p>Types where you are getting the first answer right most of the time.</p></div>
            </div>
            {strengths.length
              ? <ResultRows rows={strengths} tone="strength" onOpen={open} />
              : <p className="pp-empty">No type is at {STRENGTH_AT}% yet. That is normal early on.</p>}
          </section>
          <section className="pp-panel" aria-label="Weaknesses">
            <div className="pp-panel-heading">
              <div><h3>Weaknesses</h3><p>Types worth more practice. Open one to see the exact questions you missed.</p></div>
            </div>
            {weaknesses.length
              ? <ResultRows rows={weaknesses} tone="weakness" onOpen={open} />
              : <p className="pp-empty">No type is under {WEAKNESS_BELOW}% right now.</p>}
          </section>
          {steady.length > 0 && (
            <section className="pp-panel" aria-label="In between">
              <div className="pp-panel-heading">
                <div><h3>In between</h3><p>Between {WEAKNESS_BELOW}% and {STRENGTH_AT}%. Neither a strength nor a weakness yet.</p></div>
              </div>
              <ResultRows rows={steady} tone="steady" onOpen={open} />
            </section>
          )}
        </>
      )}
      {!withheld && <Building rows={building} />}
    </div>
  );
}
