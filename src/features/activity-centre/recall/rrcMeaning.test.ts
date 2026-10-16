import { describe, expect, it } from "vitest";
import { buildJudgeEntries, buildJudgePrompt, gradeStimulus, parseJudgeReply, toDetailsByLine, type JudgeEntry } from "./grading";

const response = (carried: boolean, evidence: string, reason = "") => JSON.stringify({
  verdicts: [{ id: 1, carried, evidence, reason }],
});

describe("explicit reviewed fact groups", () => {
  it("repairs only the reviewed question's exact aliases in older assignment snapshots", () => {
    const oldSnapshot = [{ details: [{ text: "Sweden is one of them." }, { text: "This is about Sweden." }] }];
    expect(toDetailsByLine(oldSnapshot, "PT102_S3_Q24").map((d) => d.coverageGroup))
      .toEqual(["country-sweden", "country-sweden"]);
    expect(toDetailsByLine(oldSnapshot, "PT105_S2_Q1").every((d) => !d.coverageGroup)).toBe(true);
    expect(toDetailsByLine(oldSnapshot).every((d) => !d.coverageGroup)).toBe(true);
    expect(toDetailsByLine([{ details: [{ text: "Sweden is different." }] }], "PT102_S3_Q24")[0].coverageGroup)
      .toBeUndefined();
  });

  it("preserves explicitly authored groups ahead of the snapshot correction", () => {
    expect(toDetailsByLine([{ details: [{ text: "This is about Sweden.", coverageGroup: "reviewed-new-key" }] }],
      "PT102_S3_Q24")[0].coverageGroup).toBe("reviewed-new-key");
  });

  const entries = buildJudgeEntries(toDetailsByLine([
    { details: [{ text: "Sweden is one of the countries.", coverageGroup: "country-sweden" }] },
    { details: [{ text: "This is about Sweden.", coverageGroup: "country-sweden" },
      { text: "Committees reduced injuries." }] },
  ]), []);

  it.each([true, false])("counts reviewed country aliases once when carried=%s", (carried) => {
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried }, { id: 2, carried }, { id: 3, carried: true },
    ] }), [1, 2, 3]);
    const grade = gradeStimulus(entries, reply);
    expect(entries[1].coverageGroup).toBe("country-sweden");
    expect(grade.total).toBe(2);
    expect(grade.carried).toBe(carried ? 2 : 1);
    expect(grade.missed).toHaveLength(carried ? 0 : 1);
  });

  it("refuses conflicting judgments of the reviewed aliases", () => {
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried: true }, { id: 2, carried: false }, { id: 3, carried: true },
    ] }), [1, 2, 3]);
    expect(() => gradeStimulus(entries, reply)).toThrow("conflicting verdicts");
  });

  it("persists each audited quote even when two verdicts share one scoring unit", () => {
    const spoken = "Norway had safety committees that reduced injuries.";
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried: false, evidence: "Norway", reason: "The country changed." },
      { id: 2, carried: false, evidence: "Norway", reason: "The same country changed." },
      { id: 3, carried: true, evidence: "safety committees that reduced injuries", reason: "" },
    ] }), [1, 2, 3], spoken);
    const grade = gradeStimulus(entries, reply);
    expect(grade.detail_evidence?.[1].evidence).toBe("Norway");
    expect(grade.detail_evidence?.[2].carried).toBe(false);
    expect(grade.detail_evidence?.[3].text).toBe("Committees reduced injuries.");
    expect(grade.total).toBe(2);
  });
});

describe("auditable meaning judgments", () => {
  it.each([null, "false", 7, []])("rejects non-object verdict rows: %j", (row) => {
    expect(() => parseJudgeReply(JSON.stringify({ verdicts: [row] }), [1], "Sweden."))
      .toThrow("not an object");
  });

  it.each(["false", "true", null, 0])("rejects non-boolean carried values: %j", (carried) => {
    expect(() => parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried, evidence: "Sweden", reason: "A country was named." },
    ] }), [1], "Sweden.")).toThrow("no boolean verdict");
  });

  it("refuses duplicate verdicts instead of allowing last-write-wins", () => {
    expect(() => parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried: true, evidence: "Sweden", reason: "" },
      { id: 1, carried: false, evidence: "Sweden", reason: "Changed." },
    ] }), [1], "Sweden.")).toThrow("duplicate verdicts");
  });

  it("refuses incomplete verdicts instead of turning a missing response into a deduction", () => {
    expect(() => parseJudgeReply(response(true, "Sweden"), [1, 2], "Sweden."))
      .toThrow("missing verdicts for Details 2");
    expect(parseJudgeReply(response(true, "Sweden"), [1, 2]).missingIds).toEqual([2]);
  });

  it("accepts evidence from a plain paraphrase despite punctuation and case", () => {
    const spoken = "Those SAFETY committees reduced workplace injuries.";
    const result = parseJudgeReply(response(true, "safety committees reduced workplace injuries"), [1], spoken);
    expect(result.verdicts[1]).toBe(true);
  });

  it("refuses source-only evidence rather than awarding invented credit", () => {
    expect(() => parseJudgeReply(response(true, "Sweden reduced occupational injuries"), [1],
      "Norway reduced workplace injuries.")).toThrow("outside the student's transcript");
  });

  it("allows a genuine omission with no quote and a concrete explanation", () => {
    expect(parseJudgeReply(response(false, "", "The country was not mentioned."), [1],
      "The committees reduced injuries.").verdicts[1]).toBe(false);
  });

  it("requires an explanation for a deduction and evidence for an award", () => {
    expect(() => parseJudgeReply(response(false, "committees", ""), [1], "The committees worked."))
      .toThrow("without a meaning explanation");
    expect(() => parseJudgeReply(response(true, ""), [1], "The committees worked."))
      .toThrow("without student evidence");
  });

  it("does not accept a quote embedded inside a different word", () => {
    expect(() => parseJudgeReply(response(true, "all"), [1], "A small group worked."))
      .toThrow("outside the student's transcript");
  });

  it("keeps the legacy parser readable when no transcript audit is requested", () => {
    expect(parseJudgeReply('{"verdicts":[{"id":1,"carried":true}]}', [1]).verdicts[1]).toBe(true);
  });
});

describe("duplicate authored detail penalties", () => {
  const entry = (id: number, text: string, line: number): JudgeEntry => ({
    id, text, line, kind: "content", decoy: false,
  });

  it("counts one identical detail on one line once, preserving a separate real omission", () => {
    const entries = [entry(1, "The country is Sweden.", 1), entry(2, " the COUNTRY is Sweden. ", 1),
      entry(3, "Injuries declined.", 1)];
    const grade = gradeStimulus(entries, parseJudgeReply(JSON.stringify({
      verdicts: [{ id: 1, carried: false }, { id: 2, carried: false }, { id: 3, carried: true }],
    }), [1, 2, 3]));
    expect(grade.total).toBe(2);
    expect(grade.percent).toBe(50);
    expect(grade.missed).toEqual(["The country is Sweden."]);
  });

  it("preserves repeated labels on different lines and non-identical facts", () => {
    const entries = [entry(1, "This is a conclusion.", 1), entry(2, "This is a conclusion.", 2),
      entry(3, "The country is Sweden.", 2), entry(4, "This is about Sweden.", 2)];
    expect(gradeStimulus(entries, parseJudgeReply('{"verdicts":[]}', [1, 2, 3, 4])).total).toBe(4);
  });

  it("refuses contradictory verdicts for identical authored facts", () => {
    const entries = [entry(1, "Sweden.", 1), entry(2, "Sweden.", 1)];
    expect(() => gradeStimulus(entries, parseJudgeReply(
      '{"verdicts":[{"id":1,"carried":true},{"id":2,"carried":false}]}', [1, 2])))
      .toThrow("conflicting verdicts");
  });
});

it("asks for meaning and student evidence while protecting the instructor reference boundary", () => {
  const prompt = buildJudgePrompt({ stimulus: "All employees work.", spoken: "Most employees work.",
    entries: buildJudgeEntries([{ n: 1, text: "All employees work.", kind: "content" }], []),
    modelRun: "Every worker has a job." });
  expect(prompt).toContain("changing Sweden to Norway");
  expect(prompt).toContain("SHORT EXACT quote from WHAT SHE SAID");
  expect(prompt).toContain("Do NOT use it as evidence");
  expect(prompt).toContain("Treat\n  equivalent meanings consistently");
});
