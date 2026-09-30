import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import type { ActivityAssignment, ActivityItemResponse } from "@/features/activity-centre/api/types";
import type { SectionHistoryRow } from "@/lib/sectionHistory";
import { UNANSWERED } from "@/lib/sectionAnswer";

export type ReviewReason = "missed" | "flagged" | "skipped";
export type ReviewSource = "wrong_answer_journal" | "flagged_questions" | "rc_attempts" | "activity_item_responses" | "section_history" | "practice_test" | "intro_lr_attempts";
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
    if (assignment.status !== "completed" || assignment.mode === "section" || assignment.item_format === "spoken-recall") continue;
    for (const item of assignment.items) {
      const attempts = attemptsByItem.get(`${assignment.id}:${item.order}`);
      if (!attempts?.length) continue;
      const ordered = [...attempts].sort((a, b) => a.attempt_no - b.attempt_no || a.created_at.localeCompare(b.created_at));
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

/** Each completed standalone section is a separate sitting, even when it uses the same PT question. */
export function buildSectionReviewQueue(rows: SectionHistoryRow[]): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];
  for (const row of rows) {
    if (row.mode !== "full-section" || row.practiceTestRunId || !row.questions.length) continue;
    for (const question of row.questions) {
      // A blank the student never opened is not a deliberate skip.
      if (question.initialAnswer !== UNANSWERED || question.everVisited !== true) continue;
      items.push({
        key: `section:${row.id}:${question.qid}`,
        area: "lr",
        qid: question.qid,
        label: `PT${row.pt}–S${row.section}–Q${question.qnum} · Timed section`,
        qtype: question.qtype || null,
        reasons: ["skipped"],
        sources: ["section_history"],
        firstAnswer: null,
        latestAnswer: question.brAnswer && question.brAnswer !== UNANSWERED ? question.brAnswer : null,
        correctAnswer: question.correctAnswer || null,
        firstMissAt: row.completedAt,
        lastActivityAt: row.completedAt,
        reflection: null,
        flaggedNote: null,
        href: `/review/section/${encodeURIComponent(row.id)}/${encodeURIComponent(question.qid)}`,
      });
    }
  }
  return items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
