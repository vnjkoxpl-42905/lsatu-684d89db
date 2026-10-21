import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFlagged } from "@/hooks/useFlagged";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { buildActivityReviewQueue, buildReviewQueue, buildSectionReviewQueue, type ReviewReason, type ReviewSource } from "@/components/review/reviewQueueModel";
import { loadRcReviewQueue } from "@/components/review/rcReviewSource";
import { loadPracticeTestReviewQueue } from "@/components/review/ptReviewSource";
import { loadIntroLrReviewQueue } from "@/components/review/introLrReviewSource";
import { fetchSectionHistory } from "@/lib/sectionHistory";
import { listAssignmentsForStudent, listResponsesForAssignments } from "@/features/activity-centre/api/activitiesClient";
import "./reviewQueue.css";

type ReasonFilter = "all" | ReviewReason;

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function reasonLabel(reason: ReviewReason): string {
  return reason === "missed" ? "Missed answer" : reason === "skipped" ? "Opened and left blank" : "Flagged";
}

function sourceLabel(source: ReviewSource): string {
  return source === "wrong_answer_journal" ? "Wrong-answer journal"
    : source === "flagged_questions" ? "Flag"
    : source === "activity_item_responses" ? "Activity attempt"
    : source === "practice_test" ? "Completed PrepTest"
    : source === "intro_lr_attempts" ? "Intro to LR exercise"
    : source === "section_history" ? "Completed timed section" : "RC drill attempt";
}

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const canJournal = !permissions.loading && (permissions.is_admin || permissions.has_journal_access);
  const canFlag = !permissions.loading && (permissions.is_admin || permissions.has_flagged_access);
  const canRc = !permissions.loading && (permissions.is_admin || permissions.has_drill_access);
  const canActivity = !permissions.loading && (permissions.is_admin || permissions.has_activity_access);
  const canSection = !permissions.loading && (permissions.is_admin || permissions.has_drill_access);
  const canPracticeTest = !permissions.loading && !!user;
  const canIntroLr = !permissions.loading && (permissions.is_admin || permissions.has_bootcamp_access);
  const journal = useJournalEntries(canJournal);
  const flagged = useFlagged();
  const rcReview = useQuery({
    queryKey: ["review", "rc", user?.id],
    enabled: canRc && !!user,
    staleTime: 60_000,
    queryFn: () => loadRcReviewQueue(user!.id),
  });
  const activityReview = useQuery({
    queryKey: ["review", "activity", user?.id],
    enabled: canActivity && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const assignments = await listAssignmentsForStudent(user!.id);
      const responses = await listResponsesForAssignments(assignments.map((assignment) => assignment.id));
      return buildActivityReviewQueue(assignments, responses);
    },
  });
  const sectionReview = useQuery({
    queryKey: ["review", "sections", user?.id],
    enabled: canSection && !!user,
    staleTime: 60_000,
    queryFn: async () => buildSectionReviewQueue(await fetchSectionHistory(user!.id)),
  });
  const practiceTestReview = useQuery({
    queryKey: ["review", "practice-test", user?.id],
    enabled: canPracticeTest && !!user,
    staleTime: 60_000,
    queryFn: () => loadPracticeTestReviewQueue(user!.id),
  });
  const introLrReview = useQuery({
    queryKey: ["review", "intro-lr", user?.id],
    enabled: canIntroLr && !!user,
    staleTime: 60_000,
    queryFn: () => loadIntroLrReviewQueue(user!.id),
  });
  const reasonParam = searchParams.get("reason");
  const reason: ReasonFilter = reasonParam === "missed" || reasonParam === "flagged" || reasonParam === "skipped" ? reasonParam : "all";
  const search = searchParams.get("q") ?? "";
  const table = searchParams.get("view") === "table";
  const requestedCount = Number(searchParams.get("show"));
  const shownCount = Number.isSafeInteger(requestedCount) && requestedCount > 30 ? requestedCount : 30;
  const items = useMemo(() => [
    ...buildReviewQueue(canJournal ? journal.data ?? [] : [], canFlag ? flagged.data ?? [] : []),
    ...(canRc ? rcReview.data ?? [] : []),
    ...(canActivity ? activityReview.data ?? [] : []),
    ...(canSection ? sectionReview.data ?? [] : []),
    ...(canPracticeTest ? practiceTestReview.data ?? [] : []),
    ...(canIntroLr ? introLrReview.data ?? [] : []),
  ].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)), [canJournal, canFlag, canRc, canActivity, canSection, canPracticeTest, canIntroLr, journal.data, flagged.data, rcReview.data, activityReview.data, sectionReview.data, practiceTestReview.data, introLrReview.data]);
  const visibleItems = useMemo(() => items.filter((item) =>
    (reason === "all" || item.reasons.includes(reason)) &&
    (!search.trim() || `${item.label} ${item.qid} ${item.qtype ?? ""} ${item.area}`.toLowerCase().includes(search.trim().toLowerCase())),
  ), [items, reason, search]);
  const shownItems = visibleItems.slice(0, shownCount);
  const returnTo = `/review/to-review${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const detailLink = (href: string) => `${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
  const loading = permissions.loading || (canJournal && journal.isLoading) || (canFlag && flagged.isLoading) || (canRc && rcReview.isLoading) || (canActivity && activityReview.isLoading) || (canSection && sectionReview.isLoading) || (canPracticeTest && practiceTestReview.isLoading) || (canIntroLr && introLrReview.isLoading);
  const journalError = canJournal && journal.isError;
  const flagError = canFlag && flagged.isError;
  const rcError = canRc && rcReview.isError;
  const activityError = canActivity && activityReview.isError;
  const sectionError = canSection && sectionReview.isError;
  const practiceTestError = canPracticeTest && practiceTestReview.isError;
  const introLrError = canIntroLr && introLrReview.isError;
  const hasError = journalError || flagError || rcError || activityError || sectionError || practiceTestError || introLrError;
  const failedSources = [journalError && "LR wrong answers", flagError && "LR flags", rcError && "RC drills", activityError && "Activities", sectionError && "Timed sections", practiceTestError && "PrepTests", introLrError && "Intro to LR"].filter(Boolean).join(", ");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "q" || key === "reason") next.delete("show");
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="review-queue" aria-label="Work to review">
      <div className="review-queue-intro">
        <div>
          <h2>Work to review</h2>
          <p>This list includes saved LR wrong answers and flags, completed RC drills and PrepTests, flags in active RC drills, judged misses from Activities and earlier Intro to LR interactive exercises, and questions opened and left blank in completed LR sections. Active RC flags continue the drill without opening answer review. A question can appear in both its journal and a specific sitting. Newer bootcamp labs, other bootcamp exercises, and teacher-selected review are not yet included here.</p>
        </div>
        <span className="review-queue-count" aria-live="polite">{loading ? "Loading…" : `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"}`}</span>
      </div>

      <div className="review-queue-controls">
        <div className="review-queue-filters" role="group" aria-label="Review reason">
          {(["all", "missed", "flagged", "skipped"] as ReasonFilter[]).map((filter) => (
            <button key={filter} type="button" onClick={() => setParam("reason", filter === "all" ? null : filter)} aria-pressed={reason === filter} disabled={filter === "missed" && !canJournal && !canRc && !canActivity && !canPracticeTest && !canIntroLr || filter === "flagged" && !canFlag && !canRc && !canPracticeTest || filter === "skipped" && !canSection && !canPracticeTest}>
              {filter === "all" ? "All" : filter === "missed" ? "Missed" : filter === "skipped" ? "Left blank" : "Flagged"}
            </button>
          ))}
        </div>
        <label className="review-queue-search">
          <span className="sr-only">Find review work</span>
          <input type="search" value={search} onChange={(event) => setParam("q", event.target.value || null)} placeholder="Find review work" />
        </label>
        <button className="review-queue-view" type="button" onClick={() => setParam("view", table ? null : "table")} aria-pressed={table}>
          {table ? "Compact view" : "Detailed table"}
        </button>
      </div>

      {hasError ? (
        <div className="review-queue-error" role="alert">
          {`${failedSources} could not be loaded. Showing available sources only.`}
          <button type="button" onClick={() => { if (journalError) void journal.refetch(); if (flagError) void flagged.refetch(); if (rcError) void rcReview.refetch(); if (activityError) void activityReview.refetch(); if (sectionError) void sectionReview.refetch(); if (practiceTestError) void practiceTestReview.refetch(); if (introLrError) void introLrReview.refetch(); }}>Try again</button>
        </div>
      ) : null}

      {loading ? <p className="review-queue-state" role="status">Loading saved work…</p> : visibleItems.length === 0 ? (
        <div className="review-queue-state">
          <h3>{hasError ? "No items from the loaded source" : items.length > 0 ? "No items match these filters" : "No saved work here yet"}</h3>
          <p>{hasError ? "Retry to see the full list." : items.length > 0 ? "Try another reason or clear the search." : "Questions and Activities you miss or flag, or timed section questions you opened and left blank, will appear here."}</p>
        </div>
      ) : table ? (
        <div className="review-queue-table-wrap">
          <table className="review-queue-table">
            <thead><tr><th>Item</th><th>Area</th><th>Reason</th><th>First answer</th><th>Latest answer</th><th>Source</th><th>Note</th><th>Last activity</th></tr></thead>
            <tbody>{shownItems.map((item) => (
              <tr key={item.key}>
                <td><Link to={detailLink(item.href)}>{item.label}</Link><small>{item.qtype || "Item"}</small></td>
                <td>{item.area === "rc" ? "Reading Comprehension" : "Logical Reasoning"}</td>
                <td>{item.reasons.map(reasonLabel).join(" · ")}</td>
                <td>{item.firstAnswer ?? "Not recorded"}</td>
                <td>{item.latestAnswer ?? "Not recorded"}</td>
                <td>{item.sources.map(sourceLabel).join(" · ")}</td>
                <td>{item.reflection || item.flaggedNote || "—"}</td>
                <td>{readableDate(item.lastActivityAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <ul className="review-queue-list">{shownItems.map((item) => (
          <li key={item.key}>
            <Link className="review-queue-card" to={detailLink(item.href)}>
              <span className="review-queue-card-main">
                <strong>{item.label}</strong>
                <span>{item.area === "rc" ? "Reading Comprehension" : "Logical Reasoning"} · {item.qtype || "Item"} · {item.sources.map(sourceLabel).join(" + ")} · {readableDate(item.lastActivityAt)}</span>
                {item.reflection || item.flaggedNote ? <span className="review-queue-note">{item.reflection || item.flaggedNote}</span> : null}
              </span>
              <span className="review-queue-card-side">
                {item.reasons.map((entry) => <span className="review-queue-reason" key={entry}>{reasonLabel(entry)}</span>)}
                <span className="review-queue-open">{item.actionLabel ?? "Open item"} →</span>
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
