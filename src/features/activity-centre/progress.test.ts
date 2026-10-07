import { describe, expect, it } from "vitest";
import { reconstructProgress, scoreFor } from "./progress";
import { MAX_ATTEMPTS } from "./api/types";
import type { ActivityItem, ActivityItemResponse, Verdict } from "./api/types";

// Resume is the whole promise of the Activity player: every attempt is written
// as it happens, so leaving mid-run can never cost a student work. These pin
// the replay that turns the attempt log back into a position in the run.

function items(n: number): ActivityItem[] {
  return Array.from({ length: n }, (_, i) => ({
    order: i + 1,
    prompt: `prompt ${i + 1}`,
    credited_answers: [`answer ${i + 1}`],
    explanation: "",
  }));
}

let id = 0;
function row(
  item_order: number,
  attempt_no: number,
  verdict: Verdict | null,
  response_text = `wrote ${item_order}.${attempt_no}`,
): ActivityItemResponse {
  return {
    id: `r${id++}`,
    assignment_id: "a1",
    student_id: "s1",
    item_order,
    attempt_no,
    verdict,
    response_text,
    created_at: new Date().toISOString(),
  };
}

describe("reconstructProgress", () => {
  it("reports an untouched run as nothing done", () => {
    const p = reconstructProgress(items(5), []);
    expect(p.resolvedCount).toBe(0);
    expect(p.pendingAttempts).toBe(0);
    expect(p.pendingText).toBe("");
    expect(p.verdicts).toEqual({});
  });

  it("resolves an item the student got right on the first try", () => {
    const p = reconstructProgress(items(5), [row(1, 1, "correct")]);
    expect(p.resolvedCount).toBe(1);
    expect(p.verdicts[1]).toBe("correct");
    expect(p.responses[1]).toBe("wrote 1.1");
  });

  it("resolves an item at the attempt cap and keeps the verdict they earned", () => {
    const p = reconstructProgress(items(5), [row(1, 1, "incorrect"), row(1, MAX_ATTEMPTS, "partial")]);
    expect(p.resolvedCount).toBe(1);
    expect(p.verdicts[1]).toBe("partial");
  });

  it("resolves an item the Coach failed on, since the answer was revealed", () => {
    const p = reconstructProgress(items(5), [row(1, 1, null)]);
    expect(p.resolvedCount).toBe(1);
    expect(p.verdicts[1]).toBeNull();
  });

  it("stops at the first item never touched", () => {
    const log = [row(1, 1, "correct"), row(2, 1, "correct"), row(3, 1, "correct")];
    const p = reconstructProgress(items(10), log);
    expect(p.resolvedCount).toBe(3);
    expect(p.pendingAttempts).toBe(0);
  });

  it("carries the spent attempt and the typed words of the item they stopped ON", () => {
    const log = [
      row(1, 1, "correct"),
      row(2, 1, "incorrect", "my half-finished try"),
    ];
    const p = reconstructProgress(items(6), log);
    // Item 2 is NOT resolved: one sub-cap attempt means they were mid-retry.
    expect(p.resolvedCount).toBe(1);
    expect(p.pendingAttempts).toBe(1);
    expect(p.pendingText).toBe("my half-finished try");
    expect(p.verdicts[2]).toBeUndefined();
  });

  it("reads the log in any order, since PostgREST ordering is not a guarantee", () => {
    const log = [row(2, 2, "partial"), row(1, 1, "correct"), row(2, 1, "incorrect")];
    const p = reconstructProgress(items(5), log);
    expect(p.resolvedCount).toBe(2);
    expect(p.verdicts[2]).toBe("partial");
  });

  it("credits a correct attempt even when a later row exists for the same item", () => {
    const log = [row(1, 1, "correct"), row(1, 2, "incorrect")];
    const p = reconstructProgress(items(3), log);
    expect(p.verdicts[1]).toBe("correct");
    expect(p.responses[1]).toBe("wrote 1.1");
  });

  it("counts a fully answered run as resolved to the end", () => {
    const log = items(4).map((i) => row(i.order, 1, "correct"));
    const p = reconstructProgress(items(4), log);
    expect(p.resolvedCount).toBe(4);
  });

  it("takes the highest attempt number as the count spent, not the row count", () => {
    // Legacy logs carry duplicate attempt numbers from the pre-resume runner,
    // which restarted every reopened run at question one.
    const log = [row(1, 1, "incorrect"), row(1, 1, "incorrect")];
    const p = reconstructProgress(items(3), log);
    expect(p.resolvedCount).toBe(0);
    expect(p.pendingAttempts).toBe(1);
  });
});

describe("scoreFor", () => {
  const ten = (v: (Verdict | null)[]) =>
    Object.fromEntries(v.map((verdict, i) => [i + 1, verdict])) as Record<number, Verdict | null>;

  it("scores a clean run over every item", () => {
    const score = scoreFor(ten(Array(10).fill("correct")), 10);
    expect(score).toEqual({ numerator: 10, judged: 10, total: 10, percent: 100 });
  });

  it("weights a partial at half", () => {
    const score = scoreFor(ten(["correct", "partial", ...Array(8).fill("incorrect")]), 10);
    expect(score.numerator).toBe(1.5);
    expect(score.percent).toBe(15);
  });

  // The defect this exists to kill: an item nobody judged used to be
  // arithmetically identical to an item the student got wrong.
  it("does not count an unjudged item as a wrong one", () => {
    const withOutage = scoreFor(ten([...Array(9).fill("correct"), null]), 10);
    const withoutIt = scoreFor(ten(Array(9).fill("correct")), 9);
    expect(withOutage.percent).toBe(100);
    expect(withOutage.percent).toBe(withoutIt.percent);
  });

  it("keeps the denominator it used in view", () => {
    const score = scoreFor(ten([...Array(9).fill("correct"), null]), 10);
    expect(score.judged).toBe(9);
    expect(score.total).toBe(10);
  });

  // Returning 0 here would repeat the false judgement, just with a bigger number.
  it("returns no percentage at all when nothing was judged", () => {
    expect(scoreFor(ten(Array(5).fill(null)), 5).percent).toBeNull();
    expect(scoreFor({}, 5).percent).toBeNull();
  });

  it("returns no percentage for an empty run rather than dividing by zero", () => {
    expect(scoreFor({}, 0)).toEqual({ numerator: 0, judged: 0, total: 0, percent: null });
  });

  it("rounds to a whole percent", () => {
    expect(scoreFor(ten(["correct", "correct", "incorrect"]), 3).percent).toBe(67);
  });
});
