import { ResultBadge, ResultDistribution } from '@/features/conditional-feedback/ConditionalResults';
import './unless-round-results.css';
export interface UnlessRoundOutcome { pattern: number; seconds: number; timedOut: boolean; verdict: string }
export function unlessOutcome(result: UnlessRoundOutcome) {
  return result.timedOut ? { tone: 'missed' as const, label: 'Time ran out' } : result.verdict === 'correct' ? { tone: 'correct' as const, label: 'Correct in time' } : { tone: 'missed' as const, label: 'Needs review' };
}
export function UnlessRoundResults({ results, paceSeconds, onSelect }: { results: readonly UnlessRoundOutcome[]; paceSeconds: number; onSelect: (index: number) => void }) {
  const correct = results.filter(result => unlessOutcome(result).tone === 'correct').length;
  const timeout = results.filter(result => result.timedOut).length;
  return <section className="ud-round-results" aria-label="This round's outcomes"><ResultDistribution title="This round" segments={[
    { id: 'correct', label: 'Correct in time', tone: 'correct', count: correct },
    { id: 'missed', label: 'Needs review', tone: 'missed', count: results.length - correct - timeout },
    { id: 'timeout', label: 'Time ran out', tone: 'missed', count: timeout },
  ]}/><p>{results.length} {results.length === 1 ? 'statement' : 'statements'} in this round. Each had a {paceSeconds}-second limit.</p><ol>{results.map((result, index) => { const outcome = unlessOutcome(result); return <li key={index}><button type="button" aria-label={`Review statement ${index + 1}, form ${result.pattern}: ${outcome.label}`} onClick={() => onSelect(index)}><span className="ud-round-result-title">Statement {index + 1}<small>Form {result.pattern}</small></span><ResultBadge {...outcome}/><span className="ud-result-time">{result.seconds.toFixed(1)}s elapsed</span><span className="ud-elapsed-track" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, result.seconds / Math.max(paceSeconds, 1) * 100))}%` }}/></span></button></li>; })}</ol></section>;
}
