import { canRevealRcResults } from '../lib/rcResultsReveal';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { abandonSession, getSessionAttempts, listSessions } from '../api/rcProgress';
import { REVEAL_LABELS, type RcDrillSession } from '../lib/rcTypes';
import { timedSectionResumeHref } from '@/lib/timedSectionAdoption';

/**
 * A student's RC drills: resume an unfinished one, open the results of a
 * finished one, or discard unfinished ordinary work while keeping its answers. Self-loading, because it is mounted in two
 * places (the standalone /rc surface and the drill hub's RC practice bay) and
 * threading sessions through both callers would give the two a way to disagree
 * about what has been drilled.
 *
 * Scores count FIRST attempts only, so this row and the results page can never
 * report different numbers for the same session.
 */
export function RcSessionHistory({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = React.useState<RcDrillSession[]>([]);
  const [scores, setScores] = React.useState<Map<string, { correct: number; total: number }>>(
    new Map(),
  );
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [discardError, setDiscardError] = React.useState<string | null>(null);
  const [discarding, setDiscarding] = React.useState<string | null>(null);
  const discardLock = React.useRef(false);

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const list = await listSessions();
      if (signal?.cancelled) return;
      setSessions(list.filter(s => s.status === 'in_progress' || s.status === 'completed'));
      const done = list.filter(canRevealRcResults);
      const pairs = await Promise.all(
        done.map(async (x) => {
          const rows = (await getSessionAttempts(x.id)).filter((a) => a.isFirstAttempt);
          return [
            x.id,
            { correct: rows.filter((a) => a.isCorrect === true).length, total: rows.length },
          ] as const;
        }),
      );
      if (!signal?.cancelled) setScores(new Map(pairs));
    } catch {
      /* Not "no drills yet". A failed query — outage, RLS, a missing table —
         is a different thing from an empty history, and rendering the empty
         state for it tells a student their work is gone. */
      if (!signal?.cancelled) setError(true);
    } finally {
      if (!signal?.cancelled) setLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const discard = async (id: string) => {
    if (discardLock.current) return;
    const session = sessions.find(s => s.id === id);
    if (!session || session.status !== 'in_progress' || session.config.timedSectionSittingId || session.config.practiceTestRunId) return;
    if (!window.confirm('Discard this unfinished drill? Your saved answers and timings stay on your account.')) return;
    discardLock.current = true; setDiscarding(id); setDiscardError(null);
    try {
      await abandonSession(id);
      setSessions(previous => previous.filter(s => s.id !== id));
    } catch (err) {
      setDiscardError(err instanceof Error ? err.message : 'The drill could not be discarded. Try again.');
    } finally { discardLock.current = false; setDiscarding(null); }
  };

  if (error) {
    return (
      <p className="rc-empty">
        Your reading drills could not be loaded. Reload the page to try again.
      </p>
    );
  }

  if (loaded && sessions.length === 0) {
    return <p className="rc-empty">No reading drills yet.</p>;
  }

  return (
    <div className={tone === 'dark' ? 'rc-history rc-embedded' : 'rc-history'}>
      {discardError && <p role="alert">{discardError}</p>}
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`rc-session-row${s.excludedFromAnalytics ? ' rc-session-excluded' : ''}`}
        >
          <span>
            {s.passageIds.length} passage{s.passageIds.length === 1 ? '' : 's'} ·{' '}
            {s.config.timing.mode === 'unlimited' ? 'untimed' : 'timed'} ·{' '}
            {REVEAL_LABELS[s.config.reveal] ?? 'Feedback timing not recorded'}
          </span>
          <span className="rc-status-chip">
            {s.status === 'in_progress' ? 'in progress' : s.status}
          </span>
          {canRevealRcResults(s) && scores.has(s.id) && (
            <span>
              {scores.get(s.id)!.correct} / {scores.get(s.id)!.total}
            </span>
          )}
          {s.excludedFromAnalytics && <span className="rc-status-chip">excluded</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {s.status === 'in_progress' ? (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate(s.config.timedSectionSittingId ? timedSectionResumeHref(s.config.timedSectionSittingId) : '/rc/drill?sessionId=' + s.id)}
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate('/rc/results/' + s.id)}
              >
                Results
              </button>
            )}
            {s.status === 'in_progress' && !s.config.timedSectionSittingId && !s.config.practiceTestRunId && (
              <button type="button" className="rc-chip" disabled={!!discarding} onClick={() => void discard(s.id)}>
                {discarding === s.id ? 'Discarding…' : 'Discard'}
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default RcSessionHistory;
