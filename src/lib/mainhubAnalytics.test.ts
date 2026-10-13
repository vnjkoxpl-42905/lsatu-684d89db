import { describe, it, expect } from "vitest";
import {
  computeStudentAnalytics,
  type AttemptRow,
  type QuestionResolver,
  MIN_SAMPLE,
} from "./mainhubAnalytics";

const NOW = Date.parse("2026-07-02T12:00:00.000Z");
const DAY = 86_400_000;

function daysAgo(n: number): string {
  return new Date(NOW - n * DAY).toISOString();
}

function row(partial: Partial<AttemptRow> & { qid: string; correct: boolean }): AttemptRow {
  return {
    qtype: "Flaw",
    level: 3,
    mode: "type-drill",
    time_ms: 60_000,
    timestamp_iso: daysAgo(1),
    ...partial,
  };
}

const noMeta: QuestionResolver = () => undefined;

describe("computeStudentAnalytics", () => {
  it("returns empty analytics for no rows", () => {
    const a = computeStudentAnalytics([], noMeta, NOW);
    expect(a.hasData).toBe(false);
    expect(a.firstAttemptAccuracy).toBeNull();
    expect(a.totalAttempts).toBe(0);
    expect(a.priorities).toEqual([]);
  });

  it("uses first attempt for diagnostic accuracy and keeps repeats separate", () => {
    const rows: AttemptRow[] = [
      // q1: first wrong (day 5), repeat right (day 1)
      row({ qid: "q1", correct: false, timestamp_iso: daysAgo(5) }),
      row({ qid: "q1", correct: true, timestamp_iso: daysAgo(1) }),
      // q2: first right
      row({ qid: "q2", correct: true, timestamp_iso: daysAgo(4) }),
    ];
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    // First attempts: q1 wrong, q2 right => 50%
    expect(a.firstAttemptAccuracy).toBe(50);
    // Repeat: q1 right => 100%
    expect(a.repeatAccuracy).toBe(100);
    expect(a.totalQuestions).toBe(2);
    expect(a.totalAttempts).toBe(3);
  });

  it("treats the earliest timestamp as the first attempt regardless of input order", () => {
    const rows: AttemptRow[] = [
      row({ qid: "q1", correct: true, timestamp_iso: daysAgo(1) }), // later, listed first
      row({ qid: "q1", correct: false, timestamp_iso: daysAgo(9) }), // earliest -> first attempt (wrong)
    ];
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    expect(a.firstAttemptAccuracy).toBe(0);
    expect(a.repeatAccuracy).toBe(100);
  });

  it("ranks a well-sampled mid-accuracy weakness above a single 0% attempt", () => {
    const rows: AttemptRow[] = [];
    // Flaw: 20 first attempts at ~48%
    for (let i = 0; i < 20; i += 1) {
      rows.push(row({ qid: `flaw${i}`, qtype: "Flaw", correct: i % 25 < 12 ? false : true }));
    }
    // Assumption: 1 first attempt at 0%
    rows.push(row({ qid: "assume1", qtype: "Assumption", correct: false }));
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    // Assumption has too small a sample to score.
    expect(a.priorities[0].key).toBe("Flaw");
    const assumption = a.priorities.find((p) => p.key === "Assumption");
    expect(assumption).toBeUndefined();
  });

  it("does not score dimensions below the minimum sample", () => {
    const rows: AttemptRow[] = [
      row({ qid: "q1", qtype: "Parallel", correct: false }),
      row({ qid: "q2", qtype: "Parallel", correct: false }),
    ];
    // Only 2 first attempts < MIN_SAMPLE
    expect(MIN_SAMPLE).toBeGreaterThan(2);
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    expect(a.priorities).toEqual([]);
    const stat = a.byType.find((t) => t.key === "Parallel");
    expect(stat?.reliable).toBe(false);
  });

  it("buckets reasoning types and features from the resolver", () => {
    const resolve: QuestionResolver = (qid) =>
      qid === "q1"
        ? { reasoningType: ["Causation"], questionFeatures: ["Causal Chains"] }
        : { reasoningType: ["Conditional Reasoning"] };
    const rows: AttemptRow[] = [
      row({ qid: "q1", correct: false }),
      row({ qid: "q2", correct: true }),
    ];
    const a = computeStudentAnalytics(rows, resolve, NOW);
    expect(a.byReasoning.map((r) => r.key).sort()).toEqual([
      "Causation",
      "Conditional Reasoning",
    ]);
    expect(a.byFeature[0].key).toBe("Causal Chains");
  });

  it("computes a 7d-over-prior-7d trend delta when both windows are sampled", () => {
    const rows: AttemptRow[] = [
      // last 7d: 3 first attempts, all correct => 100%
      row({ qid: "a", correct: true, timestamp_iso: daysAgo(1) }),
      row({ qid: "b", correct: true, timestamp_iso: daysAgo(2) }),
      row({ qid: "c", correct: true, timestamp_iso: daysAgo(3) }),
      // prior 7d (8-14 days): 4 first attempts, 2 correct => 50%
      row({ qid: "d", correct: true, timestamp_iso: daysAgo(9) }),
      row({ qid: "e", correct: true, timestamp_iso: daysAgo(10) }),
      row({ qid: "f", correct: false, timestamp_iso: daysAgo(11) }),
      row({ qid: "g", correct: false, timestamp_iso: daysAgo(12) }),
    ];
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    expect(a.trendDelta).toBe(50);
  });

  it("emits 30 daily volume buckets", () => {
    const rows: AttemptRow[] = [
      row({ qid: "q1", correct: true, timestamp_iso: daysAgo(0) }),
      row({ qid: "q2", correct: true, timestamp_iso: daysAgo(0) }),
    ];
    const a = computeStudentAnalytics(rows, noMeta, NOW);
    expect(a.volumeByDay).toHaveLength(30);
    const today = a.volumeByDay[a.volumeByDay.length - 1];
    expect(today.attempts).toBe(2);
  });
});
