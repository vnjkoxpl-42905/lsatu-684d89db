import { describe, expect, it } from "vitest";
import type { FlaggedQuestionRow } from "@/lib/flaggedService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import { buildReviewQueue } from "./reviewQueueModel";

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
