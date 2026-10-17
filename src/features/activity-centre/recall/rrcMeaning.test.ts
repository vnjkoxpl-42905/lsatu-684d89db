import { describe, expect, it } from "vitest";
import { buildEvidenceUnits, buildJudgeEntries, buildJudgePrompt, buildJudgeResponseSchema, gradeStimulus, parseJudgeReply, toDetailsByLine, type JudgeEntry } from "./grading";

const response = (carried: boolean, evidence: string, reason = "") => JSON.stringify({
  verdicts: [{ id: 1, carried, evidence, reason }],
});

describe("structured judge response contract", () => {
  it("uses the actual nonconsecutive Detail ids and requires evidence on every verdict", () => {
    const schema = buildJudgeResponseSchema({ entries: [{ id: 2 }, { id: 7 }] }) as any;
    expect(schema.properties.verdicts).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(schema.properties.verdicts.items.properties.id.enum).toEqual([2, 7]);
    expect(schema.properties.verdicts.items.required).toEqual(["id", "carried", "evidence", "reason", "material", "material_reason"]);
    expect(schema.properties.uncertain_details.items.enum).toEqual([2, 7]);
    expect(schema.required).toContain("uncertain_details");
    expect(schema.properties).not.toHaveProperty("read_given");
    expect(schema.properties).not.toHaveProperty("lines");
    expect(schema.properties).not.toHaveProperty("recall");
  });

  it("adds only requested Read and line assessments with closed required objects", () => {
    const schema = buildJudgeResponseSchema({ entries: [{ id: 1 }], theRead: "A mistaken reversal.",
      lines: [{ n: 1 }, { n: 3 }] }) as any;
    expect(schema.required).toEqual(expect.arrayContaining(["read_given", "read_matches", "read_reason", "lines", "recall"]));
    expect(schema.properties.lines).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(schema.properties.lines.items.properties.n.enum).toEqual([1, 3]);
    const visit = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "object") {
        expect(node.additionalProperties).toBe(false);
        expect(node.required).toEqual(Object.keys(node.properties));
      }
      Object.values(node).forEach((child) => {
        if (Array.isArray(child)) child.forEach(visit);
        else if (child && typeof child === "object") visit(child);
      });
    };
    visit(schema);
  });

  it("refuses an empty Detail contract", () => {
    expect(() => buildJudgeResponseSchema({ entries: [] })).toThrow("at least one Detail");
  });
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
  it("allows an empty uncertainty list but refuses to grade unresolved transcript meaning", () => {
    const base = JSON.parse(response(true, "Sweden"));
    expect(parseJudgeReply(JSON.stringify({ ...base, uncertain_details: [] }), [1], "Sweden.").verdicts[1])
      .toBe(true);
    expect(() => parseJudgeReply(JSON.stringify({ ...base, uncertain_details: [1] }), [1], "Sweden."))
      .toThrow("transcript meaning is uncertain");
    expect(parseJudgeReply(JSON.stringify({ ...base, uncertain_details: [1] }), [1]).verdicts[1]).toBe(true);
  });

  it.each([null, "1", ["1"], [9]])("refuses malformed uncertainty metadata: %j", (uncertain_details) => {
    expect(() => parseJudgeReply(JSON.stringify({ ...JSON.parse(response(true, "Sweden")), uncertain_details }),
      [1], "Sweden.")).toThrow("malformed uncertain_details");
  });
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
  expect(prompt).toContain("return evidence_ids");
  expect(prompt).toContain("Do NOT use it as evidence");
  expect(prompt).toContain("Treat\n  equivalent meanings consistently");
  expect(prompt).toContain("Equivalent quantity expressions count");
  expect(prompt).toContain("put that Detail id in uncertain_details");
  expect(prompt).not.toContain("When you are genuinely torn, mark it NOT carried");
  expect(prompt).not.toContain("A dropped proper noun, number or");
  expect(prompt).toContain("unrelated examples, not evidence");
  expect(prompt).toContain("The universal claim changed");
  expect(prompt).toContain("Negation changed the claim");
  expect(prompt).toContain("The direction reversed");
  expect(prompt).toContain("ORIGINAL STIMULUS, never against this correct run");
  expect(prompt).not.toContain("Matching its phrasing closely is a warning sign");
});

it("uses a fixed source-only rubric without choosing importance from the learner response", () => {
  const prompt = buildJudgePrompt({ stimulus: "A sample claim.", spoken: "My sample retelling.",
    entries: buildJudgeEntries([{ n: 1, text: "A sample detail.", kind: "content" }], []) });
  expect(prompt).toContain("Materiality is FIXED by the source-only rubric");
  expect(prompt).toContain("before this learner's response is seen");
  expect(prompt).toContain("Every contradiction remains a factual miss");
  expect(prompt).toContain("Do not infer a new denominator");
  expect(prompt).toContain("Red was not carried");
  expect(prompt).toContain("Calling the cart blue instead would contradict the source");
  expect(prompt).toContain("The mechanism is carried without repeating its technical wording");
  expect(prompt).not.toMatch(/stalagmites|seawater|single spot|French divers|PT105/);
});

describe("The Read allows sound alternative analysis", () => {
  it("treats the authored Read as one example while requiring a premise-grounded alternative", () => {
    const prompt = buildJudgePrompt({ stimulus: "People attending a workshop improved, so the workshop caused improvement.",
      spoken: "Could the participants already be practising more?", theRead: "Perhaps improvement led them to attend.",
      entries: buildJudgeEntries([{ n: 1, text: "The workshop is said to cause improvement.", kind: "content" }], []) });
    expect(prompt).toContain("ONE AUTHORED READ (a valid example, not an exhaustive answer key)");
    expect(prompt).toContain("Accept the authored example OR a different sound analytical observation");
    expect(prompt).toContain("consistent with the stated premises");
    expect(prompt).toContain("contradicts an explicit premise");
    expect(prompt).toContain("merely possible is not enough");
    expect(prompt).toContain("rather\n  than saying she failed to match the example");
    expect(prompt).not.toContain("the SAME move as THE READ above");
    expect(prompt).not.toMatch(/vaccine|subsid|per.dose|profit margin/i);
  });

  it("keeps a valid Read separate from credit for facts the learner never carried", () => {
    const entries = buildJudgeEntries([{ n: 1, text: "All participants improved.", kind: "content" }], []);
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [{ id: 1, carried: false }],
      read_given: true, read_matches: true, read_reason: "A different source-consistent causal gap was identified." }), [1]);
    expect(gradeStimulus(entries, reply)).toMatchObject({ percent: 0, readGiven: true, readMatches: true });
    reply.readGiven = false;
    expect(gradeStimulus(entries, reply).readMatches).toBe(false);
  });
});

describe("grounded evidence ids and meaning distinct from factual coverage", () => {
  const verdict = (id: number, carried: boolean, evidence_ids: number[], material: boolean, reason = "Changed claim.") => ({
    id, carried, evidence_ids, reason: carried ? "" : reason, material,
    material_reason: material ? "Needed for the claim." : "An unused descriptor does not change this inference.",
  });

  it("makes stable verbatim units and a schema containing only valid evidence ids", () => {
    const spoken = "The clinic opened. It closes at six.";
    expect(buildEvidenceUnits(spoken)).toEqual([{ id: 1, text: "The clinic opened." }, { id: 2, text: "It closes at six." }]);
    const schema = buildJudgeResponseSchema({ entries: [{ id: 1 }], spoken }) as any;
    expect(schema.properties.verdicts.items.properties).not.toHaveProperty("evidence");
    expect(schema.properties.verdicts.items.properties.evidence_ids).toEqual({
      type: "array", items: { type: "integer" },
    });
  });

  it("reconstructs multiple nonadjacent quotations instead of accepting rewritten model words", () => {
    const spoken = "The clinic opened. Some unrelated speech. It closes at six.";
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [{ ...verdict(1, true, [1, 3], true),
      evidence: "A fabricated replacement" }] }), [1], spoken);
    expect(reply.detailEvidence?.[1].evidence).toBe("The clinic opened.\nIt closes at six.");
  });

  it.each([{ evidence_ids: [99] }, { evidence_ids: ["1"] }, { evidence_ids: [1, 1] }])(
    "rejects invalid evidence selection $evidence_ids", ({ evidence_ids }) => {
    expect(() => parseJudgeReply(JSON.stringify({ verdicts: [{ ...verdict(1, true, [], true), evidence_ids }] }),
      [1], "The clinic opened.")).toThrow("invalid student evidence ids");
    });

  it("keeps a truthful incidental omission in coverage while preserving material meaning", () => {
    const entries: JudgeEntry[] = [
      { id: 1, text: "The cave filled completely.", kind: "content", decoy: false, reviewedMaterial: true, materialityKeyVersion: "test-v1", materialityKeyStatus: "reviewed" },
      { id: 2, text: "The pillars are stone.", kind: "content", decoy: false, reviewedMaterial: false, materialityKeyVersion: "test-v1", materialityKeyStatus: "reviewed" },
    ];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, true, [1], true),
      verdict(2, false, [], false, "Stone was not explicitly stated.")] }), [1, 2], "The cave filled completely.");
    const grade = gradeStimulus(entries, reply);
    expect(grade.percent).toBe(50);
    expect(grade.total).toBe(2);
    expect(grade.meaning_percent).toBe(100);
    expect(grade.meaning_total).toBe(1);
    expect(grade.incidental_misses).toEqual(["The pillars are stone."]);
    expect(grade.detail_evidence?.[2].carried).toBe(false);
    expect(grade.meaning_key_version).toBe("test-v1");
    expect(grade.meaning_key_status).toBe("reviewed");
  });

  it("does not allow model incidental labels to hide quantifiers or structure", () => {
    const entries: JudgeEntry[] = [
      { id: 1, text: "All permits expired.", kind: "content", decoy: false },
      { id: 2, text: "This is the conclusion.", kind: "structure", decoy: false },
    ];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, false, [], false), verdict(2, false, [], false)] }),
      [1, 2], "Something happened.");
    const grade = gradeStimulus(entries, reply);
    expect(grade.meaning_total).toBe(2);
    expect(grade.meaning_percent).toBe(0);
    expect(grade.incidental_misses).toEqual([]);
  });

  it("does not produce perfect meaning when no material judgment exists", () => {
    const entries: JudgeEntry[] = [{ id: 1, text: "The pillars are stone.", kind: "content", decoy: false }];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, false, [], false)] }), [1], "Pillars.");
    expect(gradeStimulus(entries, reply)).toMatchObject({ meaning_percent: 0, meaning_total: 1, meaning_key_status: "fallback", meaning_key_version: null });
  });

  it("keeps a reviewed alias group material if any member is material", () => {
    const entries: JudgeEntry[] = [
      { id: 1, text: "The country is Sweden.", kind: "content", decoy: false, coverageGroup: "country", reviewedMaterial: false },
      { id: 2, text: "This is about Sweden.", kind: "content", decoy: false, coverageGroup: "country", reviewedMaterial: true },
    ];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, false, [], false), verdict(2, false, [], true)] }),
      [1, 2], "Norway.");
    expect(gradeStimulus(entries, reply)).toMatchObject({ total: 1, meaning_total: 1, meaning_percent: 0 });
  });

  it("retains an explicit incidental contradiction as a factual miss without a model-selected meaning penalty", () => {
    const entries: JudgeEntry[] = [
      { id: 1, text: "The cart arrived before noon.", kind: "content", decoy: false, reviewedMaterial: true },
      { id: 2, text: "The cart was red.", kind: "content", decoy: false, reviewedMaterial: false },
    ];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, true, [1], false),
      verdict(2, false, [2], true, "Blue contradicts red.")] }), [1, 2], "The cart arrived before noon. It was blue.");
    const grade = gradeStimulus(entries, reply);
    expect(grade.percent).toBe(50);
    expect(grade.missed).toEqual(["The cart was red."]);
    expect(grade.meaning_percent).toBe(100);
    expect(grade.detail_evidence?.[2].material).toBe(false);
  });

  it("deducts a reviewed essential contradiction even if the model calls it incidental", () => {
    const entries: JudgeEntry[] = [{ id: 1, text: "The cart arrived before noon.", kind: "content", decoy: false, reviewedMaterial: true }];
    const reply = parseJudgeReply(JSON.stringify({ verdicts: [verdict(1, false, [1], false, "After reverses the timing.")] }), [1], "It arrived after noon.");
    expect(gradeStimulus(entries, reply)).toMatchObject({ percent: 0, meaning_percent: 0, meaning_total: 1 });
  });

  it("rejects a new evidence-id response without a material audit", () => {
    expect(() => parseJudgeReply(JSON.stringify({ verdicts: [
      { id: 1, carried: true, evidence_ids: [1], reason: "" },
    ] }), [1], "Sweden.")).toThrow("no material audit");
  });
});
