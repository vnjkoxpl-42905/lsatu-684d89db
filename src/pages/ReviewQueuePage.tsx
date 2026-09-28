import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFlagged } from "@/hooks/useFlagged";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { buildReviewQueue, type ReviewReason } from "@/components/review/reviewQueueModel";
import "./reviewQueue.css";

type ReasonFilter = "all" | ReviewReason;

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function reasonLabel(reason: ReviewReason): string {
  return reason === "missed" ? "Missed answer" : "Flagged";
}

export default function ReviewQueuePage() {
  const permissions = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const canJournal = !permissions.loading && (permissions.is_admin || permissions.has_journal_access);
  const canFlag = !permissions.loading && (permissions.is_admin || permissions.has_flagged_access);
  const journal = useJournalEntries(canJournal);
  const flagged = useFlagged();
  const reasonParam = searchParams.get("reason");
  const reason: ReasonFilter = reasonParam === "missed" || reasonParam === "flagged" ? reasonParam : "all";
  const search = searchParams.get("q") ?? "";
  const table = searchParams.get("view") === "table";
  const requestedCount = Number(searchParams.get("show"));
  const shownCount = Number.isSafeInteger(requestedCount) && requestedCount > 30 ? requestedCount : 30;
  const items = useMemo(() => buildReviewQueue(canJournal ? journal.data ?? [] : [], canFlag ? flagged.data ?? [] : []), [canJournal, canFlag, journal.data, flagged.data]);
  const visibleItems = useMemo(() => items.filter((item) =>
    (reason === "all" || item.reasons.includes(reason)) &&
    (!search.trim() || `${item.label} ${item.qid} ${item.qtype ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())),
  ), [items, reason, search]);
  const shownItems = visibleItems.slice(0, shownCount);
  const returnTo = `/review/to-review${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const detailLink = (href: string) => `${href}?returnTo=${encodeURIComponent(returnTo)}`;
  const loading = permissions.loading || (canJournal && journal.isLoading) || (canFlag && flagged.isLoading);
  const journalError = canJournal && journal.isError;
  const flagError = canFlag && flagged.isError;
  const hasError = journalError || flagError;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "q" || key === "reason") next.delete("show");
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="review-queue" aria-label="Questions to review">
      <div className="review-queue-intro">
        <div>
          <h2>Questions to review</h2>
          <p>This list includes saved wrong answers and flags from question practice. RC, activities, bootcamps, and teacher-selected review are not yet included here.</p>
        </div>
        <span className="review-queue-count" aria-live="polite">{loading ? "Loading…" : `${visibleItems.length} ${visibleItems.length === 1 ? "question" : "questions"}`}</span>
      </div>

      <div className="review-queue-controls">
        <div className="review-queue-filters" role="group" aria-label="Review reason">
          {(["all", "missed", "flagged"] as ReasonFilter[]).map((filter) => (
            <button key={filter} type="button" onClick={() => setParam("reason", filter === "all" ? null : filter)} aria-pressed={reason === filter} disabled={filter === "missed" && !canJournal || filter === "flagged" && !canFlag}>
              {filter === "all" ? "All" : filter === "missed" ? "Missed" : "Flagged"}
            </button>
          ))}
        </div>
        <label className="review-queue-search">
          <span className="sr-only">Find a question</span>
          <input type="search" value={search} onChange={(event) => setParam("q", event.target.value || null)} placeholder="Find a question" />
        </label>
        <button className="review-queue-view" type="button" onClick={() => setParam("view", table ? null : "table")} aria-pressed={table}>
          {table ? "Compact view" : "Detailed table"}
        </button>
      </div>

      {hasError ? (
        <div className="review-queue-error" role="alert">
          {journalError && flagError ? "Wrong answers and flags could not be loaded." : journalError ? "Wrong answers could not be loaded. Showing available flags only." : "Flags could not be loaded. Showing available wrong answers only."}
          <button type="button" onClick={() => { if (journalError) void journal.refetch(); if (flagError) void flagged.refetch(); }}>Try again</button>
        </div>
      ) : null}

      {loading ? <p className="review-queue-state" role="status">Loading saved questions…</p> : visibleItems.length === 0 ? (
        <div className="review-queue-state">
          <h3>{hasError ? "No questions from the loaded source" : items.length > 0 ? "No questions match these filters" : "No saved questions here yet"}</h3>
          <p>{hasError ? "Retry to see the full list." : items.length > 0 ? "Try another reason or clear the search." : "Questions you miss or flag in question practice will appear here."}</p>
        </div>
      ) : table ? (
        <div className="review-queue-table-wrap">
          <table className="review-queue-table">
            <thead><tr><th>Question</th><th>Reason</th><th>First answer</th><th>Latest answer</th><th>Source</th><th>Note</th><th>Last activity</th></tr></thead>
            <tbody>{shownItems.map((item) => (
              <tr key={item.qid}>
                <td><Link to={detailLink(item.href)}>{item.label}</Link><small>{item.qtype || "Question"}</small></td>
                <td>{item.reasons.map(reasonLabel).join(" · ")}</td>
                <td>{item.firstAnswer ?? "Not recorded"}</td>
                <td>{item.latestAnswer ?? "Not recorded"}</td>
                <td>{item.sources.map((source) => source === "wrong_answer_journal" ? "Wrong-answer journal" : "Flag").join(" · ")}</td>
                <td>{item.reflection || item.flaggedNote || "—"}</td>
                <td>{readableDate(item.lastActivityAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <ul className="review-queue-list">{shownItems.map((item) => (
          <li key={item.qid}>
            <Link className="review-queue-card" to={detailLink(item.href)}>
              <span className="review-queue-card-main">
                <strong>{item.label}</strong>
                <span>{item.qtype || "Question"} · {readableDate(item.lastActivityAt)}</span>
                {item.reflection || item.flaggedNote ? <span className="review-queue-note">{item.reflection || item.flaggedNote}</span> : null}
              </span>
              <span className="review-queue-card-side">
                {item.reasons.map((entry) => <span className="review-queue-reason" key={entry}>{reasonLabel(entry)}</span>)}
                <span className="review-queue-open">Open question →</span>
              </span>
            </Link>
          </li>
        ))}</ul>
      )}
      {!loading && visibleItems.length > shownItems.length ? (
        <div className="review-queue-more">
          <span>Showing {shownItems.length} of {visibleItems.length}</span>
          <button type="button" onClick={() => setParam("show", String(shownCount + 30))}>Show 30 more</button>
        </div>
      ) : null}
    </section>
  );
}
