import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { classifyFailure } from "../rc-recall/lib/attempts";
import { PROCEDURE_LABEL, STATUS_LABEL, formatDuration, summarizeHistory } from "../rc-recall/lib/history";
import { sectionLabel } from "../rc-recall/lib/sections";
import { useRcHistory } from "../rc-recall/useRcHistory";
import { RC_RECALL_PATH } from "../lib/routes";

const panel = { background: "var(--rc-card)", borderColor: "var(--rc-outline-2)" };
const muted = { color: "var(--rc-text-2)" };
const link = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4";
/** Enough to summarise a long history without fetching it all on a dashboard. */
const MAX_PAGES = 8;

const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/**
 * RC Training in Reading Progress and on the Dashboard. It reads the same history
 * the practice page does, shows completion and time, and never invents a score:
 * RC Training recall is self-checked and not graded.
 */
export function RcTrainingProgress({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const history = useRcHistory(user?.id);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = history;
  const pages = data?.pages.length ?? 0;

  // Totals need more than the first page; stop at a cap rather than reading an unbounded history.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !history.isError && pages < MAX_PAGES) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, history.isError, pages, fetchNextPage]);

  const open = <Link to={`${RC_RECALL_PATH}#rc-recall-history`} className={link}>{compact ? "Open RC Training" : "Open your attempts in RC Training"} <ArrowRight size={16} aria-hidden="true" /></Link>;

  if (!user) return <p role="status">Sign in to see your RC Training history.</p>;
  if (history.isPending && !history.entries.length) return <p role="status" className="text-sm" style={muted}>Loading your RC Training history…</p>;
  const errorNotice = history.isError ? <div role="alert" className="rounded-2xl border p-5 text-sm" style={panel}>
    <p>{classifyFailure(history.error) === "missing_table"
      ? "RC Training history will appear here once saving is available. Try again to check for saved attempts."
      : "Your RC Training history could not load. Your saved work has not changed."}</p>
    <button type="button" className="mt-3 min-h-11 underline" onClick={() => void history.refetch()}>Try again</button>
    {open}
  </div> : null;
  if (errorNotice && !history.entries.length) return errorNotice;

  const summary = summarizeHistory(history.entries);
  const capped = hasNextPage || history.isError;
  const stats: [string, string][] = [
    ["Attempts completed", String(summary.completed)],
    ["Ended early", String(summary.ended)],
    ["Practice time", summary.practiceSeconds ? formatDuration(summary.practiceSeconds) : "0:00"],
    ["Need attention", String(summary.needsAttention + summary.inProgress)],
  ];
  return <section aria-label="RC Training progress" className="min-w-0 rounded-2xl border p-5 sm:p-6" style={panel}>
    {errorNotice}
    <div className="flex flex-wrap items-center justify-between gap-x-4">
      <h2 className="text-lg font-semibold">RC Training</h2>
      {open}
    </div>
    <p className="text-sm leading-6" style={muted}>Completion and time from your saved attempts. RC Training recall is self-checked and not graded, so there is no score here.</p>
    {!history.entries.length ? <p className="py-6 text-sm leading-6" style={muted}>No RC Training attempts yet. Start practice to see it here.</p> : <>
      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs" style={muted}>{label}</dt><dd className="mt-1 break-words text-xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs" style={muted}>{capped ? `Based on your ${history.entries.length} most recent attempts.` : "Based on all your attempts."} Practice time counts finished attempts only.</p>
      {!compact && <ul className="mt-4 divide-y">{history.entries.slice(0, 10).map((e) => <li key={e.attempt.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" style={{ borderColor: "var(--rc-outline-2)" }}>
        <span className="min-w-0"><span className="block text-sm font-semibold">{sectionLabel(e.attempt)}</span><span className="block text-xs" style={muted}>{PROCEDURE_LABEL[e.attempt.mode]} · {dateLabel(e.attempt.started_at)}</span></span>
        <span className="text-sm">{STATUS_LABEL[e.status]}{e.attempt.finished_at ? ` · ${formatDuration(e.attempt.elapsed_seconds ?? 0)}` : ""}</span>
      </li>)}</ul>}
    </>}
  </section>;
}
