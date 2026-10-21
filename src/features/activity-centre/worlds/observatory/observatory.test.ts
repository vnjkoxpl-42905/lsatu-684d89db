import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { anchorsFor, parseSignal, readAnswer } from "./observatory";

// Every figure this world draws is anchored to words in the statement, so the
// anchoring is the thing to pin: a figure drawn from a position I invented
// would teach a student to look at the wrong word.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
const signals = drill.items.map((i) => parseSignal(i)!);
const byOrder = (n: number) => signals.find((s) => s.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 48 items into a signal", () => {
    expect(drill.items.length).toBe(48);
    expect(signals.every(Boolean)).toBe(true);
  });

  it("reads the multi-relationship form", () => {
    // Item 27: conditional, "Only if"; causal, "because" and "accelerates"
    const s = byOrder(27);
    expect(s.relations.length).toBe(2);
    expect(s.relations.map((r) => r.kind)).toEqual(["conditional", "causal"]);
    expect(s.relations[1].indicators.length).toBe(2);
  });

  it("normalizes the badge's 'comparison' onto the bank's 'comparative'", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        expect(["conditional", "causal", "comparative"]).toContain(r.kind);
      }
    }
  });

  it("agrees with the count the bank declares, on all but the one it got wrong", () => {
    const agree = signals.filter((s) => s.declared === s.relations.length);
    // Item 40 declares four relationships and lists three. The parse follows
    // the credited answer, because that is what a student is graded against.
    expect(agree.length).toBe(47);
    expect(byOrder(40).declared).toBe(4);
    expect(byOrder(40).relations.length).toBe(3);
  });

  it("reads a rung off every item", () => {
    for (const s of signals) expect(s.rung, `item ${s.order}`).toBeGreaterThanOrEqual(1);
  });
});

describe("anchoring the figures", () => {
  /**
   * The property the whole world rests on. Every figure is drawn between
   * anchors, so an indicator with no anchor is a figure with no position.
   */
  it("anchors all 109 indicator words to real words in their own statement", () => {
    let total = 0;
    for (const s of signals) {
      for (const r of s.relations) {
        total += r.indicators.length;
        expect(r.anchors.length, `item ${s.order}: ${r.indicators.join(", ")}`).toBeGreaterThan(0);
      }
    }
    expect(total).toBe(109);
  });

  it("anchors every offset inside its own statement", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        for (const a of r.anchors) {
          expect(a.start).toBeGreaterThanOrEqual(0);
          expect(a.end).toBeLessThanOrEqual(s.statement.length);
          expect(s.statement.slice(a.start, a.end).toLowerCase()).toBe(a.text.toLowerCase());
        }
      }
    }
  });

  it("anchors a contiguous indicator as one anchor, not two", () => {
    const a = anchorsFor("only if", "A vent opens only if the temperature exceeds 28 degrees.");
    expect(a.length).toBe(1);
    expect(a[0].text.toLowerCase()).toBe("only if");
  });

  it("splits a comparative the statement separates", () => {
    const a = anchorsFor("more … than", "Only if the curve is more recent than the sample.");
    expect(a.length).toBe(2);
    expect(a.map((x) => x.text.toLowerCase())).toEqual(["more", "than"]);
  });

  it("ignores a trailing period in the authored quote", () => {
    const a = anchorsFor("lags.", "The reading lags behind the reference cell.");
    expect(a.length).toBe(1);
    expect(a[0].text.toLowerCase()).toBe("lags");
  });

  it("does not anchor a figure to a bare preposition", () => {
    const a = anchorsFor("closer to … than to", "The value sits closer to one curve than to the other.");
    expect(a.every((x) => x.text.toLowerCase() !== "to")).toBe(true);
  });

  it("keeps anchors in the order they appear in the statement", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        const starts = r.anchors.map((a) => a.start);
        expect([...starts].sort((x, y) => x - y)).toEqual(starts);
      }
    }
  });
});

describe("reading the answer", () => {
  const single = signals.find((s) => s.relations.length === 1)!;
  const multi = byOrder(27);

  it("credits the type and the quoted indicator", () => {
    const r = readAnswer(single, single.relations[0].kind + ', "' + single.relations[0].indicators[0] + '"');
    expect(r.found).toEqual([single.relations[0].kind]);
    expect(r.quotedIndicators).toBe(true);
    expect(r.missed).toEqual([]);
  });

  it("marks the type found but the indicator missing when only the type is given", () => {
    const r = readAnswer(single, single.relations[0].kind);
    expect(r.found).toEqual([single.relations[0].kind]);
    expect(r.quotedIndicators).toBe(false);
  });

  it("names a relationship the statement does not carry as invented", () => {
    const absent = (["conditional", "causal", "comparative"] as const).find(
      (k) => !single.relations.some((r) => r.kind === k),
    )!;
    const r = readAnswer(single, absent);
    expect(r.invented).toContain(absent);
    expect(r.drawn).not.toContain(absent);
  });

  it("lists what a partial answer missed on a multi-relationship item", () => {
    const r = readAnswer(multi, 'conditional, "Only if"');
    expect(r.found).toEqual(["conditional"]);
    expect(r.missed).toEqual(["causal"]);
  });

  it("draws only the relationships that are both named and real", () => {
    const r = readAnswer(multi, "conditional and comparative");
    expect(r.drawn).toEqual(["conditional"]);
    expect(r.invented).toEqual(["comparative"]);
  });

  it("finds nothing in an answer that names no type", () => {
    const r = readAnswer(single, "not sure what this one is");
    expect(r.found).toEqual([]);
    expect(r.drawn).toEqual([]);
    expect(r.missed.length).toBeGreaterThan(0);
  });
});

describe("every credited answer reads clean", () => {
  it("finds every relationship and no invented one, on all 48", () => {
    for (const s of signals) {
      const item = drill.items.find((i) => i.order === s.order)!;
      const r = readAnswer(s, item.credited_answers[0]);
      expect(r.invented, `item ${s.order}`).toEqual([]);
      expect(r.missed, `item ${s.order}`).toEqual([]);
      expect(r.quotedIndicators, `item ${s.order}`).toBe(true);
    }
  });
});
