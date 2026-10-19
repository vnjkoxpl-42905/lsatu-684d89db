import type { RcAttemptRow, RcDrillSessionRow } from "@/features/rc/api/rcSupabase.types";
import type { RcQuestionIndexEntry } from "@/features/rc/lib/rcTypes";
import type { ReviewQueueItem } from "./reviewQueueModel";

/** Completed and active standalone drills. Active flags resume practice without opening answer review. */
export function buildRcReviewQueue(
  attempts: RcAttemptRow[],
  sessions: RcDrillSessionRow[],
  questionIndex: RcQuestionIndexEntry[],
): ReviewQueueItem[] {
  const validSessions = new Map(sessions
    .filter((session) => (session.status === "completed" || session.status === "in_progress") && !session.practice_test_run_id &&
      !(session.config && typeof session.config === "object" && "practiceTestRunId" in session.config && session.config.practiceTestRunId))
    .map((session) => [session.id, session]));
  const questions = new Map(questionIndex.map((question) => [question.questionId, question]));
  const groups = new Map<string, RcAttemptRow[]>();

  for (const attempt of attempts) {
    const session = validSessions.get(attempt.session_id);
    const question = questions.get(attempt.question_id);
    if (!session || !question || attempt.user_id !== session.user_id || question.passageId !== attempt.passage_id || !session.passage_ids.includes(question.passageId)) continue;
    const key = `${attempt.session_id}:${attempt.question_id}`;
    const group = groups.get(key) ?? [];
    group.push(attempt);
    groups.set(key, group);
  }

  const items: ReviewQueueItem[] = [];
  for (const [key, group] of groups) {
    group.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const first = group.find((attempt) => attempt.is_first_attempt) ?? group[0];
    const last = group.at(-1)!;
    const completed = validSessions.get(first.session_id)?.status === "completed";
    const firstMiss = group.find((attempt) => attempt.selected && attempt.is_correct === false);
    const flagged = last.flagged === true;
    if (!(completed && firstMiss) && !flagged) continue;
    const question = questions.get(first.question_id)!;
    const reasons: ReviewQueueItem["reasons"] = [];
    if (completed && firstMiss) reasons.push("missed");
    if (flagged) reasons.push("flagged");
    items.push({
      key: `rc:${key}`,
      area: "rc",
      qid: String(question.questionId),
      label: `PT${question.preptest}–S${question.section}–Q${question.position}${completed ? "" : " · Active RC drill"}`,
      qtype: question.questionType || null,
      reasons,
      sources: ["rc_attempts"],
      firstAnswer: first.selected,
      latestAnswer: [...group].reverse().find((attempt) => attempt.selected)?.selected ?? null,
      correctAnswer: null,
      firstMissAt: completed ? firstMiss?.created_at ?? null : null,
      lastActivityAt: last.created_at,
      reflection: null,
      flaggedNote: null,
      href: `/rc/drill?sessionId=${encodeURIComponent(first.session_id)}${completed ? "&review=1" : ""}&q=${question.questionId}`,
      actionLabel: completed ? undefined : "Continue drill",
    });
  }
  return items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
