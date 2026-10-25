import { describe, expect, it } from "vitest";
import { levelOf, NEGATION_ITEMS, parsePlate, PLATES, readPush, SCALE } from "./polarity";

// The chamber measures how hard a student pushed, and the one thing it must not
// do is measure where measurement does not apply. Most of these tests are about
// when it stays quiet.

const byOrder = (n: number) => PLATES.find((p) => p.order === n)!;

describe("the bank", () => {
  it("carries all 30 items, verbatim from the migration", () => {
    expect(NEGATION_ITEMS.length).toBe(30);
    expect(PLATES.length).toBe(30);
  });

  it("gives every plate a statement, a negation and the bank's own reason", () => {
    for (const p of PLATES) {
      expect(p.statement.length, `item ${p.order}`).toBeGreaterThan(10);
      expect(p.negation.length, `item ${p.order}`).toBeGreaterThan(10);
      expect(p.why.length, `item ${p.order}`).toBeGreaterThan(10);
      expect(p.kind.length).toBeGreaterThan(0);
    }
  });

  it("never puts the statement and its negation on the same face", () => {
    for (const p of PLATES) {
      expect(p.negation.toLowerCase(), `item ${p.order}`).not.toBe(p.statement.toLowerCase());
    }
  });

  it("returns nothing for an item with no credited negation", () => {
    expect(parsePlate({ order: 1, prompt: "x", credited_answers: [] } as never)).toBeNull();
  });
});

describe("the strength scale", () => {
  it("reads the closed vocabulary this bank uses", () => {
    expect(levelOf("Every river in this region flows north.")).toBe("all");
    expect(levelOf("At least one river does not flow north.")).toBe("some");
    expect(levelOf("Most of the committee members support it.")).toBe("most");
    expect(levelOf("No rivers flow north.")).toBe("none");
  });

  it("prefers the longer phrase, so 'not all' is not read as 'all'", () => {
    expect(levelOf("Not all babies are cute.")).toBe("some");
    expect(levelOf("Not every river flows north.")).toBe("some");
  });

  it("places nothing when a statement carries no quantifier", () => {
    expect(levelOf("Pollution causes the depletion of the ozone layer.")).toBeNull();
  });

  it("runs weakest to strongest", () => {
    expect(SCALE).toEqual(["none", "few", "some", "most", "all"]);
  });
});

describe("what the beam will and will not measure", () => {
  const measurable = PLATES.filter((p) => p.measurable);
  const stamped = PLATES.filter((p) => !p.measurable);

  it("measures the quantity items and stamps the rest", () => {
    expect(measurable.length).toBe(15);
    expect(measurable.length + stamped.length).toBe(30);
  });

  /**
   * The one quantity-category item the beam still declines. "A significant
   * portion" is not a rung: it is vaguer than "most" and stronger than "some",
   * and putting it on the scale would be picking a reading for Joshua.
   */
  it("declines the item whose quantifier is genuinely vague", () => {
    const vague = PLATES.find((p) => /significant portion/i.test(p.statement))!;
    expect(vague.measurable).toBe(false);
    expect(vague.statementLevel).toBeNull();
  });

  /**
   * Strength is not a quantity for a conditional or a causal claim, and a beam
   * that put one on a None-to-All scale would be inventing a reading.
   */
  it("never measures a conditional, causal or biconditional item", () => {
    for (const p of stamped) {
      expect(p.measurable).toBe(false);
    }
    for (const p of PLATES) {
      if (/conditional|causal|biconditional|sole purpose|value judgment/i.test(p.kind)) {
        expect(p.measurable, `item ${p.order} (${p.kind})`).toBe(false);
      }
    }
  });

  it("only measures when BOTH ends actually landed on the scale", () => {
    for (const p of measurable) {
      expect(p.statementLevel, `item ${p.order}`).not.toBeNull();
      expect(p.negationLevel, `item ${p.order}`).not.toBeNull();
    }
  });
});

describe("reading the push", () => {
  // Item 1: "Every river flows north" -> "At least one river does not."
  const universal = byOrder(1);

  it("meets the ring on the credited negation", () => {
    const r = readPush(universal, universal.negation);
    expect(r.push).toBe("minimal");
    expect(r.distance).toBe(0);
    expect(r.contradicts).toBe(true);
  });

  /**
   * The drill's signature error, measured from the student's own words rather
   * than from a polar opposite the bank never wrote.
   */
  it("names the polar opposite as an overshoot", () => {
    const r = readPush(universal, "No rivers in this region flow north.");
    expect(r.push).toBe("overshoot");
    expect(r.distance).toBeGreaterThan(0);
  });

  it("distinguishes falling short from pushing too far", () => {
    // "Most" sits between "all" and "some": it has not gone far enough to
    // contradict, which is a different mistake from overshooting.
    const r = readPush(universal, "Most rivers in this region flow north.");
    expect(r.push).toBe("undershoot");
  });

  it("stays unmeasured on a causal item rather than inventing a rung", () => {
    const causal = PLATES.find((p) => /causal/i.test(p.kind))!;
    const r = readPush(causal, causal.negation);
    expect(r.push).toBe("unmeasured");
    expect(r.distance).toBeNull();
    // It can still say whether they restated the credited negation.
    expect(r.contradicts).toBe(true);
  });

  it("stays unmeasured when the answer carries no quantifier at all", () => {
    const r = readPush(universal, "the rivers do something else");
    expect(r.push).toBe("unmeasured");
  });

  it("says nothing about an empty answer", () => {
    const r = readPush(universal, "   ");
    expect(r.push).toBe("unmeasured");
    expect(r.contradicts).toBe(false);
  });
});

describe("every credited negation reads clean", () => {
  it("is never called an overshoot on any of the 30", () => {
    for (const p of PLATES) {
      const r = readPush(p, p.negation);
      expect(r.push, `item ${p.order} read as ${r.push}`).not.toBe("overshoot");
      expect(r.contradicts, `item ${p.order}`).toBe(true);
    }
  });

  it("meets the ring on every item the beam measures", () => {
    for (const p of PLATES.filter((x) => x.measurable)) {
      expect(readPush(p, p.negation).push, `item ${p.order}`).toBe("minimal");
    }
  });
});
