import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { carries, findLanding, parseCallback, readThrow } from "./loom";

// The thread points a student's eye at a specific line and says "that is what
// the phrase meant". Landing it on the wrong line teaches the wrong thing, so
// the landing guard is what these tests are mostly about.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-callback")!;
const callbacks = drill.items.map((i) => parseCallback(i)!);
const byOrder = (n: number) => callbacks.find((c) => c.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 20 items into a callback", () => {
    expect(drill.items.length).toBe(20);
    expect(callbacks.every(Boolean)).toBe(true);
  });

  it("splits the passage into two sheets", () => {
    for (const c of callbacks) {
      expect(c.source.length, `item ${c.order}`).toBeGreaterThan(40);
      expect(c.caller.length, `item ${c.order}`).toBeGreaterThan(20);
    }
  });

  it("finds the marked phrase and strips its markup", () => {
    for (const c of callbacks) {
      expect(c.phrase.length, `item ${c.order}`).toBeGreaterThan(2);
      expect(c.phrase).not.toContain("*");
      expect(c.phrase).not.toContain('"');
    }
  });

  it("never shows the student the markup on the sheet", () => {
    for (const c of callbacks) {
      expect(c.caller, `item ${c.order}`).not.toContain("**");
    }
  });

  it("locates the phrase in the cleaned sheet so the bracket has somewhere to sit", () => {
    for (const c of callbacks) {
      expect(c.phraseAt, `item ${c.order}`).not.toBeNull();
      expect(c.caller.slice(c.phraseAt!.start, c.phraseAt!.end)).toBe(c.phrase);
    }
  });

  it("reads the topic and the authored partial example off every item", () => {
    expect(callbacks.filter((c) => c.topic).length).toBe(20);
    expect(callbacks.filter((c) => c.partialExample).length).toBe(20);
  });

  it("reads a planted near-miss only where one is planted", () => {
    const planted = callbacks.filter((c) => c.nearMiss);
    expect(planted.length).toBe(8);
    // "none planted at this rung" must never become a near-miss string.
    for (const c of callbacks) {
      if (c.nearMiss) expect(c.nearMiss.toLowerCase()).not.toContain("none");
    }
  });

  /**
   * The bank writes near-misses both bare and quoted. A pattern that demands
   * the period sit directly against the `partial` marker drops every quoted
   * one, and the near-miss is what keeps the thread off the opposing view.
   */
  it("reads a quoted near-miss as well as a bare one", () => {
    expect(byOrder(3).nearMiss).toBe("the marbles shown as art");
    expect(byOrder(18).nearMiss).toBe("the original charge of failed characterisation");
  });

  it("leaves no stray quotes or full stops on a near-miss", () => {
    for (const c of callbacks) {
      if (!c.nearMiss) continue;
      expect(c.nearMiss, `item ${c.order}`).not.toMatch(/^"|"$|\.$/);
    }
  });

  it("reads a rung off every item", () => {
    for (const c of callbacks) expect(c.rung).toBeGreaterThanOrEqual(1);
  });
});

describe("landing the thread", () => {
  it("lands on a real span of the source sheet, on all 20", () => {
    for (const c of callbacks) {
      expect(c.landing, `item ${c.order}`).not.toBeNull();
      expect(c.source.slice(c.landing!.start, c.landing!.end)).toBe(c.landing!.text);
    }
  });

  /**
   * The defect this guard exists for. Item 18's two sides share vocabulary, and
   * a similarity-only landing throws the thread at "Critics long read the flat
   * affect as a failure", which is the opposing view and the near-miss the bank
   * names. The credited answer is the later reading.
   */
  it("does not land on the opposing view when the sides share vocabulary", () => {
    const c = byOrder(18);
    expect(c.nearMiss).toContain("failed characterisation");
    expect(c.landing!.text).toContain("later generation");
    expect(c.landing!.text).not.toContain("failure of characterisation");
  });

  it("never lands on the sentence that best matches the planted near-miss", () => {
    for (const c of callbacks) {
      if (!c.nearMiss || !c.landing) continue;
      const landedNearMissScore = carries(c.nearMiss, c.landing.text);
      const creditedScore = carries(c.credited, c.landing.text);
      expect(creditedScore, `item ${c.order}`).toBeGreaterThan(landedNearMissScore);
    }
  });

  it("throws nothing rather than landing on a line it only half resembles", () => {
    const landing = findLanding(
      "The roof leaked. The roof leaked badly.",
      "something about drainage in the basement",
      null,
    );
    expect(landing).toBeNull();
  });

  it("throws nothing when two source lines are equally good", () => {
    const landing = findLanding(
      "The rule is unfair. The rule is unfair to newcomers.",
      "the rule is unfair",
      null,
    );
    expect(landing).toBeNull();
  });
});

describe("reading the throw", () => {
  const c = byOrder(1);

  it("weaves a thread for the credited translation", () => {
    expect(readThrow(c, c.credited).kind).toBe("thread");
  });

  /**
   * The locked two-part standard: pointing alone never earns a thread. The
   * bank's own partial example for item 1 is "the plaza" with no content.
   */
  it("hangs a taut thread for a location with no content", () => {
    const t = readThrow(c, "the thing in the first paragraph about the plaza");
    expect(t.kind).toBe("taut");
    expect(t.locationOnly).toBe(true);
  });

  it("hangs a taut thread for the bank's own partial example", () => {
    const withPartial = callbacks.find((x) => x.partialExample)!;
    expect(readThrow(withPartial, withPartial.partialExample!).kind).not.toBe("thread");
  });

  it("drops a slack thread for the planted near-miss", () => {
    const planted = callbacks.find((x) => x.nearMiss)!;
    const t = readThrow(planted, planted.nearMiss!);
    expect(t.kind).toBe("slack");
    expect(t.wrongSide).toBe(true);
  });

  it("drops a slack thread for an unrelated answer", () => {
    expect(readThrow(c, "something about the weather").kind).toBe("slack");
  });

  it("drops a slack thread for an empty answer", () => {
    expect(readThrow(c, "   ").kind).toBe("slack");
  });
});

describe("every credited answer weaves", () => {
  it("earns a thread on all 20, and never reads as the wrong side", () => {
    for (const c of callbacks) {
      const t = readThrow(c, c.credited);
      expect(t.kind, `item ${c.order}`).toBe("thread");
      expect(t.wrongSide, `item ${c.order}`).toBe(false);
    }
  });
});
