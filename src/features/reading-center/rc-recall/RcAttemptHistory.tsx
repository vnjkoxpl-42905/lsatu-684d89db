import { useState } from "react";
import { BookOpen } from "lucide-react";
import { classifyFailure, signedRecordingUrl, type RecapRow } from "./lib/attempts";
import {
  PROCEDURE_LABEL, RECORDING_LABEL, STATUS_LABEL, formatDuration, recapLabel, type HistoryEntry,
} from "./lib/history";
import { sectionLabel } from "./lib/sections";
import type { useRcHistory } from "./useRcHistory";
import type { useRecordingRecovery } from "./useRecordingRecovery";

const dateLabel = (v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

interface Props {
  studentId: string;
  history: ReturnType<typeof useRcHistory>;
  recovery: ReturnType<typeof useRecordingRecovery>;
  /** The attempts table cannot be reached, so an empty list means nothing about saved work. */
  savingUnavailable: boolean;
  onResume: (entry: HistoryEntry) => void;
  onRetryFinish: (entry: HistoryEntry) => void;
  /** The attempt currently being resumed or re-saved, so its button can wait. */
  busyAttemptId: string | null;
  message: string | null;
}

export default function RcAttemptHistory({ studentId, history, recovery, savingUnavailable, onResume, onRetryFinish, busyAttemptId, message }: Props) {
  const { entries } = history;
  return <div>
    {message && <p role="alert" className="rct-error">{message}</p>}
    {history.isPending && <div role="status" className="rct-loading">Loading your attempts…</div>}
    {history.isError && <div role="alert" className="rct-history-empty"><p>{savingUnavailable || classifyFailure(history.error) === "missing_table"
        ? "Your attempts will appear here once saving is available. We cannot check their server status right now."
        : "Your attempts could not load. Your saved work has not changed."}</p><button type="button" className="rct-text-button" onClick={() => void history.refetch()}>Try loading attempts again</button></div>}
    {history.isError && entries.length > 0 && <p role="status">Showing work kept on this device. Server status could not be refreshed.</p>}
    {!history.isPending && !history.isError && !entries.length && <div className="rct-history-empty"><span className="rct-empty-icon"><BookOpen size={23} aria-hidden="true" /></span><div><h3>Your first practice starts here.</h3><p>Choose a section above. Your time and recording status will appear here after you practise.</p></div></div>}
    {entries.length > 0 && <>
            <ul className="rct-attempts">{entries.map((entry) => <AttemptRowItem key={entry.attempt.id} entry={entry} studentId={studentId} recovery={recovery}
              busy={recovery.running || busyAttemptId === entry.attempt.id} onResume={onResume} onRetryFinish={onRetryFinish} />)}</ul>
            {history.hasNextPage && <button type="button" className="rct-text-button rct-load-more" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
              {history.isFetchingNextPage ? "Loading earlier attempts…" : "Show earlier attempts"}</button>}
            {history.isFetchNextPageError && <p role="alert" className="rct-error">Earlier attempts could not load. <button type="button" className="underline" onClick={() => void history.fetchNextPage()}>Try again</button></p>}
          </>}
  </div>;
}

function AttemptRowItem({ entry, studentId, recovery, busy, onResume, onRetryFinish }: {
  entry: HistoryEntry; studentId: string; recovery: Props["recovery"]; busy: boolean;
  onResume: Props["onResume"]; onRetryFinish: Props["onRetryFinish"];
}) {
  const { attempt, status } = entry;
  const spoken = entry.recaps.filter((r) => r.voice === "spoken");
  const saved = spoken.filter((r) => r.recording_state === "saved").length;
  const duration = attempt.finished_at ? formatDuration(attempt.elapsed_seconds ?? 0) : entry.pendingFinalization ? formatDuration(entry.pendingFinalization.seconds) : null;
  return <li data-status={status}>
    <div>
      <h3>{sectionLabel(attempt)}</h3>
      <p>{PROCEDURE_LABEL[attempt.mode]}{attempt.mode === "rc_recall" && attempt.confirmation_scope ? ` · Check: ${attempt.confirmation_scope === "all_read" ? "all text read so far" : "current passage only"}` : ""}</p>
      <div className="rct-attempt-actions">
        {status === "in_progress" && entry.resumable && <button type="button" className="rct-text-button" disabled={busy} onClick={() => onResume(entry)}>{busy ? "Opening…" : "Resume this practice"}</button>}
        {status === "not_resumable_here" && <span className="rct-attempt-note">Its place was not kept on this device, so it can't be resumed here. Check the device where you started it. No completion or duration is assumed.</span>}
        {status === "pending" && <>
          <button type="button" className="rct-text-button" disabled={busy} onClick={() => onRetryFinish(entry)}>{busy ? "Saving…" : "Try saving the result again"}</button>
          <span className="rct-attempt-note">The result and time are kept on this device. Saving them again keeps the original time.</span>
        </>}
        {status === "recovery_needed" && <>
          <button type="button" className="rct-text-button" disabled={recovery.running} onClick={() => void recovery.retry()}>{recovery.running ? "Retrying…" : "Retry recordings"}</button>
          <span className="rct-attempt-note">{entry.unsavedRecordings} spoken recall{entry.unsavedRecordings === 1 ? " is" : "s are"} not saved. Copies stay on the device that recorded them.</span>
        </>}
      </div>
    </div>
    <div className="rct-attempt-meta">
      <span className="rct-attempt-state" data-status={status} data-completed={attempt.completed}>{STATUS_LABEL[status]}</span>
      <span>{dateLabel(attempt.started_at)}{duration ? ` · ${duration}` : ""}</span>
      <span>{spoken.length ? `${saved} of ${spoken.length} spoken recalls saved` : "No spoken recalls"}</span>
    </div>
    {entry.recaps.length > 0 && <details className="rct-attempt-details">
      <summary>Recalls in this attempt ({entry.recaps.length})</summary>
      <ul>{[...entry.recaps].sort((a, b) => a.passage_position - b.passage_position || a.recap_key.localeCompare(b.recap_key)).map((recap) =>
        <RecapItem key={recap.id} recap={recap} studentId={studentId} />)}</ul>
    </details>}
  </li>;
}

function RecapItem({ recap, studentId }: { recap: RecapRow; studentId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playable = recap.voice === "spoken" && recap.recording_state === "saved" && !!recap.object_path;
  const load = async (download: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const link = await signedRecordingUrl(studentId, recap, { download });
      if (download) window.location.assign(link); else setUrl(link);
    } catch { setError("This recording could not be opened right now. It is still saved. Try again."); }
    finally { setLoading(false); }
  };
  return <li>
    <span>{recapLabel(recap)}</span> <span className="rct-attempt-note">{RECORDING_LABEL[recap.recording_state]}{recap.duration_ms ? ` · ${formatDuration(recap.duration_ms / 1000)}` : ""}</span>
    {playable && <span className="rct-recap-actions">
      {url ? <audio controls src={url} aria-label={`Recording: ${recapLabel(recap)}`} />
        : <button type="button" className="underline" disabled={loading} onClick={() => void load(false)}>{loading ? "Opening…" : "Play"}</button>}
      <button type="button" className="underline" disabled={loading} onClick={() => void load(true)}>Download</button>
    </span>}
    {error && <span role="alert" className="rct-error"> {error}</span>}
  </li>;
}
