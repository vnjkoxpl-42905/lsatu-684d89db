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
  pickDecoys,
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
    // 82 is measured (ADR 0035, on gemini-3.8-flash; ADR 0018 measured 86 on
    // 2.5-flash) and is not a round number by accident. If this changes, an
    // ADR changed with it or something is wrong.
    expect(BAND_FLOOR.atTheStandard).toBe(82);
  });

  it("puts a correct run at the standard and a poor one below", () => {
    expect(bandFor(100)).toBe("at-the-standard");
    expect(bandFor(93)).toBe("at-the-standard"); // census median on the live judge
    expect(bandFor(82)).toBe("at-the-standard"); // exactly the floor
    expect(bandFor(81)).toBe("nearly-there");
    expect(bandFor(68)).toBe("nearly-there");
    expect(bandFor(67)).toBe("thin");
    expect(bandFor(51)).toBe("thin");
    expect(bandFor(50)).toBe("lost-it");
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

/**
 * Decoys have to be facts, not facts about arguments.
 *
 * The decoy check is the run's own integrity measure: a Detail from another
 * stimulus, which she cannot have carried, so a judge that credits one has
 * invented words she never said. On the trial run it fired once, and the
 * failure was ours. The decoy was "This is the reason given." -- a structural
 * Detail that almost any argument retelling carries honestly. A check that
 * accuses the judge of hallucinating when the judge was right is worse than no
 * check, because the only thing it has to be is trusted.
 */
describe("choosing decoys", () => {
  it("takes content Details and refuses structural ones", () => {
    expect(
      pickDecoys([
        "This is the reason given.",
        "The study followed 4,000 nurses.",
        "This is the conclusion.",
        "The nurses were in Sweden.",
      ]),
    ).toEqual(["The study followed 4,000 nurses.", "The nurses were in Sweden."]);
  });

  it("refuses modality Details too", () => {
    expect(pickDecoys(["This is hedged as a possibility.", "Rainfall fell by a third."])).toEqual([
      "Rainfall fell by a third.",
    ]);
  });

  it("returns nothing rather than a bad decoy when a stimulus has only structure", () => {
    // No decoys is an honest "this run has no integrity check". A structural
    // decoy is a wrong one, and it reads identically on the Report Card.
    expect(pickDecoys(["This is the conclusion.", "This is a contrast."])).toEqual([]);
  });
});

/**
 * The Read, graded at last.
 *
 * Authored on every one of the 1,294 stimuli, promised to her twice -- the
 * briefing says "this is the part that gets checked" -- and measured by
 * nothing. Coverage answers "did you hold it". The Read answers "did you
 * understand it", and it is the criterion the method is actually built around.
 */
describe("The Read", () => {
  const entries = buildJudgeEntries(toDetails(["A claim is made."]), []);

  it("is put to the judge, with the authored key, when there is one", () => {
    const prompt = buildJudgePrompt({
      stimulus: "A stimulus.",
      entries,
      spoken: "she said something",
      theRead: "The author confuses two senses of the word.",
    });
    expect(prompt).toContain("The author confuses two senses of the word.");
    expect(prompt).toContain("read_matches");
  });

  it("is left out entirely rather than asked about emptily", () => {
    const prompt = buildJudgePrompt({ stimulus: "A stimulus.", entries, spoken: "x" });
    expect(prompt).not.toContain("read_matches");
    expect(prompt).not.toContain("THE READ");
  });

  it("reads both flags off the reply", () => {
    const reply = parseJudgeReply(
      '{"verdicts":[{"id":1,"carried":true}],"read_given":true,"read_matches":true,"read_reason":"named the equivocation"}',
      [1],
    );
    expect(reply.readGiven).toBe(true);
    expect(reply.readMatches).toBe(true);
    expect(reply.readReason).toBe("named the equivocation");
  });

  it("treats an absent verdict as no Read, never as a pass", () => {
    // Same rule as colour: a judge that forgets the field must not be able to
    // award it, and an older grade written before The Read was measured is
    // honestly reported as not having one.
    const reply = parseJudgeReply('{"verdicts":[{"id":1,"carried":true}]}', [1]);
    expect(reply.readGiven).toBe(false);
    expect(reply.readMatches).toBe(false);
  });

  it("cannot match a Read that was never given", () => {
    const grade = gradeStimulus(
      entries,
      parseJudgeReply(
        '{"verdicts":[{"id":1,"carried":true}],"read_given":false,"read_matches":true}',
        [1],
      ),
    );
    expect(grade.readGiven).toBe(false);
    expect(grade.readMatches).toBe(false);
  });
});

/**
 * The standard, in the prompt.
 *
 * The judge was asked whether her run was a flat list, whether she reacted to
 * the stimulus, and whether that reaction was specific to it -- three judgments
 * about the quality of teaching work, made against nothing but the model's own
 * taste. The Details are a checklist of facts and The Read is one line about
 * the argument; neither says what a correct run sounds like. That is the part a
 * person sets, and there are now 283 written runs that set it.
 */
describe("the model run as the standard", () => {
  const entries = buildJudgeEntries(toDetails(["All employees are reassigned."]), []);
  const RUN = "> All employees are reassigned.\n\nSo everybody gets moved around.";

  it("carries the correct run when there is one", () => {
    const prompt = buildJudgePrompt({
      stimulus: "A stimulus.",
      entries,
      spoken: "she said something",
      modelRun: RUN,
    });
    expect(prompt).toContain("So everybody gets moved around.");
    expect(prompt).toContain("A CORRECT RUN");
  });

  it("frames it as the standard rather than as the answer", () => {
    // An exemplar dropped into a grading context without this framing becomes an
    // answer key, and every run that differs from it starts looking wrong. Her
    // wording, examples, order and emphasis are all allowed to differ.
    const prompt = buildJudgePrompt({
      stimulus: "A stimulus.",
      entries,
      spoken: "x",
      modelRun: RUN,
    });
    expect(prompt).toContain("It sets the STANDARD, not the answer");
    expect(prompt).toMatch(/Do NOT use it as evidence/);
    expect(prompt).toMatch(/Do NOT reward similarity to it/);
  });

  it("is left out entirely for a section whose runs are not loaded", () => {
    // A section with no walkthroughs grades exactly as it did before, rather
    // than being asked to calibrate against an empty block.
    const prompt = buildJudgePrompt({ stimulus: "A stimulus.", entries, spoken: "x" });
    expect(prompt).not.toContain("A CORRECT RUN");
  });
});

/*
 * What to do next time, and the scale a line is judged on.
 *
 * Two fairness gaps closed together. The line verdicts had names and no
 * definitions, so "partial" meant whatever the model felt that day; and the
 * card described every run and advised on none of them, so a student at 86%
 * with a lost quantifier learned the number and nothing about the word.
 */
describe("next time, and the line scale", () => {
  const entries = buildJudgeEntries(toDetails(["All employees are reassigned."]), []);
  const lines = [{ n: 1, text: "All employees are reassigned.", spoken: "the staff moved" }];

  it("defines every line verdict before asking for one", () => {
    const prompt = buildJudgePrompt({ stimulus: "A stimulus.", entries, spoken: "x", lines });
    for (const v of ["strong:", "partial:", "thin:", "skipped:"]) expect(prompt).toContain(v);
    expect(prompt).toMatch(/Only a change of MEANING counts against her/);
  });

  it("asks for one concrete thing to do differently, and for nothing when there is nothing", () => {
    const prompt = buildJudgePrompt({ stimulus: "A stimulus.", entries, spoken: "x" });
    expect(prompt).toContain("next_time");
    expect(prompt).toMatch(/Leave it EMPTY when there is nothing to fix/);
  });

  it("carries next_time through to the grade, trimmed", () => {
    const reply = parseJudgeReply(
      '{"verdicts":[{"id":1,"carried":false}],"next_time":"  Say the quantifier out loud: all, not some.  "}',
      [1],
    );
    expect(reply.nextTime).toBe("Say the quantifier out loud: all, not some.");
    expect(gradeStimulus(entries, reply).nextTime).toBe("Say the quantifier out loud: all, not some.");
  });

  it("treats an absent next_time as nothing to say rather than as an error", () => {
    const reply = parseJudgeReply('{"verdicts":[{"id":1,"carried":true}]}', [1]);
    expect(reply.nextTime).toBe("");
  });
});
