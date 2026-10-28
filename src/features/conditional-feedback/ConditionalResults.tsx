import { useId } from 'react';
import { Check, X, Eye, Circle, RotateCcw } from 'lucide-react';
import './conditional-results.css';

export type ResultTone = 'correct' | 'missed' | 'revealed' | 'neutral' | 'retry';
export interface ResultSegment { id: string; label: string; count: number; tone: ResultTone }
const symbols = { correct: Check, missed: X, revealed: Eye, neutral: Circle, retry: RotateCcw };
export function ResultBadge({ tone, label }: { tone: ResultTone; label: string }) {
  const Icon = symbols[tone];
  return <span className={`cfr-badge cfr-tone-${tone}`}><span className="cfr-symbol" aria-hidden="true"><Icon size={15} strokeWidth={2} /></span><span>{label}</span></span>;
}
export function ResultDistribution({ title, segments, onSelect }: { title: string; segments: ResultSegment[]; onSelect?: (id: string) => void }) {
  const heading = useId();
  const counts = segments.map(segment => ({ ...segment, count: Math.max(0, Math.floor(Number.isFinite(segment.count) ? segment.count : 0)) }));
  const total = counts.reduce((sum, segment) => sum + segment.count, 0);
  return <section className="cfr-distribution" aria-labelledby={heading}>
    <div className="cfr-distribution-heading"><h3 id={heading}>{title}</h3><span>{total} total</span></div>
    <div className="cfr-partition" aria-hidden="true">{counts.filter(segment => segment.count > 0).map(segment => <span key={segment.id} className={`cfr-tone-${segment.tone}`} style={{ flexGrow: segment.count }} />)}</div>
    <ul className="cfr-legend">{counts.map(segment => <li key={segment.id}>{onSelect && segment.count > 0 ? <button type="button" onClick={() => onSelect(segment.id)}><ResultBadge tone={segment.tone} label={segment.label} /><span className="cfr-count">{segment.count} of {total}</span></button> : <div><ResultBadge tone={segment.tone} label={segment.label} /><span className="cfr-count">{segment.count} of {total}</span></div>}</li>)}</ul>
    {total === 0 && <p className="cfr-empty">No results yet.</p>}
  </section>;
}
