import { usePracticeRating } from "@/hooks/usePracticeRating";
import { MIN_RATED_ANSWERS } from "@/lib/practiceRating";

export default function PracticeRatingCard({ studentId }: { studentId?: string }) {
  const { profile, loading, error, partial, refresh } = usePracticeRating(studentId);
  const skills = [...(profile?.bySkill ?? [])]
    .filter(([, track]) => track.count >= MIN_RATED_ANSWERS)
    .sort(([a], [b]) => a.localeCompare(b));
  return (
    <section aria-label="Practice rating" className="rounded-[20px] border border-slate-300 bg-white px-4 py-4 text-slate-900 sm:px-5">
      <h3 className="font-serif text-2xl font-semibold">Practice rating</h3>
      {loading ? <p role="status" className="mt-2 text-sm text-slate-600">Calculating from saved answers…</p>
        : !profile ? <p role="status" className="mt-2 text-sm text-slate-600">Rating unavailable. {error && <button type="button" className="min-h-11 font-semibold underline" onClick={() => void refresh()}>Try again</button>}</p>
        : <>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {([["Overall", profile.overall], ["Logical Reasoning", profile.LR], ["Reading Comprehension", profile.RC]] as const).map(([label, track]) => (
              <div key={label} className="rounded-xl border border-slate-200 px-3 py-2">
                <dt className="text-sm font-medium text-slate-700">{label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{track.count >= MIN_RATED_ANSWERS ? Math.round(track.rating) : "Calibrating"}</dd>
                <dd className="text-sm text-slate-600">{track.count} {track.count === 1 ? "rated question" : "rated questions"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-slate-600">The rating starts at 1500 and appears after {MIN_RATED_ANSWERS} rated questions. It reflects first tries and question difficulty. Official LSAT scores use the 120–180 scale.</p>
          {profile.calibration.count >= MIN_RATED_ANSWERS && (
            <details className="mt-2 border-t border-slate-200">
              <summary className="min-h-11 w-fit cursor-pointer py-3 text-sm font-semibold">Expected and actual accuracy</summary>
              <p className="pb-2 text-sm text-slate-600">
                Across {profile.calibration.count} rated questions after calibration, the section ratings predicted {Math.round(100 * profile.calibration.expectedCorrect / profile.calibration.count)}% correct.
                Actual accuracy was {Math.round(100 * profile.calibration.actualCorrect / profile.calibration.count)}%.
              </p>
            </details>
          )}
          {skills.length > 0 && <details className="mt-2 border-t border-slate-200">
            <summary className="min-h-11 w-fit cursor-pointer py-3 text-sm font-semibold">Ratings by question type</summary>
            <dl className="grid gap-x-6 divide-y divide-slate-200 text-sm sm:grid-cols-2 sm:divide-y-0">
              {skills.map(([key, track]) => <div key={key} className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
                <dt>{key.slice(3)} <span className="text-xs text-slate-600">({key.slice(0, 2)})</span></dt>
                <dd className="shrink-0 tabular-nums"><strong>{Math.round(track.rating)}</strong> <span className="text-slate-600">· {track.count} questions</span></dd>
              </div>)}
            </dl>
          </details>}
          {(partial || profile.eligibleCount > profile.overall.count) && <p className="mt-1 text-sm text-slate-600">Some records or difficulty ratings are unavailable. The rating uses the evidence shown above.</p>}
        </>}
    </section>
  );
}
