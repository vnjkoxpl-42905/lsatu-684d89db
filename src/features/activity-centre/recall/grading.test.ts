import { describe, expect, it } from "vitest";
import {
  BAND_FLOOR,
  JudgeReplyError,
  bandFor,
  buildJudgeEntries,
  buildJudgePrompt,
  classifyDetail,
  extractJson,
  gradeStimulus,
  isKindResidue,
  parseJudgeReply,
  toDetails,
} from "./grading";

// The grader's judgement, minus the model. Everything asserted here decides a
// number a student is shown, and every one of them fails quietly if it breaks:
// a mis-kinded Detail just looks like a slightly lower score.

describe("what a Detail asserts", () => {
  it("reads a discourse role as structure", () => {
    for (const t of [
      "This is the conclusion.",
      "This is a contrast.",
      "This is the reason given.",
      "An archaeologist is speaking.",
      "He asks a question.",
      "The word therefore introduces it.",
    ]) {
      expect(classifyDetail(t)).toBe("structure");
    }
  });

  it("reads a hedge as modality", () => {
    for (const t of [
      "This is hedged as probable.",
      "This is stated with certainty.",
      "This is almost always so.",
      "This is an average.",
    ]) {
      expect(classifyDetail(t)).toBe("modality");
    }
  });

  it("does not mistake a topic pointer for a discourse role", () => {
    // The trap the three-way split exists for. These share an opening with
    // "This is the conclusion." and are its opposite: they state a fact.
    for (const t of [
      "This is about Sweden.",
      "This is about a piece of steel.",
      "This is true of any female wood duck.",
      "This is conditional on the animals being at risk.",
      "This is after a recession.",
    ]) {
      expect(classifyDetail(t)).toBe("content");
    }
  });

  it("flags an unrecognised role-shaped phrasing instead of swallowing it", () => {
    // The classifier defaults to content, so this is the only thing that
    // surfaces a phrasing the closed set has not learned yet.
    expect(isKindResidue("This is the wibble.", "content")).toBe(true);
    expect(isKindResidue("This is about Sweden.", "content")).toBe(false);
    expect(isKindResidue("The commitment is long-standing.", "content")).toBe(false);
  });

  it("numbers details from one and keeps their order", () => {
    const d = toDetails(["A fact.", "This is the conclusion."]);
    expect(d).toEqual([
      { n: 1, text: "A fact.", kind: "content" },
      { n: 2, text: "This is the conclusion.", kind: "structure" },
    ]);
  });
});

describe("the bands", () => {
  it("starts the top band at the census 10th percentile", () => {
    // 86 is measured (ADR 0018) and is not a round number by accident. If this
    // changes, the ADR changed with it or something is wrong.
    expect(BAND_FLOOR.atTheStandard).toBe(86);
  });

  it("puts a correct run at the standard and a poor one below", () => {
    expect(bandFor(100)).toBe("at-the-standard");
    expect(bandFor(95)).toBe("at-the-standard"); // census median
    expect(bandFor(86)).toBe("at-the-standard"); // exactly the floor
    expect(bandFor(85)).toBe("nearly-there");
    expect(bandFor(72)).toBe("nearly-there");
    expect(bandFor(71)).toBe("thin");
    expect(bandFor(55)).toBe("thin");
    expect(bandFor(54)).toBe("lost-it");
    expect(bandFor(0)).toBe("lost-it");
  });
});

describe("the decoys", () => {
  const details = toDetails(["One.", "Two.", "Three.", "Four.", "Five.", "Six."]);

  it("spreads them through the list rather than appending them", () => {
    const entries = buildJudgeEntries(details, ["Decoy A.", "Decoy B."]);
    const positions = entries.filter((e) => e.decoy).map((e) => e.id);
    expect(positions).toHaveLength(2);
    // A judge that sees the odd items only at the end can treat the tail as a
    // different question, which is exactly the reasoning the decoy tests for.
    expect(positions.some((p) => p < entries.length)).toBe(true);
    expect(positions[0]).toBeLessThan(entries.length - 1);
  });

  it("numbers every entry once, in order, decoys included", () => {
    const entries = buildJudgeEntries(details, ["Decoy A.", "Decoy B."]);
    expect(entries.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(entries.filter((e) => !e.decoy)).toHaveLength(6);
  });

  it("is deterministic, so two runs of the same input give the same prompt", () => {
    const a = buildJudgeEntries(details, ["Decoy A.", "Decoy B."]);
    const b = buildJudgeEntries(details, ["Decoy A.", "Decoy B."]);
    expect(a).toEqual(b);
  });

  it("works with no decoys at all", () => {
    expect(buildJudgeEntries(details, []).every((e) => !e.decoy)).toBe(true);
  });
});

describe("the prompt", () => {
  const entries = buildJudgeEntries(toDetails(["A fact.", "This is the conclusion."]), [
    "A fact from another stimulus.",
  ]);
  const prompt = buildJudgePrompt({
    stimulus: "The stimulus text.",
    entries,
    spoken: "what she said out loud",
  });

  it("carries her words and the stimulus", () => {
    expect(prompt).toContain("what she said out loud");
    expect(prompt).toContain("The stimulus text.");
  });

  it("tells the judge her words are the only evidence", () => {
    expect(prompt).toMatch(/ONLY from what she said/i);
    expect(prompt).toMatch(/NEVER mark a Detail carried because the/i);
  });

  it("explains only the kinds actually present", () => {
    expect(prompt).toContain("CONTENT");
    expect(prompt).toContain("STRUCTURE");
    // No modality Detail in this stimulus, so no modality rule to read past.
    expect(prompt).not.toContain("MODALITY");
  });

  it("never tells the judge which entries are decoys", () => {
    // The word must not appear, and more importantly a decoy's line must be
    // formatted identically to a real Detail's. A judge that can spot them
    // cannot be caught out by them.
    expect(prompt).not.toMatch(/decoy/i);
    const planted = entries.find((e) => e.decoy)!;
    const real = entries.find((e) => !e.decoy)!;
    expect(prompt).toContain(`${planted.id}. [${planted.kind}] ${planted.text}`);
    expect(prompt).toContain(`${real.id}. [${real.kind}] ${real.text}`);
  });

  it("asks for a verdict on every id", () => {
    expect(prompt).toContain(`every id from 1 to ${entries.length}`);
  });
});

describe("reading the reply", () => {
  it("survives a code fence and a sentence of preamble", () => {
    const raw = 'Sure! Here you go:\n```json\n{"verdicts":[{"id":1,"carried":true}]}\n```';
    expect(extractJson(raw)).toEqual({ verdicts: [{ id: 1, carried: true }] });
  });

  it("is not fooled by braces inside a string", () => {
    const raw = '{"verdicts":[],"reciting_reason":"she said {this} aloud"}';
    expect((extractJson(raw) as Record<string, unknown>).reciting_reason).toBe(
      "she said {this} aloud",
    );
  });

  it("throws rather than returning a zero when the reply is unreadable", () => {
    // A grade of 0% and a grade we could not read are different facts, and only
    // one of them is about her.
    expect(() => extractJson("I could not do that.")).toThrow(JudgeReplyError);
    expect(() => extractJson('{"verdicts": [')).toThrow(JudgeReplyError);
    expect(() => parseJudgeReply('{"ok":true}', [1])).toThrow(JudgeReplyError);
  });

  it("reports ids the judge never answered", () => {
    const reply = parseJudgeReply('{"verdicts":[{"id":1,"carried":true}]}', [1, 2, 3]);
    expect(reply.missingIds).toEqual([2, 3]);
  });

  it("treats a missing flag as absent rather than as true", () => {
    const reply = parseJudgeReply('{"verdicts":[]}', []);
    expect(reply.reciting).toBe(false);
    expect(reply.coloured).toBe(false);
  });

  it("treats anything but true as not carried", () => {
    const reply = parseJudgeReply(
      '{"verdicts":[{"id":1,"carried":"yes"},{"id":2,"carried":null}]}',
      [1, 2],
    );
    expect(reply.verdicts[1]).toBe(false);
    expect(reply.verdicts[2]).toBe(false);
  });
});

describe("the score", () => {
  const details = toDetails(["One.", "Two.", "Three.", "Four."]);
  const entries = buildJudgeEntries(details, ["A decoy."]);
  const idOf = (text: string) => entries.find((e) => e.text === text)!.id;

  function replyWith(carried: string[], extra = "") {
    const verdicts = entries.map((e) => ({ id: e.id, carried: carried.includes(e.text) }));
    return parseJudgeReply(
      JSON.stringify({ verdicts: JSON.parse(JSON.stringify(verdicts)) }) .replace(/}$/, `${extra}}`),
      entries.map((e) => e.id),
    );
  }

  it("scores over her own Details and never over the decoys", () => {
    const grade = gradeStimulus(entries, replyWith(["One.", "Two.", "Three."]));
    // 3 of 4, not 3 of 5: the decoy is a check, never a denominator.
    expect(grade.total).toBe(4);
    expect(grade.carried).toBe(3);
    expect(grade.percent).toBe(75);
    expect(grade.band).toBe("nearly-there");
  });

  it("names what she dropped, as authored", () => {
    const grade = gradeStimulus(entries, replyWith(["One.", "Two.", "Three."]));
    expect(grade.missed).toEqual(["Four."]);
  });

  it("reports a carried decoy, which discredits the run", () => {
    const grade = gradeStimulus(entries, replyWith(["One.", "A decoy."]));
    expect(grade.decoysCarried).toEqual(["A decoy."]);
    // And it does not inflate her score.
    expect(grade.carried).toBe(1);
  });

  it("counts an unanswered Detail as not carried and says so", () => {
    const partial = parseJudgeReply(
      JSON.stringify({ verdicts: [{ id: idOf("One."), carried: true }] }),
      entries.map((e) => e.id),
    );
    const grade = gradeStimulus(entries, partial);
    expect(grade.carried).toBe(1);
    expect(grade.unjudged).toContain("Four.");
  });

  it("does not divide by zero into a blank band", () => {
    const grade = gradeStimulus([], parseJudgeReply('{"verdicts":[]}', []));
    expect(grade.percent).toBe(0);
    expect(grade.band).toBe("lost-it");
  });
});
