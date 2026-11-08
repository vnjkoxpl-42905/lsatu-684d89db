import { ChevronDown } from "lucide-react";
import { usePracticeRating } from "@/hooks/usePracticeRating";
import { MIN_RATED_ANSWERS } from "@/lib/practiceRating";

export default function PracticeRatingCard({ studentId }: { studentId?: string }) {
  const { profile, loading, error, partial, refresh } = usePracticeRating(studentId);
  const skills = [...(profile?.bySkill ?? [])]
    .filter(([, track]) => track.count >= MIN_RATED_ANSWERS)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section aria-label="Practice rating" className="overflow-hidden rounded-[20px] border border-slate-300 bg-white text-slate-900">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
        <h3 className="font-serif text-2xl font-semibold">Practice rating</h3>
        <p className="text-sm text-slate-600">First tries</p>
      </header>
      {loading ? <p role="status" className="px-4 pb-4 text-sm text-slate-600">Loading rating…</p>
        : !profile ? <p role="status" className="px-4 pb-4 text-sm text-slate-600">Rating unavailable. {error && <button type="button" className="min-h-11 font-semibold underline" onClick={() => void refresh()}>Try again</button>}</p>
        : <>
          <dl className="divide-y divide-slate-200 border-y border-slate-200 bg-[var(--lsatu-canvas)] sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {([["Overall", profile.overall], ["Logical Reasoning", profile.LR], ["Reading Comprehension", profile.RC]] as const).map(([label, track]) => {
              const remaining = Math.max(0, MIN_RATED_ANSWERS - track.count);
              return (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 px-4 py-2.5 sm:block sm:px-5 sm:py-3">
                  <dt className="text-sm font-medium text-slate-700">{label}</dt>
                  <dd className="text-right sm:mt-1 sm:text-left">
                    {remaining ? (
                      <span className="text-sm font-semibold text-slate-700">{remaining} more {remaining === 1 ? "question" : "questions"}</span>
                    ) : (
                      <span className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 sm:justify-start">
                        <strong className="text-2xl font-semibold tabular-nums">{Math.round(track.rating)}</strong>
                        <span className="text-sm text-slate-600">{track.count} questions</span>
                      </span>
                    )}
                  </dd>
                  {remaining > 0 && (
                    <dd aria-hidden="true" className="col-span-2 mt-1 h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-slate-200 sm:mt-2">
                      <span className="block h-full rounded-full bg-slate-600" style={{ width: `${100 * track.count / MIN_RATED_ANSWERS}%` }} />
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
          <details className="group px-4 sm:px-5">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              Rating details <ChevronDown aria-hidden className="h-4 w-4 group-open:rotate-180" />
            </summary>
            <div className="space-y-4 pb-4">
              <p className="text-sm text-slate-600">First tries count. Difficulty affects how much the rating moves.</p>
              {profile.calibration.count >= MIN_RATED_ANSWERS && (
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h4 className="font-semibold">Accuracy check</h4>
                    <span className="text-sm text-slate-600">{profile.calibration.count} questions</span>
                  </div>
                  <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                    {([
                      ["Predicted", profile.calibration.expectedCorrect, "bg-slate-500"],
                      ["Actual", profile.calibration.actualCorrect, "bg-slate-800"],
                    ] as const).map(([label, count, fill]) => {
                      const percent = Math.round(100 * count / profile.calibration.count);
                      return (
                        <div key={label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-2">
                          <dt className="text-sm text-slate-700">{label}</dt>
                          <dd className="font-semibold tabular-nums">{percent}%</dd>
                          <dd aria-hidden="true" className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <span className={`block h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
              {skills.length > 0 && <div>
                <h4 className="font-semibold">By question type</h4>
                <dl className="mt-1 grid gap-x-6 text-sm sm:grid-cols-2">
                  {skills.map(([key, track]) => <div key={key} className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
                    <dt>{key.slice(3)} <span className="text-xs text-slate-600">({key.slice(0, 2)})</span></dt>
                    <dd className="shrink-0 tabular-nums"><strong>{Math.round(track.rating)}</strong> <span className="text-slate-600">· {track.count} questions</span></dd>
                  </div>)}
                </dl>
              </div>}
            </div>
          </details>
          {(partial || profile.eligibleCount > profile.overall.count) && <p className="px-4 pb-3 text-sm text-slate-600 sm:px-5">Some answers couldn’t be rated.</p>}
        </>}
    </section>
  );
}
