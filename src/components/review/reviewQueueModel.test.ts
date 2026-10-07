import { describe, expect, it } from "vitest";
import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import type { ActivityAssignment, ActivityItemResponse } from "@/features/activity-centre/api/types";
import type { SectionHistoryRow } from "@/lib/sectionHistory";
import { UNANSWERED } from "@/lib/sectionAnswer";
import { buildActivityReviewQueue, buildReviewQueue, buildSectionReviewQueue } from "./reviewQueueModel";

function journalRow(overrides: Partial<WrongAnswerSmartRow> = {}): WrongAnswerSmartRow {
  return {
    id: "journal-1", qid: "80-2-14", label: "PT80–S2–Q14", qtype: "Flaw", level: 3,
    status: "right", attempts: 2, first_missed: "2026-09-01T00:00:00Z",
    last_attempted: "2026-09-03T00:00:00Z", last_chosen: "B", last_correct: "B", note: null,
    entry: {
      id: "journal-1", class_id: "class-1", qid: "80-2-14", pt: 80, section: 2, qnum: 14,
      qtype: "Flaw", level: 3, first_wrong_at_iso: "2026-09-01T00:00:00Z", last_status: "right",
      revisit_count: 1, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-03T00:00:00Z",
      history_json: [
        { attempt_at_iso: "2026-09-01T00:00:00Z", result: 0, chosen_answer: "C", correct_answer: "B", time_ms: 70000, confidence_1_5: null },
        { attempt_at_iso: "2026-09-03T00:00:00Z", result: 1, chosen_answer: "B", correct_answer: "B", time_ms: 60000, confidence_1_5: null },
      ],
    },
    ...overrides,
  };
}

function flagRow(overrides: Partial<FlaggedQuestionRow> = {}): FlaggedQuestionRow {
  return {
    id: "flag-1", class_id: "class-1", user_id: "user-1", qid: "80-2-14", pt: 80,
    section: 2, qnum: 14, qtype: "Flaw", level: 3, note: "Look at choice C",
    flagged_at: "2026-09-04T00:00:00Z", ...overrides,
  };
}

describe("buildReviewQueue", () => {
  it("keeps the first answer and full source meaning after a later correct answer", () => {
    const original = journalRow();
    const [item] = buildReviewQueue([original], [flagRow()]);
    expect(item.reasons).toEqual(["missed", "flagged"]);
    expect(item.sources).toEqual(["wrong_answer_journal", "flagged_questions"]);
    expect(item.firstAnswer).toBe("C");
    expect(item.latestAnswer).toBe("B");
    expect(item.flaggedNote).toBe("Look at choice C");
    expect(item.lastActivityAt).toBe("2026-09-04T00:00:00Z");
    expect(original.entry.history_json).toHaveLength(2);
  });

  it("does not call a neutral journal bridge a missed answer", () => {
    const neutral = journalRow({ entry: { ...journalRow().entry, history_json: [], last_status: "right" } });
    expect(buildReviewQueue([neutral], [])).toEqual([]);
    const [item] = buildReviewQueue([neutral], [flagRow()]);
    expect(item.reasons).toEqual(["flagged"]);
    expect(item.firstAnswer).toBeNull();
  });

  it("keeps separate questions and orders the newest activity first", () => {
    const items = buildReviewQueue([journalRow()], [flagRow({ qid: "90-1-2", pt: 90, section: 1, qnum: 2, flagged_at: "2026-09-08T00:00:00Z" })]);
    expect(items.map((item) => item.qid)).toEqual(["90-1-2", "80-2-14"]);
  });
});

function activityAssignment(id: string, overrides: Partial<ActivityAssignment> = {}): ActivityAssignment {
  return {
    id, activity_id: "activity-1", student_id: "student-1", title: "Spot the Relationship",
    subtitle: null, instructions: {}, item_format: "free-text",
    items: [{ order: 1, prompt: "Find the relationship", credited_answers: ["A implies B"], explanation: "The arrow points to B", category: "Conditional" }],
    status: "completed", score: 50, started_at: "2026-09-01T00:00:00Z", completed_at: "2026-09-01T01:00:00Z",
    assigned_by: "teacher-1", class_id: "class-1", created_at: "2026-08-31T00:00:00Z", ...overrides,
  };
}

function activityResponse(assignmentId: string, attemptNo: number, verdict: ActivityItemResponse["verdict"]): ActivityItemResponse {
  return {
    id: `${assignmentId}-${attemptNo}`, assignment_id: assignmentId, student_id: "student-1", item_order: 1,
    response_text: attemptNo === 1 ? "B implies A" : "A implies B", verdict, attempt_no: attemptNo,
    created_at: `2026-09-01T00:0${attemptNo}:00Z`,
  };
}

describe("buildActivityReviewQueue", () => {
  it("keeps a judged miss after a later correct answer, with the exact item link", () => {
    const [item] = buildActivityReviewQueue([activityAssignment("run-1")], [
      activityResponse("run-1", 2, "correct"), activityResponse("run-1", 1, "partial"),
    ]);
    expect(item.key).toBe("activity:run-1:1");
    expect(item.href).toBe("/review/activity/run-1/1");
    expect(item.firstAnswer).toBe("B implies A");
    expect(item.latestAnswer).toBe("A implies B");
    expect(item.firstMissAt).toBe("2026-09-01T00:01:00Z");
    expect(item.sources).toEqual(["activity_item_responses"]);
  });

  it("retains repeated assignments as distinct misses", () => {
    const items = buildActivityReviewQueue(
      [activityAssignment("run-1"), activityAssignment("run-2")],
      [activityResponse("run-1", 1, "incorrect"), activityResponse("run-2", 1, "partial")],
    );
    expect(items.map((item) => item.key).sort()).toEqual(["activity:run-1:1", "activity:run-2:1"]);
  });

  it("excludes unjudged and spoken-recall work", () => {
    const items = buildActivityReviewQueue(
      [activityAssignment("unjudged"), activityAssignment("section", { mode: "section", item_format: "spoken-recall" })],
      [activityResponse("unjudged", 1, null), activityResponse("section", 1, "incorrect")],
    );
    expect(items).toEqual([]);
  });

  it("does not reveal credited answers while an assignment is still in progress", () => {
    const items = buildActivityReviewQueue(
      [activityAssignment("run-1", { status: "in_progress", completed_at: null })],
      [activityResponse("run-1", 1, "incorrect")],
    );
    expect(items).toEqual([]);
  });
});

function sectionRow(id: string, overrides: Partial<SectionHistoryRow> = {}): SectionHistoryRow {
  return {
    id, pt: 80, section: 2, mode: "full-section", practiceTestRunId: null,
    initialScore: 0, initialTotal: 2, initialPercent: 0,
    brScore: null, brPercent: null, brDelta: null, brUsed: false,
    totalTimeMs: 1000, avgTimeMs: 500, unansweredCount: 2,
    byQtype: {}, byDifficulty: {}, analysis: null,
    completedAt: "2026-09-10T00:00:00Z",
    questions: [
      { qid: "80-2-1", qnum: 1, qtype: "Flaw", difficulty: 3, initialAnswer: UNANSWERED, correctAnswer: "B", initialCorrect: false, flagged: false, timeMs: 500, switchCount: 0, everVisited: true },
      { qid: "80-2-2", qnum: 2, qtype: "Strengthen", difficulty: 2, initialAnswer: UNANSWERED, correctAnswer: "C", initialCorrect: false, flagged: false, timeMs: 0, switchCount: 0, everVisited: false },
    ],
    ...overrides,
  };
}

describe("buildSectionReviewQueue", () => {
  it("includes only opened blanks from completed standalone sections with exact sitting links", () => {
    const [item] = buildSectionReviewQueue([sectionRow("sitting-1")]);
    expect(item.key).toBe("section:sitting-1:80-2-1");
    expect(item.href).toBe("/review/section/sitting-1/80-2-1");
    expect(item.reasons).toEqual(["skipped"]);
    expect(item.sources).toEqual(["section_history"]);
    expect(item.firstAnswer).toBeNull();
  });

  it("preserves repeat sittings and excludes PT legs and legacy rows without question detail", () => {
    const rows = [sectionRow("sitting-1"), sectionRow("sitting-2"), sectionRow("pt-leg", { practiceTestRunId: "pt-run" }), sectionRow("legacy", { questions: [] }), sectionRow("other", { mode: "practice-test" })];
    expect(buildSectionReviewQueue(rows).map((item) => item.key)).toEqual(["section:sitting-1:80-2-1", "section:sitting-2:80-2-1"]);
  });

  it("does not call an answered question or an unknown visit a deliberate skip", () => {
    const answered = { ...sectionRow("x").questions[0], initialAnswer: "A" };
    const unknown = { ...sectionRow("x").questions[0], qid: "80-2-3", everVisited: undefined };
    expect(buildSectionReviewQueue([sectionRow("x", { questions: [answered, unknown] })])).toEqual([]);
  });
});
