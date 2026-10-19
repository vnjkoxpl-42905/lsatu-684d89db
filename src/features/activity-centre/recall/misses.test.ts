import { describe, expect, it } from "vitest";
import { missKind, tallyMisses } from "./misses";

/**
 * What a student keeps dropping, across runs rather than within one.
 *
 * Every Report Card stores the exact Details she missed and nothing has ever
 * read across them. One run says "you dropped 'all employees' on stimulus 1",
 * which is a fact about a stimulus. Twenty runs say "you drop the quantifier
 * four times in five", which is a fact about her, and only the second one
 * changes what she practises.
 */

describe("what kind of thing a miss is", () => {
  it("calls a discourse role a role, not a fact", () => {
    expect(missKind("This is the conclusion.")).toBe("role");
    expect(missKind("A director is speaking.")).toBe("role");
  });

  it("calls a hedge a strength", () => {
    expect(missKind("This is hedged as a possibility.")).toBe("strength");
  });

  it("calls a quantifier a quantity, and does not fire on a word containing one", () => {
    expect(missKind("This applies to all employees.")).toBe("quantity");
    expect(missKind("The study followed 4,000 nurses.")).toBe("quantity");
    // "allocated" contains "all"; "something" contains "some".
    expect(missKind("The budget was allocated by the trustees.")).not.toBe("quantity");
  });

  it("calls a proper noun a name, and is not fooled by the opening capital", () => {
    expect(missKind("The nurses were in Sweden.")).toBe("name");
    // Every Detail is a sentence, so the first word is always capitalised and
    // says nothing about whether a name is in it.
    expect(missKind("The interior is filled with seawater.")).toBe("claim");
  });

  it("puts a quantity first when a Detail carries both", () => {
    // "all four nurses in Sweden" is a quantifier miss before it is a name one:
    // the number is the part the method singles out.
    expect(missKind("All four nurses were in Sweden.")).toBe("quantity");
  });
});

describe("what keeps slipping", () => {
  it("reports a share of what was asked, not a count", () => {
    // A count always answers "which kind is there most of". Plain facts
    // outnumber modality roughly eight to one, so a count would put them at the
    // top of every student's list for ever.
    // Suffixed with letters, never digits: a digit anywhere in a Detail makes
    // it a quantity, correctly, and would make these fixtures measure that
    // rule instead of this one.
    const tag = (i: number) => String.fromCharCode(97 + i);
    const runs = [
      {
        asked: [
          ...Array.from({ length: 20 }, (_, i) => `The interior is filled with seawater ${tag(i)}.`),
          ...Array.from({ length: 6 }, (_, i) => `This is hedged as a possibility ${tag(i)}.`),
        ],
        missed: [
          "The interior is filled with seawater a.",
          "The interior is filled with seawater b.",
          "This is hedged as a possibility a.",
          "This is hedged as a possibility b.",
          "This is hedged as a possibility c.",
          "This is hedged as a possibility d.",
        ],
      },
    ];
    const tally = tallyMisses(runs);
    // Four of six hedges against two of twenty facts. The count says facts;
    // the share says hedges, and the share is the useful answer.
    expect(tally[0].kind).toBe("strength");
    expect(Math.round(tally[0].share * 100)).toBe(67);
    expect(tally[1].kind).toBe("claim");
  });

  it("drops a kind with almost nothing behind it rather than reporting it", () => {
    // One miss out of one is 100% and means nothing. A number that confident on
    // that little evidence is worse than no number.
    const tally = tallyMisses([
      { asked: ["This is the conclusion."], missed: ["This is the conclusion."] },
      {
        asked: Array.from({ length: 8 }, (_, i) =>
          `The interior is filled with seawater ${String.fromCharCode(97 + i)}.`),
        missed: ["The interior is filled with seawater a."],
      },
    ]);
    expect(tally.map((t) => t.kind)).toEqual(["claim"]);
  });

  it("adds up across runs rather than reporting the last one", () => {
    const one = { asked: ["This applies to all employees.", "The kiln is hot."], missed: ["This applies to all employees."] };
    const tally = tallyMisses([one, one, one, one, one]);
    const quantity = tally.find((t) => t.kind === "quantity")!;
    expect(quantity.missed).toBe(5);
    expect(quantity.share).toBe(1);
  });

  it("says nothing at all when there is nothing to say", () => {
    expect(tallyMisses([])).toEqual([]);
  });
});
