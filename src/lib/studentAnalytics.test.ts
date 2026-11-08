import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
    getQuestion: (qid: string) => ({
      q1: { pt: 101, section: 2, qnum: 1, qtype: "Flaw", questionFeatures: ["Causal"], difficulty: 3, correctAnswer: "A" },
      q2: { pt: 101, section: 2, qnum: 2, qtype: "Flaw", questionFeatures: [], difficulty: 4, correctAnswer: "B" },
      q3: { pt: 102, section: 1, qnum: 5, qtype: "Weaken", questionFeatures: ["Causal"], difficulty: 2, correctAnswer: "C" },
    } as Record<string, unknown>)[qid] ?? null,
  },
}));

import { buildSittings, drillAnswersMissingFrom, performanceSeries, questionRows, tagAnalytics, type AttemptRow } from "./studentAnalytics";

const at = (qid: string, correct: boolean, ts: string, selected = "D"): AttemptRow => ({
  qid, pt: null, section: null, qnum: null, qtype: null, level: null, mode: null,
  selected_answer: selected, correct, time_ms: 60000, timestamp_iso: ts, br_answer: null, br_outcome: null,
});

describe("tagAnalytics", () => {
  it("scores each tag from first answers only, and tags features as reasoning", () => {
    const tags = tagAnalytics([
      at("q1", false, "2026-11-01"), at("q1", true, "2026-11-02"), // retry ignored
      at("q2", true, "2026-11-01"), at("q3", false, "2026-11-01"),
    ], 170);
    const flaw = tags.find((t) => t.tag === "Flaw")!;
    expect(flaw).toMatchObject({ group: "LR Question Stem", answered: 2, correct: 1 });
    expect(tags.find((t) => t.tag === "Causal")).toMatchObject({ group: "LR Reasoning", answered: 2, correct: 0 });
    expect(flaw.vsGoal).toBe(flaw.tagScore - 170);
    expect(flaw.limitedData).toBe(true);
  });

  it("puts the weakest, most-seen tag first and calls it Highest", () => {
    const tags = tagAnalytics([at("q1", false, "a"), at("q3", false, "b"), at("q2", true, "c")], 170);
    expect(tags[0].tag).toBe("Causal");
    // Two answers is limited data, so even the weakest tag stops at Medium.
    expect(tags[0].priority).toBe("Medium");
    expect(tags.every((t) => t.priority !== "Highest" && t.priority !== "High")).toBe(true);
  });
});

describe("questionRows", () => {
  it("keeps the first answer and counts every time the question was seen", () => {
    const rows = questionRows([at("q1", false, "2026-11-01", "C"), at("q1", true, "2026-11-03", "A")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: "PT101.S2.Q1", firstCorrect: false, firstAnswer: "C", correctAnswer: "A", timesSeen: 2, lastSeen: "2026-11-03" });
  });
});

describe("history and performance", () => {
  const practice = {
    attempts: [],
    sections: [{ id: "s1", pt: 107, section: 3, mode: "full-section", initial_score: 16, initial_total: 25, br_used: true, br_score: 20, br_total: 25, completed_at: "2026-10-30T00:00:00Z", time_taken_ms: 1, practice_test_run_id: null }],
    practiceTests: [
      { id: "p1", pt: 130, status: "complete", completed_at: "2026-11-01T00:00:00Z", raw_correct: 50, raw_total: 75, scaled_score: 152 },
      { id: "p2", pt: 131, status: "in-progress", completed_at: null, raw_correct: null, raw_total: null, scaled_score: null },
    ],
    drills: [{ id: "d1", source_key: "drill::type-drill::x", label: "Flaw set", updated_at: "2026-11-05T00:00:00Z",
      session: { status: "completed", attempts: [{ qid: "q1", correct: true }, { qid: "q2", correct: false }], question_queue: ["q1", "q2"] } }],
  } as unknown as Parameters<typeof buildSittings>[0];

  it("lists finished PrepTests, sections and drills newest first", () => {
    const s = buildSittings(practice);
    expect(s.map((x) => x.title)).toEqual(["Flaw set", "PT130", "PT107.S3"]);
    expect(s[1].score).toEqual({ kind: "scaled", value: 152 });
    expect(s[2]).toMatchObject({ score: { kind: "percent", value: 64 }, br: { kind: "percent", value: 80 } });
    expect(s[0]).toMatchObject({ drillRunId: "d1", score: { kind: "percent", value: 50 } });
  });

  it("charts only the kinds that are switched on, oldest first", () => {
    const s = buildSittings(practice);
    const pts = performanceSeries(s, { preptest: true, section: true, drill: false });
    expect(pts.map((p) => p.title)).toEqual(["PT107.S3", "PT130"]);
    expect(pts[1].score).toBe(152);
    expect(pts[0].br).not.toBeNull();
  });
});

describe("coverage", () => {
  it("adds drill answers that never reached the attempts table, once each", () => {
    const drills = [{ id: "d", updated_at: "2026-11-05", session: { attempts: [
      { qid: "q1", correct: true, selected_answer: "A" }, { qid: "q2", correct: false, selected_answer: "C" }, { qid: "q2", correct: true },
    ] } }] as unknown as Parameters<typeof drillAnswersMissingFrom>[1];
    const extra = drillAnswersMissingFrom([at("q1", true, "x")], drills);
    expect(extra.map((a) => [a.qid, a.correct, a.selected_answer])).toEqual([["q2", false, "C"]]);
  });

  it("shows RC answers with their own label and tags, in their own section", () => {
    const rc: AttemptRow = { ...at("rc:4787", false, "2026-10-30", "E"), kind: "rc", label: "PT112.S2.Q14",
      tags: [["Inference", "RC Question Stem"], ["Science", "RC Passage Subject"]], correct_answer: "B" };
    const [row] = questionRows([rc]);
    expect(row).toMatchObject({ kind: "rc", label: "PT112.S2.Q14", tags: ["Inference", "Science"], firstAnswer: "E", correctAnswer: "B" });
    const tags = tagAnalytics([rc], 165);
    expect(tags.map((t) => [t.tag, t.group])).toEqual(expect.arrayContaining([["Inference", "RC Question Stem"], ["Science", "RC Passage Subject"]]));
  });
});
