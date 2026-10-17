import { canRevealRcResults } from '../lib/rcResultsReveal';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteSession, getSessionAttempts, listSessions } from '../api/rcProgress';
import { REVEAL_LABELS, type RcDrillSession } from '../lib/rcTypes';
import { timedSectionResumeHref } from '@/lib/timedSectionAdoption';

/**
 * A student's RC drills: resume an unfinished one, open the results of a
 * finished one, delete either. Self-loading, because it is mounted in two
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

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const list = await listSessions();
      if (signal?.cancelled) return;
      setSessions(list);
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

  const remove = async (id: string) => {
    const ok = window.confirm(
      'Delete this drill? Its answers and timings are deleted with it, and that cannot be undone.',
    );
    if (!ok) return;
    try {
      await deleteSession(id);
      setSessions(await listSessions());
    } catch {
      setError(true);
    }
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
            <button type="button" className="rc-chip" disabled={!!s.config.timedSectionSittingId || !!s.config.practiceTestRunId} title={s.config.timedSectionSittingId || s.config.practiceTestRunId ? 'Protected section records retain their saved answers and timings.' : undefined} onClick={() => remove(s.id)}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

export default RcSessionHistory;
