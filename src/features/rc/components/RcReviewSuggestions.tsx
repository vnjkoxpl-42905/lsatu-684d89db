import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRcLearningEvents, type RcLearningEvent } from '../lib/rcLearning';
import { rcReviewRecommendations } from '../lib/rcReviewRecommendations';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcAttempt } from '../lib/rcTypes';

type RcReviewSuggestionsProps = { actorId: string; sessionId: string; items: RcSessionItem[]; firstAttempts: ReadonlyMap<number, RcAttempt> };

export function RcReviewSuggestions(props: RcReviewSuggestionsProps) {
  return <ActorRcReviewSuggestions key={`${props.actorId}:${props.sessionId}`} {...props} />;
}

function ActorRcReviewSuggestions({ actorId, sessionId, items, firstAttempts }: RcReviewSuggestionsProps) {
  const navigate = useNavigate();
  const [flagged, setFlagged] = React.useState(true); const [unanswered, setUnanswered] = React.useState(true);
  const [lowConfidence, setLowConfidence] = React.useState(false); const [timeThreshold, setTimeThreshold] = React.useState('');
  const [learning, setLearning] = React.useState<RcLearningEvent[]>([]); const [learningStatus, setLearningStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [revision, retry] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    if (!lowConfidence) return;
    let current = true; setLearningStatus('loading'); setLearning([]);
    void getRcLearningEvents(actorId, sessionId).then(events => { if (current) { setLearning(events); setLearningStatus('ready'); } })
      .catch(() => { if (current) setLearningStatus('error'); });
    return () => { current = false; };
  }, [actorId, sessionId, lowConfidence, revision]);
  const suggestions = rcReviewRecommendations(items, firstAttempts, learning, { flagged, unanswered, lowConfidence, timeThresholdMs: timeThreshold ? Number(timeThreshold) * 1000 : null });
  return <details className="mx-auto max-w-7xl rounded border p-4">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">Review suggestions</summary>
    <p className="text-sm">Choose your own reasons to review. These suggestions use your flags, answers, recorded time and optional confidence, and do not reveal correctness.</p>
    <div className="my-3 flex flex-wrap gap-3">
      <label><input type="checkbox" checked={flagged} onChange={event => setFlagged(event.target.checked)} /> Flagged</label>
      <label><input type="checkbox" checked={unanswered} onChange={event => setUnanswered(event.target.checked)} /> Unanswered</label>
      <label><input type="checkbox" checked={lowConfidence} onChange={event => setLowConfidence(event.target.checked)} /> Low confidence</label>
      <label>Recorded question time <select aria-label="Recorded question time threshold" className="rounded border bg-background" value={timeThreshold} onChange={event => setTimeThreshold(event.target.value)}>
        <option value="">Do not use time</option><option value="60">Over 60 seconds</option><option value="90">Over 90 seconds</option><option value="120">Over 120 seconds</option>
      </select></label>
    </div>
    <p className="text-sm">Missing confidence is Unknown. Recorded question time is not a confidence rating or a measurement of active reading.</p>
    {lowConfidence && learningStatus === 'loading' && <p role="status">Loading your confidence notes…</p>}
    {lowConfidence && learningStatus === 'error' && <p role="alert">Confidence notes could not be loaded. Confidence remains Unknown.<button type="button" className="min-h-11 px-3 underline" onClick={retry}>Retry confidence notes</button></p>}
    {suggestions.length ? <ul className="mt-3 space-y-2">{suggestions.map(suggestion => <li key={suggestion.questionId}>
      <button type="button" className="min-h-11 underline" onClick={() => navigate(`/rc/drill?sessionId=${encodeURIComponent(sessionId)}&review=1&q=${suggestion.questionId}`)}>{suggestion.source}</button>
      <span className="ml-2 text-sm">{suggestion.reasons.join(' · ')}</span>
    </li>)}</ul> : <p className="mt-3 text-sm">No questions match these review reasons. You can still review every question.</p>}
  </details>;
}
