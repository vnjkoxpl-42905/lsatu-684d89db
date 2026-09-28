import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useDossier } from './StudentDossier';
import { selectDossierReviewEvidence } from './dossierReviewEvidence';

const PAGE_SIZE = 30;

export default function DossierReview() {
  const { studentId, studentName } = useDossier();
  const { resolution, ledger, loading, error, refresh } = useFirstAnswerProgress('all', studentId);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const misses = useMemo(() => selectDossierReviewEvidence(ledger?.answers ?? []), [ledger]);
  const missing = ledger?.coverage.missingSources ?? [];

  return (
    <div className="space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">Saved answer review</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-black/55">
            {studentName || 'This student'}'s questions missed on the first saved, graded answer. Reattempts do not remove a miss. This view is evidence for teaching, not a scored practice session.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="../work" className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">Open work</Link>
          <Link to="../notes" className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">Post recap</Link>
        </div>
      </header>

      {loading ? <p role="status" className="text-sm text-black/55">Loading saved answers…</p>
        : resolution.state === 'denied' ? <p role="alert" className="text-sm text-black/55">This student's saved answers are unavailable to this account.</p>
        : error ? (
          <div role="alert" className="border border-amber-800/20 bg-amber-50/50 p-4 text-sm text-black/70">
            <p>Saved answers could not be loaded.</p>
            <button type="button" onClick={() => void refresh()} className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Retry</button>
          </div>
        ) : !ledger || ledger.coverage.includedSources.length === 0 ? (
          <p role="alert" className="text-sm text-black/55">Saved answer sources are unavailable. No review list can be calculated.</p>
        ) : (
          <>
            {missing.length > 0 && (
              <p role="status" className="border border-amber-800/20 bg-amber-50/50 p-3 text-xs text-black/70">
                Partial data: {missing.map((item) => item.source.replace(/_/g, ' ')).join(', ')} could not be loaded. The list below covers available saved sources only.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-black/60">
              <strong className="text-black">{misses.length} first-answer {misses.length === 1 ? 'miss' : 'misses'}</strong>
              <span>{misses.filter((item) => item.area === 'LR').length} LR</span>
              <span>{misses.filter((item) => item.area === 'RC').length} RC</span>
            </div>
            <p className="text-xs leading-relaxed text-black/60">Saved wrong-answer notes, flags, active sessions, and ungraded work are not included here yet. Open the student's Work tab to assign a follow-up.</p>
            {misses.length === 0 ? (
              <p className="border border-black/10 bg-white/20 p-4 text-sm text-black/55">No first-answer misses in the available saved sources.</p>
            ) : (
              <ul className="divide-y divide-black/10 border border-black/10 bg-white/20">
                {misses.slice(0, limit).map((item) => (
                  <li key={item.key} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <strong className="break-all text-[13px] text-black">{item.label}</strong>
                      <p className="mt-1 text-black/55">{item.area === 'LR' ? 'Logical Reasoning' : 'Reading Comprehension'}{item.topic ? ` · ${item.topic}` : ''} · {item.source}</p>
                    </div>
                    <time className="shrink-0 text-black/60" dateTime={item.firstAnsweredAt}>
                      {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(item.firstAnsweredAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            {misses.length > limit && (
              <button type="button" onClick={() => setLimit((current) => current + PAGE_SIZE)} className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">
                Show more ({Math.min(limit, misses.length)} of {misses.length})
              </button>
            )}
          </>
        )}
    </div>
  );
}
