import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import {
  citedWords,
  creditedCandidates,
  parseSpecimen,
  readExamination,
  statedCharge,
  targetWord,
} from "./specimen";

// The bench claims to react to the student's reasoning. That claim is only as
// good as this derivation, so these pin both halves of it: what it finds, and
// what it refuses to claim.

const vocab = SEED_ACTIVITIES.find((a) => a.slug === "vocab-rehab")!;
const specimens = vocab.items.map((i) => parseSpecimen(i)!);
const byOrder = (n: number) => specimens.find((s) => s.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 51 items into a specimen", () => {
    expect(vocab.items.length).toBe(51);
    expect(specimens.every(Boolean)).toBe(true);
  });

  it("pulls the target word out of the authored marks", () => {
    expect(targetWord("In regions with heavy snowfall, an *imperative* part.")).toBe("imperative");
    expect(targetWord("No marked word here.")).toBeNull();
  });

  it("reads candidates written with commas and with 'or'", () => {
    expect(creditedCandidates("*Imperative* probably means essential, necessary, crucial. I think…"))
      .toEqual(["essential", "necessary", "crucial"]);
    expect(creditedCandidates("*Truculent* probably means aggressive or hostile. I think…"))
      .toEqual(["aggressive", "hostile"]);
  });

  it("gives every specimen at least one candidate to engrave", () => {
    for (const s of specimens) expect(s.candidates.length, `item ${s.order}`).toBeGreaterThan(0);
  });

  it("finds a precision boundary on exactly the five items that authored one", () => {
    const withTrap = specimens.filter((s) => s.trap);
    expect(withTrap.map((s) => s.order)).toEqual([47, 48, 49, 50, 51]);
    expect(byOrder(47).trap).toBe("uninterested");
    expect(byOrder(49).trap).toBe("energized");
  });

  it("only takes a credited charge from the item's own text", () => {
    const scored = specimens.filter((s) => s.charge !== null);
    expect(scored.map((s) => s.order)).toEqual([16, 35, 48, 50]);
    // The rest are unscored rather than invented.
    expect(byOrder(51).charge).toBeNull();
    expect(byOrder(27).charge).toBeNull();
  });
});

describe("statedCharge", () => {
  it("reads an explicit call and nothing else", () => {
    expect(statedCharge("it feels negative to me")).toBe("neg");
    expect(statedCharge("the tone is positive")).toBe("pos");
    expect(statedCharge("probably neutral")).toBe("neutral");
  });

  it("does not infer a call from candidate words", () => {
    // "hostile" is a negative word, but the student never made a valence call.
    expect(statedCharge("it probably means hostile or aggressive")).toBeNull();
  });
});

describe("citedWords", () => {
  const specimen = byOrder(27);

  it("finds the wording the student reused from the field note", () => {
    const cited = citedWords("I think so because it is set against normally accommodating", specimen);
    expect(cited).toContain("normally");
    expect(cited).toContain("accommodating");
  });

  it("does not count an overlap made only of function words", () => {
    expect(citedWords("the the of and it was", specimen)).toEqual([]);
  });

  it("finds nothing in an answer that cites nothing", () => {
    expect(citedWords("I just know this one already", specimen)).toEqual([]);
  });

  it("does not count the student restating the answer as citing the paragraph", () => {
    // The target word and every credited candidate are excluded, so an answer
    // that only names the meaning has cited nothing.
    expect(citedWords("truculent means aggressive or hostile", specimen)).toEqual([]);
  });

  it("matches across inflection, because a paraphrase re-inflects", () => {
    const ephemeral = byOrder(39);
    expect(citedWords("it is negated and set against outlasting everyone", ephemeral))
      .toContain("outlast");
  });
});

describe("reading the bench", () => {
  it("lights contrast when the student cites the opposition", () => {
    const r = readExamination(
      "It probably means aggressive. I think this because it is set against normally accommodating.",
      byOrder(27),
    );
    expect(r.lit).toContain("contrast");
  });

  it("lights the charge gauge only on an explicit valence call", () => {
    const s = byOrder(27);
    expect(readExamination("probably means aggressive or hostile", s).lit).not.toContain("charge");
    expect(readExamination("it is negative, probably aggressive", s).lit).toContain("charge");
  });

  it("leaves every instrument dark when nothing was cited", () => {
    const r = readExamination("no idea, maybe something bad", byOrder(27));
    expect(r.lit).toEqual([]);
    expect(r.dark).toEqual(["charge", "contrast", "relation"]);
  });

  it("says a charge call is unscored rather than marking it against an invented answer", () => {
    const r = readExamination("this one is negative", byOrder(27));
    expect(r.chargeVerdict).toBe("unscored");
  });

  it("scores the call on the items that did author a valence", () => {
    expect(readExamination("it reads positive to me", byOrder(48)).chargeVerdict).toBe("matches");
    expect(readExamination("it reads negative to me", byOrder(48)).chargeVerdict).toBe("differs");
  });

  it("reports no verdict at all when the student made no call", () => {
    expect(readExamination("means excessive", byOrder(48)).chargeVerdict).toBeNull();
  });

  it("lights something for every item when the credited answer is the response", () => {
    // The authored answer is by definition well-reasoned, so the bench should
    // never sit fully dark for one. This is the guard against a derivation that
    // quietly stops matching after a bank edit.
    const blind = specimens.filter((s) => {
      const item = vocab.items.find((i) => i.order === s.order)!;
      return readExamination(item.credited_answers[0], s).lit.length === 0;
    });
    expect(blind.map((s) => s.order)).toEqual([]);
  });
});
