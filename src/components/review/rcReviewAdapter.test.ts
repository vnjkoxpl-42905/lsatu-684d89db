import { describe, expect, it } from "vitest";
import type { RcAttemptRow, RcDrillSessionRow } from "@/features/rc/api/rcSupabase.types";
import type { RcQuestionIndexEntry } from "@/features/rc/lib/rcTypes";
import { buildRcReviewQueue } from "./rcReviewAdapter";

const question: RcQuestionIndexEntry = {
  questionId: 101, passageId: 20, preptest: 130, section: 3, setNumber: 2, position: 13,
  questionType: "Main point", questionTypeFamily: "Global", difficulty: 3, features: [], prompt: null,
};
const session: RcDrillSessionRow = {
  id: "session-1", user_id: "student-1", config: {}, passage_ids: [20], status: "completed",
  excluded_from_analytics: false, started_at: "2026-09-01T00:00:00Z", completed_at: "2026-09-02T00:00:00Z",
};
function attempt(overrides: Partial<RcAttemptRow> = {}): RcAttemptRow {
  return {
    id: "attempt-1", session_id: "session-1", user_id: "student-1", question_id: 101,
    passage_id: 20, selected: "C", is_correct: false, time_ms: 70_000, flagged: false,
    eliminations: [], is_first_attempt: true, created_at: "2026-09-01T01:00:00Z", ...overrides,
  };
}

describe("RC Review adapter", () => {
  it("preserves first and later answers with missed and flagged reasons", () => {
    const items = buildRcReviewQueue([
      attempt(),
      attempt({ id: "attempt-2", selected: "A", is_correct: true, flagged: true, is_first_attempt: false, created_at: "2026-09-02T01:00:00Z" }),
    ], [session], [question]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "rc:session-1:101", area: "rc", reasons: ["missed", "flagged"],
      firstAnswer: "C", latestAnswer: "A", label: "PT130–S3–Q13",
      href: "/rc/drill?sessionId=session-1&review=1&q=101",
    });
  });

  it("does not invent a miss or retain a flag that was cleared", () => {
    expect(buildRcReviewQueue([attempt({ selected: "A", is_correct: true })], [session], [question])).toEqual([]);
    expect(buildRcReviewQueue([
      attempt({ flagged: true, selected: "A", is_correct: true }),
      attempt({ id: "attempt-2", flagged: false, selected: "A", is_correct: true, is_first_attempt: false, created_at: "2026-09-02T01:00:00Z" }),
    ], [session], [question])).toEqual([]);
  });

  it("continues an active flagged drill without treating its answer as a reviewable miss", () => {
    const saved = attempt({ flagged: true });
    expect(buildRcReviewQueue([saved], [{ ...session, status: "in_progress" }], [question])).toMatchObject([{
      reasons: ["flagged"], firstMissAt: null, actionLabel: "Continue drill",
      href: "/rc/drill?sessionId=session-1&q=101",
    }]);
    expect(buildRcReviewQueue([attempt()], [{ ...session, status: "in_progress" }], [question])).toEqual([]);
  });

  it("excludes practice-test sessions until their run is complete", () => {
    const saved = attempt({ flagged: true });
    expect(buildRcReviewQueue([saved], [{ ...session, practice_test_run_id: "test-1" }], [question])).toEqual([]);
    expect(buildRcReviewQueue([saved], [{ ...session, config: { practiceTestRunId: "test-1" } }], [question])).toEqual([]);
  });

  it("requires the source session owner and valid question index identity", () => {
    expect(buildRcReviewQueue([attempt({ user_id: "another-student" })], [session], [question])).toEqual([]);
    expect(buildRcReviewQueue([attempt()], [session], [{ ...question, passageId: 99 }])).toEqual([]);
    expect(buildRcReviewQueue([attempt()], [{ ...session, passage_ids: [99] }], [question])).toEqual([]);
  });
});
