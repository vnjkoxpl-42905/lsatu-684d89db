import { supabase } from "@/integrations/supabase/client";
import { listSavedAccountPracticeTestRuns } from "@/lib/practiceTestStore";
import { hasOutdatedPt118Structure, type PracticeTestRun } from "@/lib/practiceTest";
import { UNANSWERED } from "@/lib/sectionAnswer";
import type { SectionQuestionStat } from "@/lib/sectionHistorySave";
import type { ReviewQueueItem, ReviewReason } from "./reviewQueueModel";

type LrRow = { practice_test_run_id: string | null; practice_test_leg: number | null; completed_at: string; questions_json: unknown };
type RcSession = { id: string; practice_test_run_id: string | null; practice_test_leg: number | null; completed_at: string | null; passage_ids: number[] };
type RcAttempt = { session_id: string; question_id: number; selected: string | null; is_correct: boolean | null; flagged: boolean; created_at: string };

const answer = (value: unknown): string | null => typeof value === "string" && /^[A-E]$/.test(value) ? value : null;
const chunks = <T,>(values: T[], size = 25): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const href = (runId: string, legIndex: number, qid: string) => `/testing/test/${encodeURIComponent(runId)}?leg=${legIndex}&q=${encodeURIComponent(qid)}`;

/** Only saved evidence in an owned, completed sitting can enter the queue. */
export function buildPracticeTestReviewQueue(runs: PracticeTestRun[], lrRows: LrRow[], rcSessions: RcSession[], rcAttempts: RcAttempt[]): ReviewQueueItem[] {
  const complete = new Map(runs.filter((run) => run.status === "complete" && !!run.userId && !hasOutdatedPt118Structure(run)).map((run) => [run.id, run]));
  const result: ReviewQueueItem[] = [];
  const seenLegs = new Set<string>();

  for (const row of [...lrRows].sort((a, b) => b.completed_at.localeCompare(a.completed_at))) {
    const run = row.practice_test_run_id ? complete.get(row.practice_test_run_id) : null;
    const legIndex = row.practice_test_leg;
    if (!run || legIndex == null || run.legs[legIndex]?.kind !== "lr" || !run.legs[legIndex].completedAt || !Array.isArray(row.questions_json)) continue;
    const legKey = `${run.id}:${legIndex}`;
    if (seenLegs.has(legKey)) continue;
    seenLegs.add(legKey);
    for (const question of row.questions_json as SectionQuestionStat[]) {
      if (!question || typeof question.qid !== "string" || !/^PT\d+-S\d+-Q\d+$/.test(question.qid)) continue;
      const first = answer(question.initialAnswer);
      const correct = answer(question.correctAnswer);
      const missed = !!first && !!correct && first !== correct && question.initialCorrect === false;
      const flagged = question.flagged === true;
      const skipped = question.initialAnswer === UNANSWERED && question.everVisited === true;
      const reasons: ReviewReason[] = [...(missed ? ["missed" as const] : []), ...(flagged ? ["flagged" as const] : []), ...(skipped ? ["skipped" as const] : [])];
      if (!reasons.length) continue;
      result.push({
        key: `pt:${run.id}:${legIndex}:${question.qid}`, area: "lr", qid: question.qid,
        label: `PT${run.pt} · Section ${legIndex + 1} · Q${question.qnum}`, qtype: question.qtype || null,
        reasons, sources: ["practice_test"], firstAnswer: first, latestAnswer: answer(question.brAnswer) ?? first,
        correctAnswer: correct, firstMissAt: missed ? row.completed_at : null, lastActivityAt: row.completed_at,
        reflection: null, flaggedNote: null, href: href(run.id, legIndex, question.qid),
      });
    }
  }

  const attemptsBySession = new Map<string, RcAttempt[]>();
  for (const attempt of rcAttempts) {
    const list = attemptsBySession.get(attempt.session_id) ?? [];
    list.push(attempt);
    attemptsBySession.set(attempt.session_id, list);
  }
  for (const session of rcSessions) {
    const run = session.practice_test_run_id ? complete.get(session.practice_test_run_id) : null;
    const legIndex = session.practice_test_leg;
    if (!run || legIndex == null || run.legs[legIndex]?.kind !== "rc" || !run.legs[legIndex].completedAt || !session.completed_at) continue;
    if ([...session.passage_ids].sort((a, b) => a - b).join(",") !== [...(run.legs[legIndex].passageIds ?? [])].sort((a, b) => a - b).join(",")) continue;
    const legKey = `${run.id}:${legIndex}`;
    if (seenLegs.has(legKey)) continue;
    seenLegs.add(legKey);
    const seenQuestions = new Set<number>();
    for (const attempt of (attemptsBySession.get(session.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      if (seenQuestions.has(attempt.question_id)) continue;
      seenQuestions.add(attempt.question_id);
      const selected = answer(attempt.selected);
      const missed = !!selected && attempt.is_correct === false;
      const flagged = attempt.flagged === true;
      if (!missed && !flagged) continue;
      const qid = String(attempt.question_id);
      result.push({
        key: `pt:${run.id}:${legIndex}:${qid}`, area: "rc", qid,
        label: `PT${run.pt} · Section ${legIndex + 1} · RC question ${qid}`, qtype: null,
        reasons: [...(missed ? ["missed" as const] : []), ...(flagged ? ["flagged" as const] : [])],
        sources: ["practice_test"], firstAnswer: selected, latestAnswer: selected, correctAnswer: null,
        firstMissAt: missed ? attempt.created_at : null, lastActivityAt: session.completed_at,
        reflection: null, flaggedNote: null, href: href(run.id, legIndex, qid),
      });
    }
  }
  return result.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

/** Batch by sitting IDs, so opening Review never downloads every exam report or RC bank. */
export async function loadPracticeTestReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
  const runs = (await listSavedAccountPracticeTestRuns(userId)).filter((run) => run.userId === userId && run.status === "complete" && !hasOutdatedPt118Structure(run));
  if (!runs.length) return [];
  const runIds = runs.map((run) => run.id);
  const batches = await Promise.all(chunks(runIds).map(async (ids) => {
    const [lr, rc] = await Promise.all([
      supabase.from("section_history").select("practice_test_run_id, practice_test_leg, completed_at, questions_json")
        .eq("user_id", userId).in("practice_test_run_id", ids),
      supabase.from("rc_drill_sessions").select("id, practice_test_run_id, practice_test_leg, completed_at, passage_ids")
        .eq("user_id", userId).eq("status", "completed").in("practice_test_run_id", ids),
    ]);
    if (lr.error) throw lr.error;
    if (rc.error) throw rc.error;
    return { lr: lr.data ?? [], rc: rc.data ?? [] };
  }));
  const lrRows = batches.flatMap((batch) => batch.lr);
  const rcSessions = batches.flatMap((batch) => batch.rc);
  const attemptBatches = await Promise.all(chunks(rcSessions.map((session) => session.id)).map(async (ids) => {
    const { data, error } = await supabase.from("rc_attempts")
      .select("session_id, question_id, selected, is_correct, flagged, created_at")
      .eq("user_id", userId).eq("is_first_attempt", true).in("session_id", ids);
    if (error) throw error;
    return data ?? [];
  }));
  return buildPracticeTestReviewQueue(runs, lrRows, rcSessions, attemptBatches.flat());
}
