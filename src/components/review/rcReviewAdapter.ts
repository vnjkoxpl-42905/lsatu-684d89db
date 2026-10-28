import type { RcAttemptRow, RcDrillSessionRow } from "@/features/rc/api/rcSupabase.types";
import type { RcQuestionIndexEntry } from "@/features/rc/lib/rcTypes";
import type { ReviewQueueItem } from "./reviewQueueModel";
import { rcResultReleased, resolveRcPracticeTestParent, type RcSessionSourceRow } from '@/lib/firstAnswerProgress';

function standaloneSession(session: RcDrillSessionRow): boolean {
  const source = { ...session, practice_test_run_id: session.practice_test_run_id ?? null } as RcSessionSourceRow;
  if (resolveRcPracticeTestParent(source).kind !== 'none') return false;
  const config = session.config && typeof session.config === 'object' && !Array.isArray(session.config) ? session.config as Record<string, unknown> : {};
  // A timed sitting is served only through its own protected report, including legacy config-only provenance.
  return !(session as RcDrillSessionRow & { timed_section_sitting_id?: unknown }).timed_section_sitting_id && !config.timedSectionSittingId;
}

/** Completed and active standalone drills. Active flags resume practice without opening answer review. */
export function buildRcReviewQueue(
  attempts: RcAttemptRow[],
  sessions: RcDrillSessionRow[],
  questionIndex: RcQuestionIndexEntry[],
): ReviewQueueItem[] {
  const validSessions = new Map(sessions
    .filter((session) => (session.status === "completed" || session.status === "in_progress") && standaloneSession(session))
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
    const session = validSessions.get(first.session_id)!;
    const completed = session.status === "completed";
    const released = rcResultReleased({ ...session, practice_test_run_id: session.practice_test_run_id ?? null }, new Set());
    const firstMiss = released ? group.find((attempt) => attempt.selected && attempt.is_correct === false) : undefined;
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
      firstAnswer: released ? first.selected : null,
      latestAnswer: released ? [...group].reverse().find((attempt) => attempt.selected)?.selected ?? null : null,
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
