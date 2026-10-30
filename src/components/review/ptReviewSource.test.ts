import { describe, expect, it } from "vitest";
import type { PracticeTestRun } from "@/lib/practiceTest";
import { UNANSWERED } from "@/lib/sectionAnswer";
import { buildPracticeTestReviewQueue } from "./ptReviewSource";

const run = (id = "run-1", status: PracticeTestRun["status"] = "complete"): PracticeTestRun => ({
  id, userId: "student", pt: 80, pace: "standard", status, currentLeg: 2, breakAfterLeg: 1,
  breakTaken: true, createdAt: "2026-09-01T00:00:00Z", legs: [
    { kind: "lr", section: 1, questionCount: 3, completedAt: "2026-09-01T01:00:00Z" },
    { kind: "rc", section: 2, questionCount: 2, passageIds: [10, 11], completedAt: "2026-09-01T02:00:00Z" },
  ],
});
const lr = (id = "run-1") => ({ practice_test_run_id: id, practice_test_leg: 0, completed_at: "2026-09-01T01:00:00Z", questions_json: [
  { qid: "PT80-S1-Q1", qnum: 1, qtype: "Flaw", initialAnswer: "B", correctAnswer: "C", initialCorrect: false, flagged: true },
  { qid: "PT80-S1-Q2", qnum: 2, qtype: "Strengthen", initialAnswer: UNANSWERED, correctAnswer: "A", initialCorrect: false, everVisited: true, flagged: false },
  { qid: "PT80-S1-Q3", qnum: 3, qtype: "Assumption", initialAnswer: UNANSWERED, correctAnswer: "A", initialCorrect: false, everVisited: false, flagged: false },
] });
const session = (id = "run-1") => ({ id: `session-${id}`, practice_test_run_id: id, practice_test_leg: 1, completed_at: "2026-09-01T02:00:00Z", passage_ids: [11, 10] });

describe("completed PrepTest review source", () => {
  it("keeps saved LR missed and opened blank items separate per sitting and leg", () => {
    const items = buildPracticeTestReviewQueue([run(), run("run-2")], [lr(), lr("run-2")], [], []);
    expect(items).toHaveLength(4);
    expect(items.find((item) => item.key === "pt:run-1:0:PT80-S1-Q1")).toMatchObject({
      reasons: ["missed", "flagged"], firstAnswer: "B", href: "/testing/test/run-1?leg=0&q=PT80-S1-Q1",
    });
    expect(items.find((item) => item.key === "pt:run-1:0:PT80-S1-Q2")?.reasons).toEqual(["skipped"]);
    expect(items.some((item) => item.qid === "PT80-S1-Q3")).toBe(false);
  });

  it("requires completed owner run and valid first-answer evidence", () => {
    const bad = { ...lr(), questions_json: [
      { qid: "PT80-S1-Q1", qnum: 1, initialAnswer: UNANSWERED, correctAnswer: "C", initialCorrect: false },
      { qid: "PT80-S1-Q2", qnum: 2, initialAnswer: "B", correctAnswer: "C", initialCorrect: null },
    ] };
    expect(buildPracticeTestReviewQueue([run("run-1", "in-progress")], [lr()], [session()], [])).toEqual([]);
    expect(buildPracticeTestReviewQueue([run()], [bad], [], [])).toEqual([]);
    expect(buildPracticeTestReviewQueue([{ ...run(), pt: 118 }], [lr()], [session()], [])).toEqual([]);
  });

  it("only includes RC questions backed by an actual first attempt and never fabricates blanks", () => {
    const attempts = [
      { session_id: "session-run-1", question_id: 42, selected: "B", is_correct: false, flagged: false, created_at: "2026-09-01T01:30:00Z" },
      { session_id: "session-run-1", question_id: 43, selected: "A", is_correct: true, flagged: true, created_at: "2026-09-01T01:31:00Z" },
      { session_id: "session-run-1", question_id: 44, selected: null, is_correct: false, flagged: false, created_at: "2026-09-01T01:32:00Z" },
    ];
    const items = buildPracticeTestReviewQueue([run()], [], [session()], attempts);
    expect(items.map((item) => [item.key, item.reasons])).toEqual([
      ["pt:run-1:1:42", ["missed"]], ["pt:run-1:1:43", ["flagged"]],
    ]);
    expect(buildPracticeTestReviewQueue([run()], [], [{ ...session(), passage_ids: [10, 99] }], attempts)).toEqual([]);
  });
});
