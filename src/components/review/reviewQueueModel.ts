import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import type { ActivityAssignment, ActivityItemResponse } from "@/features/activity-centre/api/types";
import type { SectionHistoryRow } from "@/lib/sectionHistory";
import { UNANSWERED } from "@/lib/sectionAnswer";
import { mergeBrIntoQuestionStats } from "@/components/section-report/sectionReportModel";

export type ReviewReason =
  | "missed"
  | "flagged"
  | "skipped"
  | "teacher_selected"
  | "regret"
  | "br_changed";
export type ReviewSource =
  | "wrong_answer_journal"
  | "flagged_questions"
  | "rc_attempts"
  | "activity_item_responses"
  | "section_history"
  | "practice_test"
  | "intro_lr_attempts"
  | "hard_sentences"
  | "native_lab_attempts"
  | "review_episodes";
export type ReviewArea = "lr" | "rc";

export interface ReviewQueueItem {
  key: string;
  area: ReviewArea;
  qid: string;
  label: string;
  qtype: string | null;
  reasons: ReviewReason[];
  sources: ReviewSource[];
  firstAnswer: string | null;
  latestAnswer: string | null;
  correctAnswer: string | null;
  firstMissAt: string | null;
  lastActivityAt: string;
  reflection: string | null;
  flaggedNote: string | null;
  href: string;
  actionLabel?: string;
  /** Sitting ids preserved from journal history events before collapsing (Phase 4.2). */
  sittingIds?: string[];
  /** Sitting id of a section_history row, used to match journal items strictly. */
  sittingId?: string | null;
  /** History row id for section_history items. */
  historyId?: string | null;
}

function latestDate(...dates: Array<string | null | undefined>): string {
  return dates.filter((date): date is string => !!date).sort().at(-1) ?? "";
}

/** A question may have both records. Keep both reasons and both sources visible. */
export function buildReviewQueue(
  journalRows: WrongAnswerSmartRow[],
  flagRows: FlaggedQuestionRow[],
): ReviewQueueItem[] {
  const items = new Map<string, ReviewQueueItem>();

  for (const row of journalRows) {
    const history = Array.isArray(row.entry.history_json) ? row.entry.history_json : [];
    const firstMiss = history.find((attempt) => attempt.result === 0);
    const isLegacyMiss = history.length === 0 && row.entry.last_status === "wrong";
    if (!firstMiss && !isLegacyMiss) continue;

    // Preserve sitting_id values from journal history events before collapsing.
    const sittingIds = Array.from(
      new Set(
        history
          .map((event) => (event as { sitting_id?: unknown }).sitting_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    items.set(row.qid, {
      key: `lr:${row.qid}`,
      area: "lr",
      qid: row.qid,
      label: row.label,
      qtype: row.qtype || null,
      reasons: ["missed"],
      sources: ["wrong_answer_journal"],
      firstAnswer: history[0]?.chosen_answer ?? null,
      latestAnswer: history.at(-1)?.chosen_answer ?? null,
      correctAnswer: history.at(-1)?.correct_answer ?? null,
      firstMissAt: firstMiss?.attempt_at_iso ?? row.first_missed,
      lastActivityAt: latestDate(row.last_attempted, row.entry.updated_at, row.first_missed),
      reflection: row.note?.student_note ?? row.note?.wrong_reasoning ?? row.note?.root_cause ?? null,
      flaggedNote: null,
      href: `/journal/${encodeURIComponent(row.qid)}`,
      ...(sittingIds.length > 0 ? { sittingIds } : {}),
    });
  }

  for (const flag of flagRows) {
    const existing = items.get(flag.qid);
    if (existing) {
      existing.reasons.push("flagged");
      existing.sources.push("flagged_questions");
      existing.flaggedNote = flag.note;
      existing.lastActivityAt = latestDate(existing.lastActivityAt, flag.flagged_at);
      continue;
    }
    items.set(flag.qid, {
      key: `lr:${flag.qid}`,
      area: "lr",
      qid: flag.qid,
      label: `PT${flag.pt}–S${flag.section}–Q${flag.qnum}`,
      qtype: flag.qtype || null,
      reasons: ["flagged"],
      sources: ["flagged_questions"],
      firstAnswer: null,
      latestAnswer: null,
      correctAnswer: null,
      firstMissAt: null,
      lastActivityAt: flag.flagged_at ?? "",
      reflection: null,
      flaggedNote: flag.note,
      href: `/flagged/${encodeURIComponent(flag.qid)}`,
    });
  }

  return [...items.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

/** Only persisted, attributable attempts can supply review answers. */
export function isActivityReviewResponse(response: ActivityItemResponse, assignment: ActivityAssignment): boolean {
  return response.assignment_id === assignment.id && response.student_id === assignment.student_id
    && Number.isSafeInteger(response.item_order) && response.item_order > 0
    && Number.isSafeInteger(response.attempt_no) && response.attempt_no > 0
    && typeof response.response_text === "string"
    && typeof response.created_at === "string" && Number.isFinite(Date.parse(response.created_at))
    && ["correct", "incorrect", "partial"].includes(response.verdict ?? "");
}

export function isCompletedActivityReview(assignment: ActivityAssignment): boolean {
  return assignment.status === "completed" && typeof assignment.completed_at === "string"
    && Number.isFinite(Date.parse(assignment.completed_at))
    && assignment.mode !== "section" && assignment.item_format !== "spoken-recall";
}

/** One row per missed item in each assigned Activity sitting. Never merge repeat assignments. */
export function buildActivityReviewQueue(
  assignments: ActivityAssignment[],
  responses: ActivityItemResponse[],
): ReviewQueueItem[] {
  const attemptsByItem = new Map<string, ActivityItemResponse[]>();
  for (const response of responses) {
    const key = `${response.assignment_id}:${response.item_order}`;
    const attempts = attemptsByItem.get(key) ?? [];
    attempts.push(response);
    attemptsByItem.set(key, attempts);
  }

  const result: ReviewQueueItem[] = [];
  for (const assignment of assignments) {
    if (!isCompletedActivityReview(assignment)) continue;
    for (const item of assignment.items) {
      const attempts = attemptsByItem.get(`${assignment.id}:${item.order}`);
      if (!attempts?.length) continue;
      const ordered = attempts.filter((response) => isActivityReviewResponse(response, assignment)).sort((a, b) => a.attempt_no - b.attempt_no || a.created_at.localeCompare(b.created_at));
      const judged = ordered.filter((attempt) => attempt.verdict != null);
      const firstMiss = judged.find((attempt) => attempt.verdict === "incorrect" || attempt.verdict === "partial");
      if (!firstMiss) continue;
      const latest = judged.at(-1)!;
      result.push({
        key: `activity:${assignment.id}:${item.order}`,
        area: "lr",
        qid: `${assignment.id}:${item.order}`,
        label: `${assignment.title} · Item ${item.order}`,
        qtype: item.category ?? null,
        reasons: ["missed"],
        sources: ["activity_item_responses"],
        firstAnswer: judged[0].response_text,
        latestAnswer: latest.response_text,
        correctAnswer: item.credited_answers.join("; ") || null,
        firstMissAt: firstMiss.created_at,
        lastActivityAt: latestDate(latest.created_at, assignment.completed_at, assignment.started_at),
        reflection: null,
        flaggedNote: null,
        href: `/review/activity/${encodeURIComponent(assignment.id)}/${item.order}`,
      });
    }
  }
  return result.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

function sectionWalkHref(historyId: string, qid: string): string {
  return `/review/section/${encodeURIComponent(historyId)}?walk=1&qid=${encodeURIComponent(qid)}`;
}

/**
 * Builds section review items per released standalone section row (Phase 4.1).
 *
 * Adds only what the wrong-answer journal does not hold:
 * - regret: right on first pass, wrong in blind review
 * - br_changed: changed answer in blind review
 *
 * Missed and skipped questions are already journaled at close-out. Sealed rows
 * contribute nothing (Phase 4.3).
 */
export function buildSectionReviewQueue(rows: SectionHistoryRow[]): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];
  for (const row of rows) {
    if (row.mode !== "full-section" || row.practiceTestRunId || !row.questions.length) continue;
    if (row.releaseRequiresBr && !row.brUsed) continue;

    const mergedQuestions = mergeBrIntoQuestionStats(row.questions, row.brResults);
    for (const question of mergedQuestions) {
      const hasBr = Boolean(question.brAnswer && question.brAnswer !== UNANSWERED);
      const isRegret =
        question.initialCorrect === true &&
        hasBr &&
        question.brAnswer !== question.correctAnswer;
      const isBrChanged = hasBr && question.brAnswer !== question.initialAnswer;

      const reasons: ReviewReason[] = [];
      if (isRegret) reasons.push("regret");
      if (isBrChanged) reasons.push("br_changed");
      if (reasons.length === 0) continue;

      items.push({
        key: `section:${row.id}:${question.qid}`,
        area: "lr",
        qid: question.qid,
        label: `PT${row.pt}–S${row.section}–Q${question.qnum} · Timed section`,
        qtype: question.qtype || null,
        reasons,
        sources: ["section_history"],
        firstAnswer: question.initialAnswer === UNANSWERED ? null : question.initialAnswer,
        latestAnswer: hasBr ? question.brAnswer! : null,
        correctAnswer: question.correctAnswer || null,
        firstMissAt: row.completedAt,
        lastActivityAt: row.completedAt,
        reflection: null,
        flaggedNote: null,
        href: sectionWalkHref(row.id, question.qid),
        sittingId: row.clientSittingId ?? null,
        historyId: row.id,
      });
    }
  }
  return items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

/**
 * Cross-source merge between journal items and section items (Phase 4.2).
 *
 * A section item merges into a journal item ONLY when both share the same qid
 * AND the journal item carries that exact sittingId. Journal events without a
 * sittingId are never matched by question alone; both stay separate.
 */
export function mergeSectionIntoJournal(
  journalItems: ReviewQueueItem[],
  sectionItems: ReviewQueueItem[],
  sectionRows: SectionHistoryRow[] = [],
): ReviewQueueItem[] {
  const sittingToHistory = new Map<string, string>();
  for (const row of sectionRows) {
    if (
      row.mode === "full-section" &&
      !row.practiceTestRunId &&
      !(row.releaseRequiresBr && !row.brUsed) &&
      row.clientSittingId
    ) {
      sittingToHistory.set(row.clientSittingId, row.id);
    }
  }

  const mergedJournal = journalItems.map((item) => {
    const clone: ReviewQueueItem = {
      ...item,
      reasons: [...item.reasons],
      sources: [...item.sources],
      ...(item.sittingIds ? { sittingIds: [...item.sittingIds] } : {}),
    };
    if (clone.sittingIds && clone.sittingIds.length > 0 && sittingToHistory.size > 0) {
      for (let i = clone.sittingIds.length - 1; i >= 0; i--) {
        const histId = sittingToHistory.get(clone.sittingIds[i]);
        if (histId) {
          clone.href = sectionWalkHref(histId, clone.qid);
          break;
        }
      }
    }
    return clone;
  });

  const journalByQid = new Map<string, ReviewQueueItem>();
  for (const item of mergedJournal) {
    journalByQid.set(item.qid, item);
  }

  const unmergedSection: ReviewQueueItem[] = [];
  for (const sec of sectionItems) {
    const target = journalByQid.get(sec.qid);
    const matchesSitting =
      Boolean(target) &&
      typeof sec.sittingId === "string" &&
      sec.sittingId.length > 0 &&
      Boolean(target!.sittingIds?.includes(sec.sittingId));

    if (target && matchesSitting) {
      for (const r of sec.reasons) {
        if (!target.reasons.includes(r)) target.reasons.push(r);
      }
      if (!target.sources.includes("section_history")) {
        target.sources.push("section_history");
      }
      target.href = sec.href;
      target.lastActivityAt = latestDate(target.lastActivityAt, sec.lastActivityAt);
    } else {
      unmergedSection.push(sec);
    }
  }

  return [...mergedJournal, ...unmergedSection].sort((a, b) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt),
  );
}
