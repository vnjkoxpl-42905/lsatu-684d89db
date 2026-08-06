import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createSession,
  getSession,
  getSessionAttempts,
  setSessionExcluded,
} from '../api/rcProgress';
import { loadPassages } from '../lib/rcBank';
import { buildItems, type RcSessionItem } from '../lib/rcSession';
import {
  RC_LETTERS,
  RC_SECONDS_PER_QUESTION_BUDGET,
  type RcAttempt,
  type RcDrillSession,
  type RcPassage,
} from '../lib/rcTypes';
import '../rc.css';

/** m:ss. Results show real recorded time, never an estimate. */
function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function signedClock(ms: number): string {
  const sign = ms >= 0 ? '+' : '-';
  return sign + clock(Math.abs(ms));
}

type ResultFilter = 'all' | 'incorrect' | 'correct';

export default function RcResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = React.useState<RcDrillSession | null>(null);
  const [passages, setPassages] = React.useState<RcPassage[]>([]);
  const [attempts, setAttempts] = React.useState<RcAttempt[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [excluded, setExcluded] = React.useState(false);

  const [resultFilter, setResultFilter] = React.useState<ResultFilter>('all');
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>('');

  React.useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (!s) throw new Error('That drill could not be found.');
        const [ps, as] = await Promise.all([loadPassages(s.passageIds), getSessionAttempts(sessionId)]);
        if (cancelled) return;
        setSession(s);
        setExcluded(s.excludedFromAnalytics);
        setPassages(ps);
        setAttempts(as);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const items = React.useMemo(() => buildItems(passages), [passages]);

  /** Scoring uses first attempts only, so a review re-answer never inflates it. */
  const firstAttempts = React.useMemo(() => {
    const map = new Map<number, RcAttempt>();
    for (const a of attempts) if (a.isFirstAttempt) map.set(a.questionId, a);
    return map;
  }, [attempts]);

  if (error) {
    return (
      <div className="rc-page">
        <h1>Results</h1>
        <p className="rc-page-sub">{error}</p>
        <button type="button" className="rc-button" onClick={() => navigate('/rc')}>
          Go to Reading Comprehension
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rc-page">
        <p className="rc-page-sub">Loading your results…</p>
      </div>
    );
  }

  const total = items.length;
  const correct = items.filter(
    (i) => firstAttempts.get(i.question.questionId)?.isCorrect === true,
  ).length;
  const totalMs = [...firstAttempts.values()].reduce((n, a) => n + a.timeMs, 0);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const perPassage = passages.map((p) => {
    const own = items.filter((i) => i.passage.passageId === p.passageId);
    const right = own.filter(
      (i) => firstAttempts.get(i.question.questionId)?.isCorrect === true,
    ).length;
    const ms = own.reduce((n, i) => n + (firstAttempts.get(i.question.questionId)?.timeMs ?? 0), 0);
    return { passage: p, count: own.length, right, ms, avgMs: own.length ? ms / own.length : 0 };
  });

  const isTimed = session.config.timing.mode === 'per_passage_budget';

  const visibleItems = items.filter((i) => {
    const a = firstAttempts.get(i.question.questionId);
    if (resultFilter === 'correct' && a?.isCorrect !== true) return false;
    if (resultFilter === 'incorrect' && a?.isCorrect === true) return false;
    if (flaggedOnly && !a?.flagged) return false;
    if (typeFilter && i.question.questionType !== typeFilter) return false;
    if (difficultyFilter && String(i.question.difficulty) !== difficultyFilter) return false;
    return true;
  });

  const questionTypes = [...new Set(items.map((i) => i.question.questionType))].sort();
  const difficulties = [...new Set(items.map((i) => i.question.difficulty))]
    .filter((d) => d != null)
    .sort();

  const missedPassageIds = [
    ...new Set(
      items
        .filter((i) => firstAttempts.get(i.question.questionId)?.isCorrect === false)
        .map((i) => i.passage.passageId),
    ),
  ];

  const drillMisses = async () => {
    const fresh = await createSession(
      { ...session.config, source: 'manual' },
      missedPassageIds,
    );
    navigate('/rc/drill?sessionId=' + fresh.id);
  };

  const toggleExcluded = async () => {
    const next = !excluded;
    setExcluded(next);
    await setSessionExcluded(session.id, next);
  };

  return (
    <div className="rc-page">
      <h1>Results</h1>
      <p className="rc-page-sub">
        {passages.length} passage{passages.length === 1 ? '' : 's'} ·{' '}
        {isTimed ? 'timed' : 'untimed'}
      </p>

      {/* Score. No PrepTest-equivalent and no percentile: we do not have the
          cohort data those would need. */}
      <div className="rc-card">
        <div className="rc-hero">
          <span className="rc-hero-score">
            {correct} / {total}
          </span>
          <span className="rc-hero-meta">{percent}%</span>
          <span className="rc-hero-meta">{clock(totalMs)} total</span>
        </div>
        <div className="rc-hero-meta">
          {perPassage.map((p) => (
            <span key={p.passage.passageId} style={{ marginRight: 16 }}>
              {p.passage.title}: {clock(p.ms)}
            </span>
          ))}
        </div>
      </div>

      <h2>By passage</h2>
      <div className="rc-passage-cards">
        {perPassage.map((p) => (
          <div className="rc-card" key={p.passage.passageId} style={{ marginBottom: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{p.passage.title}</div>
            <div className="rc-chip-row" style={{ marginBottom: 10 }}>
              {p.passage.topic && <span className="rc-status-chip">{p.passage.topic}</span>}
              {p.passage.format && <span className="rc-status-chip">{p.passage.format}</span>}
              {p.passage.frameworks.map((f) => (
                <span className="rc-status-chip" key={f}>
                  {f}
                </span>
              ))}
            </div>
            <div className="rc-hero-meta">
              {p.right} / {p.count} · difficulty {p.passage.difficulty ?? '—'} ·{' '}
              {clock(p.avgMs)} per question
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 32 }}>Every question</h2>
      <div className="rc-chip-row" style={{ marginBottom: 14 }}>
        {(['all', 'incorrect', 'correct'] as ResultFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`rc-chip${resultFilter === f ? ' rc-active' : ''}`}
            onClick={() => setResultFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'incorrect' ? 'Incorrect' : 'Correct'}
          </button>
        ))}
        <button
          type="button"
          className={`rc-chip${flaggedOnly ? ' rc-active' : ''}`}
          onClick={() => setFlaggedOnly((v) => !v)}
        >
          Flagged
        </button>
        <select
          className="rc-chip"
          value={typeFilter}
          aria-label="Question type"
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Any type</option>
          {questionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="rc-chip"
          value={difficultyFilter}
          aria-label="Difficulty"
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">Any difficulty</option>
          {difficulties.map((d) => (
            <option key={d} value={String(d)}>
              Difficulty {d}
            </option>
          ))}
        </select>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Passage</th>
            <th>Type</th>
            <th>Difficulty</th>
            <th>Answers</th>
            <th>Time</th>
            <th>Flag</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item: RcSessionItem) => {
            const a = firstAttempts.get(item.question.questionId);
            const deltaMs = a ? a.timeMs - RC_SECONDS_PER_QUESTION_BUDGET * 1000 : 0;
            return (
              <tr key={item.question.questionId}>
                <td>{item.number}</td>
                <td>{item.passage.title}</td>
                <td>{item.question.questionType}</td>
                <td>{item.question.difficulty ?? '—'}</td>
                <td>
                  <span className="rc-letter-strip">
                    {RC_LETTERS.map((letter) => {
                      const choice = item.question.choices.find((c) => c.letter === letter);
                      const classes = ['rc-letter-cell'];
                      if (a?.selected === letter) classes.push('rc-letter-picked');
                      if (item.question.correctAnswer === letter) classes.push('rc-letter-correct');
                      return (
                        <span key={letter} className={classes.join(' ')}>
                          <span>{letter}</span>
                          <span className="rc-letter-percent">
                            {choice?.percent != null ? `${choice.percent}%` : ''}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </td>
                <td>
                  {a ? clock(a.timeMs) : '—'}
                  {a && isTimed && (
                    <div className={deltaMs > 0 ? 'rc-delta-over' : 'rc-delta-under'}>
                      {signedClock(deltaMs)}
                    </div>
                  )}
                </td>
                <td>{a?.flagged ? '⚑' : ''}</td>
                <td>
                  <button
                    type="button"
                    className="rc-chip"
                    onClick={() =>
                      navigate(
                        `/rc/drill?sessionId=${session.id}&review=1&q=${item.question.questionId}`,
                      )
                    }
                  >
                    Review
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {visibleItems.length === 0 && <p className="rc-empty">Nothing matches those filters.</p>}

      <div className="rc-actions">
        <button
          type="button"
          className="rc-button"
          onClick={() => navigate(`/rc/drill?sessionId=${session.id}&review=1`)}
        >
          Review all
        </button>
        <button
          type="button"
          className="rc-button"
          disabled={missedPassageIds.length === 0}
          title={
            missedPassageIds.length === 0
              ? 'You did not miss anything in this drill'
              : undefined
          }
          onClick={drillMisses}
        >
          Drill your misses
        </button>
        <button type="button" className="rc-button" onClick={() => navigate('/rc')}>
          New drill
        </button>
        <button
          type="button"
          className={`rc-button${excluded ? ' rc-active' : ''}`}
          aria-pressed={excluded}
          onClick={toggleExcluded}
        >
          {excluded ? 'Counted in your progress' : 'Exclude from analytics'}
        </button>
      </div>
    </div>
  );
}
