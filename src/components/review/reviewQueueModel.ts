import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";

export type ReviewReason = "missed" | "flagged";
export type ReviewSource = "wrong_answer_journal" | "flagged_questions" | "rc_attempts";
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
