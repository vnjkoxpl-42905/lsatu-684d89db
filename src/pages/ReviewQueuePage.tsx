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
import { loadHardSentencesReview } from "@/components/review/hardSentencesReviewSource";
import { loadNativeLabReview } from "@/components/review/nativeLabReviewSource";
import { createReviewEpisodeService } from "@/lib/reviewEpisodes";
import { projectReviewEpisodes } from "@/lib/scopedReviewEpisodes";
import { fetchSectionHistory } from "@/lib/sectionHistory";
import { listAssignmentsForStudent, listResponsesForAssignments } from "@/features/activity-centre/api/activitiesClient";
import "./reviewQueue.css";

type ReasonFilter = "all" | ReviewReason;
const reviewSources: ReviewSource[] = ["wrong_answer_journal", "flagged_questions", "rc_attempts", "activity_item_responses", "section_history", "practice_test", "intro_lr_attempts", "hard_sentences", "native_lab_attempts", "review_episodes"];

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function reasonLabel(reason: ReviewReason): string {
  return reason === "missed" ? "Missed answer" : reason === "skipped" ? "Opened and left blank" : reason === "teacher_selected" ? "Teacher-selected" : "Flagged";
}

function sourceLabel(source: ReviewSource): string {
  return source === "wrong_answer_journal" ? "Wrong-answer journal"
    : source === "flagged_questions" ? "Flag"
    : source === "activity_item_responses" ? "Activity attempt"
    : source === "practice_test" ? "Completed PrepTest"
    : source === "intro_lr_attempts" ? "Intro to LR exercise"
    : source === "hard_sentences" ? "Hard Sentences saved submission"
    : source === "native_lab_attempts" ? "Native lab saved submission"
    : source === "review_episodes" ? "Saved review task"
    : source === "section_history" ? "Completed timed section" : "RC drill attempt";
}

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const canJournal = !permissions.loading && (permissions.is_admin || permissions.has_journal_access);
  const canFlag = !permissions.loading && (permissions.is_admin || permissions.has_flagged_access);
  const canOwnedWork = !permissions.loading && !!user && Boolean(permissions.is_admin ||
    permissions.has_classroom_access || permissions.has_drill_access || permissions.has_practice_access);
  const canRc = canOwnedWork;
  const canActivity = canOwnedWork;
  const canSection = canOwnedWork;
  const canPracticeTest = canOwnedWork;
  const canIntroLr = canOwnedWork;
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
  const hardSentencesReview = useQuery({
    queryKey: ["review", "hard-sentences", user?.id], enabled: canIntroLr && !!user,
    staleTime: 60_000, queryFn: () => loadHardSentencesReview(user!.id),
  });
  const nativeLabReview = useQuery({
    queryKey: ["review", "native-labs", user?.id], enabled: canIntroLr && !!user,
    staleTime: 60_000, queryFn: () => loadNativeLabReview(user!.id),
  });
  const episodeReview = useQuery({ queryKey: ["review", "episodes", user?.id], enabled: canIntroLr && !!user,
    staleTime: 0, queryFn: () => createReviewEpisodeService().list(user!.id, user!.id) });
  const reason: ReasonFilter = reasonParam === "missed" || reasonParam === "flagged" || reasonParam === "skipped" || reasonParam === "teacher_selected" ? reasonParam : "all";
  const search = searchParams.get("q") ?? "";
  const areaParam = searchParams.get("area");
  const area = areaParam === "lr" || areaParam === "rc" ? areaParam : "all";
  const sourceParam = searchParams.get("source");
  const source = reviewSources.find(value => value === sourceParam) ?? "all";
  const selectedKey = searchParams.get("selected");
  const table = searchParams.get("view") === "table";
  const requestedCount = Number(searchParams.get("show"));
  const shownCount = Number.isSafeInteger(requestedCount) && requestedCount > 30 ? requestedCount : 30;
  const projection = useMemo(() => projectReviewEpisodes([
    ...buildReviewQueue(canJournal ? journal.data ?? [] : [], canFlag ? flagged.data ?? [] : []),
    ...(canRc ? rcReview.data ?? [] : []),
    ...(canActivity ? activityReview.data ?? [] : []),
    ...(canSection ? sectionReview.data ?? [] : []),
    ...(canPracticeTest ? practiceTestReview.data ?? [] : []),
    ...(canIntroLr ? introLrReview.data ?? [] : []),
    ...(canIntroLr ? hardSentencesReview.data?.items ?? [] : []),
    ...(canIntroLr ? nativeLabReview.data ?? [] : []),
  ], user?.id ?? '', canIntroLr ? episodeReview.data?.episodes ?? [] : [], canIntroLr ? episodeReview.data?.events ?? [] : []), [user?.id, canJournal, canFlag, canRc, canActivity, canSection, canPracticeTest, canIntroLr, journal.data, flagged.data, rcReview.data, activityReview.data, sectionReview.data, practiceTestReview.data, introLrReview.data, hardSentencesReview.data, nativeLabReview.data, episodeReview.data]);
  const items = projection.items;
  const visibleItems = useMemo(() => items.filter((item) =>
    (reason === "all" || item.reasons.includes(reason)) &&
    (area === "all" || item.area === area) &&
    (source === "all" || item.sources.includes(source)) &&
    (!search.trim() || `${item.label} ${item.qid} ${item.qtype ?? ""} ${item.area} ${item.reflection ?? ''} ${item.flaggedNote ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())),
  ), [items, reason, area, source, search]);
  const shownItems = visibleItems.slice(0, shownCount);
  const detailLink = (item: typeof items[number]) => {
    const returnParams = new URLSearchParams(searchParams);
    returnParams.set("selected", item.key);
    const returnTo = `/review/to-review?${returnParams.toString()}`;
    return `${item.href}${item.href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
  };
  const loading = permissions.loading || (canJournal && journal.isLoading) || (canFlag && flagged.isLoading) || (canRc && rcReview.isLoading) || (canActivity && activityReview.isLoading) || (canSection && sectionReview.isLoading) || (canPracticeTest && practiceTestReview.isLoading) || (canIntroLr && (introLrReview.isLoading || hardSentencesReview.isLoading || nativeLabReview.isLoading || episodeReview.isLoading));
  const journalError = canJournal && journal.isError;
  const flagError = canFlag && flagged.isError;
  const rcError = canRc && rcReview.isError;
  const activityError = canActivity && activityReview.isError;
  const sectionError = canSection && sectionReview.isError;
  const practiceTestError = canPracticeTest && practiceTestReview.isError;
  const introLrError = canIntroLr && introLrReview.isError;
  const hardSentencesUnavailable = canIntroLr ? hardSentencesReview.data?.unavailable ?? [] : [];
  const hardSentencesError = canIntroLr && (hardSentencesReview.isError || hardSentencesUnavailable.length > 0);
  const nativeLabError = canIntroLr && nativeLabReview.isError;
  const episodeError = canIntroLr && episodeReview.isError;
  const hasError = journalError || flagError || rcError || activityError || sectionError || practiceTestError || introLrError || hardSentencesError || nativeLabError || episodeError;
  const partialQueue = hasError || projection.unavailable > 0;
  const failedSources = [journalError && "LR wrong answers", flagError && "LR flags", rcError && "RC drills", activityError && "Activities", sectionError && "Timed sections", practiceTestError && "PrepTests", introLrError && "Intro to LR", hardSentencesReview.isError && canIntroLr && "Hard Sentences", nativeLabError && "Native Intro to LR labs", episodeError && "Saved review tasks", ...hardSentencesUnavailable].filter(Boolean).join(", ");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "q" || key === "reason" || key === "area" || key === "source") {
      next.delete("show"); next.delete("selected");
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="review-queue" aria-label="Work to review">
      <div className="review-queue-intro">
        <div>
          <h2>Work to review</h2>
          <p>This list includes saved LR wrong answers and flags, completed RC drills and PrepTests, flags in active RC drills, judged misses from Activities, earlier Intro to LR interactive exercises, Hard Sentences cluster and capstone submissions, and newly saved Main Conclusion, First-Sentence vs Rebuttal and Conclusion Type lab submissions. Teacher-selected tasks for the supported native labs and Hard Sentences include the teacher's reason. Completed review tasks stop appearing here for their exact saved submission; original attempts and flags remain. It also includes questions opened and left blank in completed LR sections. Active RC flags continue the drill without opening answer review. A question can appear in both its journal and a specific sitting. Older native lab answers that were never saved and other bootcamp exercises are not included here.</p>
        </div>
        <span className="review-queue-count" aria-live="polite">{loading ? "Loading…" : `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"}`}</span>
      </div>

      <div className="review-queue-controls">
        <div className="review-queue-filters" role="group" aria-label="Review reason">
          {(["all", "missed", "flagged", "skipped", "teacher_selected"] as ReasonFilter[]).map((filter) => (
            <button key={filter} type="button" onClick={() => setParam("reason", filter === "all" ? null : filter)} aria-pressed={reason === filter} disabled={filter === "missed" && !canJournal && !canRc && !canActivity && !canPracticeTest && !canIntroLr || filter === "flagged" && !canFlag && !canRc && !canPracticeTest || filter === "skipped" && !canSection && !canPracticeTest}>
              {filter === "all" ? "All" : filter === "missed" ? "Missed" : filter === "skipped" ? "Left blank" : filter === "teacher_selected" ? "Teacher-selected" : "Flagged"}
            </button>
          ))}
        </div>
        <label className="review-queue-search">
          <span className="sr-only">Find review work</span>
          <input type="search" value={search} onChange={(event) => setParam("q", event.target.value || null)} placeholder="Find review work" />
        </label>
        <label className="review-queue-select">Area
          <select aria-label="Review area" value={area} onChange={event => setParam("area", event.target.value === "all" ? null : event.target.value)}>
            <option value="all">All areas</option><option value="lr">Logical Reasoning</option><option value="rc">Reading Comprehension</option>
          </select>
        </label>
        <label className="review-queue-select">Source
          <select aria-label="Review source" value={source} onChange={event => setParam("source", event.target.value === "all" ? null : event.target.value)}>
            <option value="all">All sources</option>{reviewSources.map(value => <option key={value} value={value}>{sourceLabel(value)}</option>)}
          </select>
        </label>
        <button className="review-queue-view" type="button" onClick={() => setParam("view", table ? null : "table")} aria-pressed={table}>
          {table ? "Compact view" : "Detailed table"}
        </button>
      </div>

      {hasError ? (
        <div className="review-queue-error" role="alert">
          {`${failedSources} could not be loaded. Showing available sources only; the item count is partial.`}
          <button type="button" onClick={() => { if (journalError) void journal.refetch(); if (flagError) void flagged.refetch(); if (rcError) void rcReview.refetch(); if (activityError) void activityReview.refetch(); if (sectionError) void sectionReview.refetch(); if (practiceTestError) void practiceTestReview.refetch(); if (introLrError) void introLrReview.refetch(); if (hardSentencesError) void hardSentencesReview.refetch(); if (nativeLabError) void nativeLabReview.refetch(); if (episodeError) void episodeReview.refetch(); }}>Try again</button>
        </div>
      ) : null}

      {projection.unavailable > 0 && <p role="status" className="review-queue-error">{projection.unavailable} saved review {projection.unavailable === 1 ? 'task has' : 'tasks have'} an unavailable or unsupported source here. This is a partial queue.</p>}

      {loading ? <p className="review-queue-state" role="status">Loading saved work…</p> : visibleItems.length === 0 ? (
        <div className="review-queue-state">
          <h3>{partialQueue ? "The full review queue is unavailable" : items.length > 0 ? "No items match these filters" : "No saved work here yet"}</h3>
          <p>{partialQueue ? "Some saved work could not be shown. Check the warning above for the affected source." : items.length > 0 ? "Try another reason or clear the search." : "Questions and Activities you miss or flag, or timed section questions you opened and left blank, will appear here."}</p>
        </div>
      ) : table ? (
        <div className="review-queue-table-wrap">
          <table className="review-queue-table">
            <thead><tr><th>Item</th><th>Area</th><th>Reason</th><th>First answer</th><th>Latest answer</th><th>Source</th><th>Note</th><th>Last activity</th></tr></thead>
            <tbody>{shownItems.map((item) => (
              <tr key={item.key} className={selectedKey === item.key ? "review-queue-selected" : undefined}>
                <td><Link to={detailLink(item)} aria-current={selectedKey === item.key ? "true" : undefined}>{item.label}</Link>{selectedKey === item.key && <small>Last opened</small>}<small>{item.qtype || "Item"}</small></td>
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
            <Link className={`review-queue-card${selectedKey === item.key ? " review-queue-selected" : ""}`} to={detailLink(item)} aria-current={selectedKey === item.key ? "true" : undefined}>
              <span className="review-queue-card-main">
                <strong>{item.label}</strong>
                {selectedKey === item.key && <span>Last opened</span>}
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
