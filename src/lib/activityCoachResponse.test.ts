import { describe, expect, it } from "vitest";
import { parseCoachResponse } from "../../supabase/functions/activity-coach/response";
const reply = (value: unknown) => ({ choices: [{ message: { content: JSON.stringify(value) } }] });
describe("activity coach acknowledged model judgment", () => {
  it.each(["correct", "partial", "incorrect"] as const)("retains genuine %s with supplied feedback", verdict => {
    expect(parseCoachResponse(reply({ verdict, feedback: "Explain the indicator." }), null)).toEqual({ verdict, feedback: "Explain the indicator." });
  });
  it.each([{}, { verdict: "wrong", feedback: "No." }, { verdict: null, feedback: "No." }, { verdict: "correct" }, { verdict: "incorrect", feedback: "" }, { verdict: "partial", feedback: "  \n " }, { verdict: "correct", feedback: 42 }])("rejects absent or malformed model fields instead of inventing a judgment", value => {
    expect(() => parseCoachResponse(reply(value), null)).toThrow("Malformed coach response");
  });
  it.each([null, {}, { choices: [] }, { choices: [{ message: { content: "not-json" } }] }, reply([])])("rejects malformed upstream envelopes", value => {
    expect(() => parseCoachResponse(value, null)).toThrow();
  });
  it("retains known coverage, removes invented duplicates and preserves explicit none", () => {
    const ideas = [{ n: 1 }, { n: 2 }];
    expect(parseCoachResponse(reply({ verdict: "partial", feedback: "Two ideas.", covered: [2, "1", 2, 9] }), ideas).covered).toEqual([1, 2]);
    expect(parseCoachResponse(reply({ verdict: "incorrect", feedback: "No ideas.", covered: [] }), ideas).covered).toEqual([]);
  });
  it("omits coverage if not requested or not supplied as an array", () => {
    expect(parseCoachResponse(reply({ verdict: "correct", feedback: "Yes.", covered: [1] }), null).covered).toBeUndefined();
    expect(parseCoachResponse(reply({ verdict: "correct", feedback: "Yes.", covered: null }), [{ n: 1 }]).covered).toBeUndefined();
  });
});
