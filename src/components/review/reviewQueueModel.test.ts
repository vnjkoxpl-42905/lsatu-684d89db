import { describe, expect, it } from "vitest";
import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import type { ActivityAssignment, ActivityItemResponse } from "@/features/activity-centre/api/types";
import type { SectionHistoryRow } from "@/lib/sectionHistory";
import { UNANSWERED } from "@/lib/sectionAnswer";
import {
  buildActivityReviewQueue,
  buildReviewQueue,
  buildSectionReviewQueue,
  mergeSectionIntoJournal,
} from "./reviewQueueModel";

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

describe("Activity response integrity", () => {
  it.each([null, "", "invalid"])("requires a real completion timestamp (%s)", completed_at => {
    expect(buildActivityReviewQueue([activityAssignment("run", { completed_at })], [activityResponse("run", 1, "incorrect")])).toEqual([]);
  });
  it("does not import foreign student or malformed attempts into a completed sitting", () => {
    const response = activityResponse("run", 1, "incorrect");
    expect(buildActivityReviewQueue([activityAssignment("run")], [
      { ...response, student_id: "other" }, { ...response, attempt_no: 0 },
      { ...response, created_at: "invalid" }, { ...response, verdict: "bogus" as never },
    ])).toEqual([]);
    const [item] = buildActivityReviewQueue([activityAssignment("run")], [response, { ...response, student_id: "other", response_text: "foreign", attempt_no: 2 }]);
    expect(item.latestAnswer).toBe(response.response_text);
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
  it("excludes opened-blank questions without regret or br_changed even on legacy rows (Plan 4.1)", () => {
    expect(buildSectionReviewQueue([sectionRow("sitting-1")])).toEqual([]);
  });

  it("includes only regret and br_changed items per history row, preserves repeat sittings, and excludes PT legs and legacy rows without question detail", () => {
    const withBr = (id: string, extra?: Partial<SectionHistoryRow>) =>
      sectionRow(id, {
        brUsed: true,
        questions: [
          { qid: "80-2-1", qnum: 1, qtype: "Flaw", difficulty: 3, initialAnswer: "A", correctAnswer: "B", initialCorrect: false, brAnswer: "B", brCorrect: true, brChanged: true, flagged: false, timeMs: 500, switchCount: 0 },
          { qid: "80-2-2", qnum: 2, qtype: "Strengthen", difficulty: 2, initialAnswer: UNANSWERED, correctAnswer: "C", initialCorrect: false, flagged: false, timeMs: 0, switchCount: 0, everVisited: true },
        ],
        ...extra,
      });
    const rows = [
      withBr("sitting-1"),
      withBr("sitting-2"),
      withBr("pt-leg", { practiceTestRunId: "pt-run" }),
      sectionRow("legacy", { questions: [] }),
      withBr("other", { mode: "practice-test" }),
    ];
    const items = buildSectionReviewQueue(rows);
    expect(items.map((item) => item.key)).toEqual(["section:sitting-1:80-2-1", "section:sitting-2:80-2-1"]);
    expect(items[0].reasons).toEqual(["br_changed"]);
    expect(items[0].href).toBe("/review/section/sitting-1?walk=1&qid=80-2-1");
  });

  it("excludes sealed assigned sections from the review queue", () => {
    const sealed = sectionRow("sealed-1", {
      releaseRequiresBr: true,
      brUsed: false,
      clientSittingId: "sit-sealed",
      questions: [
        { qid: "80-2-1", qnum: 1, qtype: "Flaw", difficulty: 3, initialAnswer: "A", correctAnswer: "A", initialCorrect: true, brAnswer: "B", brCorrect: false, brChanged: true, flagged: false, timeMs: 500, switchCount: 0 },
      ],
    });
    expect(buildSectionReviewQueue([sealed])).toEqual([]);
  });
});

describe("mergeSectionIntoJournal (Phase 4)", () => {
  it("shows an answered miss from the new close-out once, linked to the section report", () => {
    const jRow = journalRow({
      qid: "80-2-14",
      entry: {
        ...journalRow().entry,
        history_json: [
          {
            attempt_at_iso: "2026-11-20T10:00:00Z",
            result: 0,
            chosen_answer: "C",
            correct_answer: "B",
            time_ms: 70000,
            confidence_1_5: null,
            sitting_id: "sit-1",
          } as never,
        ],
      },
    });
    const secRow = sectionRow("hist-1", {
      clientSittingId: "sit-1",
      brUsed: true,
      questions: [
        {
          qid: "80-2-14",
          qnum: 14,
          qtype: "Flaw",
          difficulty: 3,
          initialAnswer: "C",
          correctAnswer: "B",
          initialCorrect: false,
          brAnswer: "B",
          brCorrect: true,
          brChanged: true,
          flagged: false,
          timeMs: 70000,
          switchCount: 0,
        },
      ],
    });
    const journalItems = buildReviewQueue([jRow], [flagRow()]);
    const sectionItems = buildSectionReviewQueue([secRow]);
    const merged = mergeSectionIntoJournal(journalItems, sectionItems, [secRow]);

    expect(merged).toHaveLength(1);
    expect(merged[0].qid).toBe("80-2-14");
    expect(merged[0].reasons).toEqual(["missed", "flagged", "br_changed"]);
    expect(merged[0].sources).toEqual(["wrong_answer_journal", "flagged_questions", "section_history"]);
    expect(merged[0].flaggedNote).toBe("Look at choice C");
    expect(merged[0].href).toBe("/review/section/hist-1?walk=1&qid=80-2-14");
  });

  it("keeps one journal episode across two miss events plus separate regret items across two sittings (Plan 4.5)", () => {
    const jRow = journalRow({
      qid: "80-2-14",
      entry: {
        ...journalRow().entry,
        revisit_count: 1,
        history_json: [
          {
            attempt_at_iso: "2026-11-17T10:00:00Z",
            result: 0,
            chosen_answer: "A",
            correct_answer: "B",
            time_ms: 65000,
            confidence_1_5: null,
            sitting_id: "sit-miss-1",
          } as never,
          {
            attempt_at_iso: "2026-11-18T10:00:00Z",
            result: 0,
            chosen_answer: "C",
            correct_answer: "B",
            time_ms: 70000,
            confidence_1_5: null,
            sitting_id: "sit-miss-2",
          } as never,
        ],
      },
    });
    const regretSitting1 = sectionRow("hist-r1", {
      clientSittingId: "sit-regret-1",
      brUsed: true,
      completedAt: "2026-11-19T10:00:00Z",
      questions: [
        {
          qid: "80-2-14",
          qnum: 14,
          qtype: "Flaw",
          difficulty: 3,
          initialAnswer: "B",
          correctAnswer: "B",
          initialCorrect: true,
          brAnswer: "D",
          brCorrect: false,
          brChanged: true,
          flagged: false,
          timeMs: 60000,
          switchCount: 0,
        },
      ],
    });
    const regretSitting2 = sectionRow("hist-r2", {
      clientSittingId: "sit-regret-2",
      brUsed: true,
      completedAt: "2026-11-20T10:00:00Z",
      questions: [
        {
          qid: "80-2-14",
          qnum: 14,
          qtype: "Flaw",
          difficulty: 3,
          initialAnswer: "B",
          correctAnswer: "B",
          initialCorrect: true,
          brAnswer: "E",
          brCorrect: false,
          brChanged: true,
          flagged: false,
          timeMs: 60000,
          switchCount: 0,
        },
      ],
    });

    const journalItems = buildReviewQueue([jRow], []);
    const sectionItems = buildSectionReviewQueue([regretSitting1, regretSitting2]);
    const merged = mergeSectionIntoJournal(journalItems, sectionItems, [regretSitting1, regretSitting2]);

    // 1 journal episode + 2 separate regret section items (different sitting ids)
    expect(merged).toHaveLength(3);
    expect(merged.filter((i) => i.reasons.includes("regret"))).toHaveLength(2);
  });

  it("never merges a historical journal event without a sitting id by question alone", () => {
    const legacyJournal = buildReviewQueue([journalRow()], []); // no sitting_id
    const secRow = sectionRow("hist-br", {
      clientSittingId: "sit-new",
      brUsed: true,
      questions: [
        {
          qid: "80-2-14",
          qnum: 14,
          qtype: "Flaw",
          difficulty: 3,
          initialAnswer: "C",
          correctAnswer: "B",
          initialCorrect: false,
          brAnswer: "B",
          brCorrect: true,
          brChanged: true,
          flagged: false,
          timeMs: 70000,
          switchCount: 0,
        },
      ],
    });
    const sectionItems = buildSectionReviewQueue([secRow]);
    const merged = mergeSectionIntoJournal(legacyJournal, sectionItems, [secRow]);

    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.key === "lr:80-2-14")?.href).toBe("/journal/80-2-14");
    expect(merged.find((i) => i.key === "section:hist-br:80-2-14")?.reasons).toEqual(["br_changed"]);
  });
});
