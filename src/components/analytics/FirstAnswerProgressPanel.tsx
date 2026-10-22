import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import type { AreaProgress } from '@/lib/firstAnswerProgress';
import ProgressWindowControl from './ProgressWindowControl';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';

function AreaCard({ label, result, unavailable, partial }: { label: string; result: AreaProgress; unavailable: boolean; partial: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
        {unavailable || partial || result.percent === null ? '—' : `${result.percent}%`}
      </div>
      {unavailable ? (
        <p className="mt-1 text-xs text-muted-foreground">Saved answer sources are unavailable.</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {result.correct} correct of {result.denominator} {partial ? 'candidate first answers from available sources' : 'distinct first answers'}
        </p>
      )}
      {!unavailable && !partial && result.sample === 'insufficient' && (
        <p className="mt-2 text-xs text-muted-foreground">At least 3 answers are needed for a percentage.</p>
      )}
      {!unavailable && !partial && result.sample === 'early' && (
        <p className="mt-2 text-xs text-muted-foreground">Early signal: fewer than 10 answers.</p>
      )}
      {partial && !unavailable && <p className="mt-2 text-xs text-muted-foreground">Accuracy is withheld: an unavailable source may contain an earlier answer.</p>}
      {!unavailable && result.evidenceAttemptIds.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer text-foreground">Show calculation records</summary><p className="mt-2 text-muted-foreground">Each record below contributes one question to the denominator. The correct count uses its saved graded result.</p><ul className="mt-2 max-h-40 overflow-y-auto space-y-1">{result.evidenceAttemptIds.map((id) => <li key={id} className="break-all font-mono">{id}</li>)}</ul></details>}
    </div>
  );
}

/** Shared student/teacher view of the same student-scoped, first-answer ledger. */
export default function FirstAnswerProgressPanel({ studentId, hideWindowControl = false }: { studentId?: string; hideWindowControl?: boolean }) {
  const [window, setWindow] = useProgressWindow(!studentId);
  const { resolution, progress, loading, error, refresh } = useFirstAnswerProgress(window, studentId);

  return (
    <section data-motion-enter data-motion-group data-motion-ready={loading ? "false" : "true"} className="w-full min-w-0 max-w-[calc(100vw-48px)] overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5" aria-labelledby="first-answer-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 data-motion-item id="first-answer-title" className="text-lg font-semibold">First-answer accuracy</h2>
          <p data-motion-item className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Each question counts once, using its first saved, graded answer. Repeats do not raise or lower this score.
          </p>
        </div>
        {!hideWindowControl && <ProgressWindowControl value={window} onChange={setWindow} />}
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-muted-foreground" role="status">Loading saved answers…</p>
      ) : resolution.state === 'denied' ? (
        <p className="mt-5 text-sm text-muted-foreground">This student’s progress is unavailable to this account.</p>
      ) : error ? (
        <div className="mt-5 text-sm text-muted-foreground" role="alert">
          <p>{error instanceof StudentIdentityUnavailableError ? error.message : 'Could not load saved answers. No accuracy has been calculated.'}</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 font-medium text-foreground underline">Retry</button>
        </div>
      ) : !progress || progress.coverage.includedSources.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground" role="alert">Saved answer sources are unavailable. No accuracy has been calculated.</p>
      ) : (
        <>
          {progress.coverage.missingSources.length > 0 && (
            <p className="mt-4 break-words rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground" role="status">
              Partial data: {progress.coverage.missingSources.map((item) => item.source.replace(/_/g, ' ')).join(', ')} could not be loaded. Affected accuracy is withheld until the complete first-answer history can be checked.
            </p>
          )}
          <div data-motion-item data-motion-id="first-answer-metrics" className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <AreaCard
              label="Logical Reasoning"
              result={progress.LR}
              unavailable={!progress.coverage.includedSources.some((source) => source === 'lr_attempts' || source === 'lr_section_history')}
              partial={progress.coverage.missingSources.some((item) => item.source === 'lr_attempts' || item.source === 'lr_section_history' || item.source === 'practice_test_runs')}
            />
            <AreaCard
              label="Reading Comprehension"
              result={progress.RC}
              unavailable={!progress.coverage.includedSources.includes('rc_attempts')}
              partial={progress.coverage.missingSources.some((item) => item.source === 'rc_attempts' || item.source === 'rc_sessions' || item.source === 'practice_test_runs')}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Window: {window === 'all' ? 'all time' : `last ${window} days`}. Included: saved LR drills, completed LR sections, and completed RC work. Full PrepTests count after completion. Questions first answered before this window stay out of this window even when repeated here.
          </p>
        </>
      )}
    </section>
  );
}
