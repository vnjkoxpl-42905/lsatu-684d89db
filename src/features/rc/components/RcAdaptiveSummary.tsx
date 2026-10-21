import type { RcAdaptiveSummaryData } from '../lib/rcAdaptiveSummary';

export function RcAdaptiveSummary({ summary }: { summary: RcAdaptiveSummaryData }) {
  if (summary.hiddenResults) return <details className="rc-adaptive-details" aria-label="How Adaptive chooses passages">
    <summary>How Adaptive chooses passages</summary>
    <p>Some saved results are still hidden. Accuracy, sample details, and the target difficulty stay hidden until those results are revealed.</p>
    <p>While results remain hidden, Adaptive uses only disclosed first-take grades. If none are available, it uses the starting level. A review correction is not a new first take.</p>
  </details>;
  return <details className="rc-adaptive-details" aria-label="How Adaptive chooses passages">
    <summary>How Adaptive chooses passages</summary>
    <p>Adaptive starts near difficulty {summary.target}, then prefers passages with fewer attempts.</p>
    {summary.recent ? <p>Your latest graded first take on each of your {summary.recent.total} most recent questions: {Math.round(summary.recent.accuracy * 100)}% correct. Up to 40 questions count. Skips and abandoned work do not add a grade.</p>
      : <p>No graded first-take history yet. The starting target is difficulty 2.</p>}
    {summary.firstEver && <p>On the first graded answer ever recorded for each question: {summary.firstEver.correct}/{summary.firstEver.total} correct.</p>}
    <p>{summary.reviewCorrections} question{summary.reviewCorrections === 1 ? '' : 's'} corrected in review after a missed first take. Review corrections describe that visit; they do not establish mastery or change first-take accuracy.</p>
    <p>These figures describe saved answers. They do not predict your next score.</p>
  </details>;
}
