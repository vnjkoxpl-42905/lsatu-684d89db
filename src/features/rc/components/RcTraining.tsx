import * as React from 'react';
import type { RcTrainingState } from '../hooks/useRcTraining';

export function RcLearningStatus({ training }: { training: RcTrainingState }) {
  if (!training.enabled || !training.open) return null;
  return <div className="border-b bg-white p-2 text-sm text-slate-900">
    {training.error ? <p role="alert">{training.error}</p> : training.saving ? <p role="status">Saving your learning note to your account…</p> : training.loaded ? <p role="status">Learning notes save separately from scored answers.</p> : <p role="status">Loading your learning notes…</p>}
    {training.pending && <button type="button" className="min-h-11 rounded border px-3" disabled={training.saving} onClick={() => void training.retry()}>Retry learning note</button>}
    {!training.loaded && training.error && <button type="button" className="min-h-11 rounded border px-3" onClick={training.reload}>Retry learning notes load</button>}
  </div>;
}

export function RcTrainingPanel({ training, questionId, canPredict, allowReflection }: { training: RcTrainingState; questionId: number; canPredict: boolean; allowReflection: boolean }) {
  const [prediction, setPrediction] = React.useState(''); const [reflection, setReflection] = React.useState('');
  React.useEffect(() => { setPrediction(''); setReflection(''); }, [questionId]);
  if (!training.enabled) return null;
  const locked = !training.loaded || !!training.pending;
  return <details className="my-3 rounded border p-2" open={training.open} onToggle={event => training.setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">Training options</summary>
    <p className="text-sm">Optional ordinary-practice exercises. These notes do not change your first answer or score.</p>
    {canPredict && <label className="my-2 flex items-center gap-2"><input type="checkbox" checked={training.anticipation} disabled={locked} onChange={event => training.setAnticipation(event.target.checked)} />Anticipate before choices</label>}
    {canPredict && training.anticipation && !training.latest('prediction') && <div className="space-y-2">
      <label className="block">What should the answer do?<textarea aria-label="Your prediction" className="block w-full rounded border bg-white p-2 text-slate-900" maxLength={4000} value={prediction} disabled={!!training.pending} onChange={event => setPrediction(event.target.value)} /></label>
      <button type="button" className="min-h-11 rounded border px-3" disabled={locked || !prediction.trim()} onClick={() => training.save('prediction', prediction)}>Save prediction and show choices</button>
      <button type="button" className="min-h-11 px-3 underline" disabled={!!training.pending} onClick={() => training.setAnticipation(false)}>Show choices without a prediction</button>
    </div>}
    {training.latest('prediction') && <p className="my-2 text-sm">Saved prediction: {String(training.latest('prediction')!.value)}</p>}
    <label className="my-2 flex items-center gap-2"><input type="checkbox" checked={training.segmented} disabled={locked} onChange={event => training.setSegmented(event.target.checked)} />Read paragraph by paragraph</label>
    <label className="my-2 block">Confidence (optional)<select aria-label="Confidence (optional)" className="ml-2 rounded border bg-white text-slate-900" disabled={locked} value={String(training.latest('confidence')?.value ?? '')} onChange={event => { if (event.target.value) training.save('confidence', event.target.value); }}>
      <option value="">Not recorded</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
    </select></label>
    <p className="text-sm">Confidence is your own report. It is never inferred from time.</p>
    {allowReflection && <div className="space-y-2"><label className="block">Your reflection<textarea aria-label="Your reflection" className="block w-full rounded border bg-white p-2 text-slate-900" maxLength={4000} value={reflection} disabled={locked} onChange={event => setReflection(event.target.value)} /></label>
      <button type="button" className="min-h-11 rounded border px-3" disabled={locked || !reflection.trim()} onClick={() => training.save('reflection', reflection)}>Save reflection</button>
      {training.latest('reflection') && <p className="text-sm">Saved reflection: {String(training.latest('reflection')!.value)}</p>}
    </div>}
  </details>;
}
export function RcParagraphTrainingControls({ training, findActive }: { training: RcTrainingState; findActive: boolean }) {
  if (!training.enabled || !training.segmented) return null;
  const limit = Math.min(training.paragraphLimit, training.paragraphCount);
  const change = (next: number) => { training.setParagraphLimit(next); training.save('reading-progress', next); };
  return <div className="mb-3 rounded border bg-[var(--rc-bg)] p-2 text-sm">
    <p>{findActive ? 'Find shows the entire passage. Clear Find to resume paragraph-by-paragraph reading.' : `Paragraph ${limit} of ${training.paragraphCount}`}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded border px-3" disabled={!!training.pending || limit <= 1 || findActive} onClick={() => change(Math.max(1, limit - 1))}>Previous paragraph</button>
      <button type="button" className="min-h-11 rounded border px-3" disabled={!!training.pending || limit >= training.paragraphCount || findActive} onClick={() => change(limit + 1)}>Next paragraph</button>
      <button type="button" className="min-h-11 rounded border px-3" onClick={() => training.setSegmented(false)}>Show entire passage</button>
    </div>
  </div>;
}
