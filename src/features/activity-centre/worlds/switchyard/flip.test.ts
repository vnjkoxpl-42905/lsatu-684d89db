import { describe, expect, it } from "vitest";
import bank from "../../content/conditional-rephrase.json";
import {
  derivedFlip,
  flipIsDerivable,
  parseAuthoredContrapositive,
  parseRouting,
  readPolarity,
} from "./routing";

// The safety property of this stage, stated as a test rather than argued about:
// no item ever displays a derived flip that has not been checked against the
// sentence the author wrote.

interface BankItem {
  order: number;
  prompt: string;
  credited_answers: string[];
  explanation: string;
}

const items = (bank as { items: BankItem[] }).items;
const itemAt = (order: number) => {
  const found = items.find((i) => i.order === order);
  if (!found) throw new Error(`item ${order} missing from the bank`);
  return found;
};
const derivable = items.filter((i) => flipIsDerivable(i.credited_answers));

describe("finding D — a sentence carrying two conditionals is not two clauses", () => {
  it("refuses to parse item 62 rather than drawing a second rule inside one capsule", () => {
    const item = itemAt(62);
    // Today's parse yielded THEN = "the flood layer dates to spring; and if the
    // match is trustworthy, then the stratum was sealed".
    expect(parseRouting(item.credited_answers[0])).toBeNull();
  });

  it("costs no other item its diagram", () => {
    const unparsed = items.filter((i) => !parseRouting(i.credited_answers[0])).map((i) => i.order);
    expect(unparsed).toEqual([62]);
  });
});

describe("the derivability gate", () => {
  it("admits a real share of the bank, and publishes it", () => {
    // 24 of 62 as of this commit. The number is asserted so that a change to
    // any rule shows up as a diff rather than as silence.
    expect(derivable.map((i) => i.order)).toEqual([
      1, 3, 4, 5, 6, 8, 11, 18, 19, 21, 22, 24, 27, 30, 31, 33, 34, 40, 47, 48, 49, 50, 51, 54,
    ]);
  });

  // THE safety property.
  it("derives a polarity that agrees with the author on both sides, for every member", () => {
    const disagreements: string[] = [];
    for (const item of derivable) {
      const derived = derivedFlip(parseRouting(item.credited_answers[0])!)!;
      const authored = parseAuthoredContrapositive(item.credited_answers[1])!;
      const authoredIf = readPolarity(authored.ifClause.text)!;
      const authoredThen = readPolarity(authored.thenClause.text)!;
      if (
        derived.ifClause.negated !== authoredIf.negated ||
        derived.thenClause.negated !== authoredThen.negated
      ) {
        disagreements.push(`item ${item.order}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("keeps the items the review named out of the derivable set", () => {
    // 46 is an ellipsis, 59 is the bare no + noun path, 61 is lexical negation,
    // 52 and 53 turn on "unevenly", and 62 is malformed.
    for (const order of [46, 52, 53, 59, 61, 62]) {
      expect(flipIsDerivable(itemAt(order).credited_answers), `item ${order}`).toBe(false);
    }
  });

  it("lets item 18 through, which is the case the flip exists to teach", () => {
    const item = itemAt(18);
    expect(flipIsDerivable(item.credited_answers)).toBe(true);
    const derived = derivedFlip(parseRouting(item.credited_answers[0])!)!;
    // "If the beacon did not go dark, the generator was refueled by dusk."
    expect(derived.ifClause).toEqual({ core: "the beacon goes dark", negated: true });
    expect(derived.thenClause).toEqual({ core: "the generator is refueled by dusk", negated: false });
  });
});

describe("readPolarity", () => {
  it("states an explicitly negated clause positively", () => {
    expect(readPolarity("the generator is not refueled by dusk")).toEqual({
      core: "the generator is refueled by dusk",
      negated: true,
    });
  });

  it("maps a negative modal to its positive twin rather than deleting it", () => {
    expect(readPolarity("a kite cannot hold altitude")).toEqual({
      core: "a kite can hold altitude",
      negated: true,
    });
  });

  it("reads a plain clause as positive", () => {
    expect(readPolarity("the orchids bloom by morning")).toEqual({
      core: "the orchids bloom by morning",
      negated: false,
    });
  });

  it("refuses an ellipsis, which has no clause left once the negation is lifted", () => {
    expect(readPolarity("the string quartet is not")).toBeNull();
  });

  it("refuses lexical negation, which no list of negation words catches reliably", () => {
    expect(readPolarity("the samples lack impulsive onsets")).toBeNull();
    expect(readPolarity("the crew is unable to launch")).toBeNull();
  });

  it("refuses the bare no + noun path, where the determiner carries the negation", () => {
    expect(readPolarity("no fixture in the district is shielded")).toBeNull();
  });

  it("refuses a compound, where one polarity token cannot say what it covers", () => {
    expect(readPolarity("both the seal and the gasket hold")).toBeNull();
    expect(readPolarity("the panel dims rather than brightens")).toBeNull();
  });

  it("refuses a contraction it has no positive form for", () => {
    expect(readPolarity("the latch doesn't seat")).toBeNull();
  });
});

describe("derivedFlip", () => {
  it("swaps the tracks and inverts both polarities", () => {
    const routing = parseRouting("If the fans run overnight, then the orchids bloom by morning.")!;
    expect(derivedFlip(routing)).toEqual({
      ifClause: { core: "the orchids bloom by morning", negated: true },
      thenClause: { core: "the fans run overnight", negated: true },
    });
  });

  it("returns null when either clause cannot be stated positively", () => {
    const routing = parseRouting("If the brass band is booked, then the string quartet is not.")!;
    expect(derivedFlip(routing)).toBeNull();
  });
});
