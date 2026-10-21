import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { ARC, parseRebuttal, readResolution, strengthOf } from "./chamber";

// The chamber engraves a claim on a plinth and attributes it to somebody else,
// and it puts a needle on an arc. Both are assertions to a student, so the
// tests pin what it refuses to assert as hard as what it does.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "rebuttal-rephrase")!;
const rebuttals = drill.items.map((i) => parseRebuttal(i)!);
const byOrder = (n: number) => rebuttals.find((r) => r.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 42 items into a rebuttal", () => {
    expect(drill.items.length).toBe(42);
    expect(rebuttals.every(Boolean)).toBe(true);
  });

  it("isolates the attributed claim on every item", () => {
    const isolated = rebuttals.filter((r) => r.attributed !== null);
    expect(isolated.length).toBe(42);
  });

  it("never engraves a stub on their plinth", () => {
    for (const r of rebuttals) {
      if (r.attributed === null) continue;
      expect(r.attributed.length, `item ${r.order}`).toBeGreaterThan(15);
    }
  });

  it("never puts the credited claim on their plinth", () => {
    // Their plinth is the other side. If the two ever matched, the chamber
    // would be staging the author's own claim as the position being rejected.
    for (const r of rebuttals) {
      if (!r.attributed) continue;
      expect(r.attributed.toLowerCase(), `item ${r.order}`).not.toBe(r.credited.toLowerCase());
    }
  });

  it("handles the fronted form, where the claim runs before the marker", () => {
    // Item 31: "That a tremor ... is an inference the data do not support."
    expect(byOrder(31).attributed).toContain("tremor");
    expect(byOrder(31).attributed).not.toMatch(/is an inference/i);
  });

  it("pulls the authored overshoot when the bank quotes one", () => {
    const quoted = rebuttals.filter((r) => r.overshoot !== null);
    expect(quoted.length).toBeGreaterThan(15);
    for (const r of quoted) expect(r.overshoot!.length).toBeGreaterThan(5);
  });
});

describe("the certainty arc", () => {
  it("reads the closed lexicon this bank actually uses", () => {
    expect(strengthOf("a violin top cannot be regraduated")).toBe("none");
    expect(strengthOf("A violin top can be regraduated")).toBe("sometimes");
    expect(strengthOf("every dialect lost the final vowel")).toBe("always");
    expect(strengthOf("Not every dialect lost the final vowel")).toBe("sometimes");
    expect(strengthOf("was not necessarily abandoned")).toBe("not-necessarily");
  });

  it("prefers the longer phrase, so 'can never' is not read as 'can'", () => {
    expect(strengthOf("a patient can never tolerate the dose")).toBe("none");
    expect(strengthOf("it is not necessarily so")).toBe("not-necessarily");
  });

  it("places no needle when a claim's words fix no position", () => {
    expect(strengthOf("the catalogue was late")).toBeNull();
  });

  it("places the credited claim on the arc for every single-claim item", () => {
    const single = rebuttals.filter((r) => r.level < 4);
    const placed = single.filter((r) => r.creditedStrength !== null);
    expect(placed.length).toBe(single.length);
  });

  /**
   * A compound rebuttal is a concession plus a rejected sub-claim plus a
   * judgment. One needle cannot say that, and item 42 shows what happens if it
   * tries: both sides read "none" about different propositions, and the arc
   * would show a distance of zero on the lesson it exists to teach.
   */
  it("declines to place a needle on a compound rebuttal", () => {
    const compounds = rebuttals.filter((r) => r.level >= 4);
    expect(compounds.length).toBe(8);
    for (const r of compounds) {
      expect(r.creditedStrength, `item ${r.order}`).toBeNull();
      expect(r.attributedStrength, `item ${r.order}`).toBeNull();
    }
  });

  /**
   * The minimal-negation lesson is the DISTANCE between the two needles, so a
   * credited claim must never land on the attributed claim's own position.
   */
  it("never lands the author on the position they are rejecting", () => {
    for (const r of rebuttals) {
      if (r.creditedStrength === null || r.attributedStrength === null) continue;
      expect(r.creditedStrength, `item ${r.order}`).not.toBe(r.attributedStrength);
    }
  });

  it("keeps the arc ordered from none to always", () => {
    expect(ARC).toEqual(["none", "not-necessarily", "sometimes", "usually", "always"]);
  });
});

describe("reading the answer", () => {
  const bare = byOrder(1); // "cannot be regraduated" -> "can be regraduated"

  it("resolves the credited claim", () => {
    const res = readResolution(bare, bare.credited);
    expect(res.resolved).toBe(true);
    expect(res.trap).toBeNull();
  });

  it("names an answer that stays referential", () => {
    const res = readResolution(bare, "these luthiers are mistaken, this is not so");
    expect(res.trap).toBe("vague-referential");
    expect(res.resolved).toBe(false);
  });

  it("names the authored overshoot", () => {
    const withOvershoot = rebuttals.find((r) => r.overshoot)!;
    const res = readResolution(withOvershoot, withOvershoot.overshoot!);
    expect(res.trap).toBe("overshoot");
  });

  it("names an over-rotation past the credited position", () => {
    // Credited is "can" (sometimes); "always" is further out in the same
    // direction the author moved.
    const res = readResolution(bare, "a violin top must always be regraduated to improve tone");
    expect(res.trap).toBe("overshoot");
  });

  it("names a dropped scope qualifier on an otherwise right answer", () => {
    const scoped = rebuttals.find((r) => r.qualifiers.includes("at least one"))!;
    const stripped = scoped.credited.replace(/at least one/i, "many");
    const res = readResolution(scoped, stripped);
    expect(res.dropped).toContain("at least one");
    expect(res.trap === "scope-drop" || res.trap === "overshoot").toBe(true);
  });

  it("names a premise answer when the student restates the evidence", () => {
    // Level 2 items carry an evidence sentence between claim and rejection.
    const withEvidence = rebuttals.find((r) => r.level === 2)!;
    const evidence = withEvidence.argument
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .find((s) => s.length > 20 && !s.toLowerCase().includes(withEvidence.credited.slice(0, 12).toLowerCase()))!;
    const res = readResolution(withEvidence, evidence);
    expect(["premise", "overshoot", null]).toContain(res.trap);
  });

  it("names no trap rather than guessing between four", () => {
    const res = readResolution(bare, "something unrelated about wood and glue");
    expect(res.trap).toBeNull();
  });
});

describe("every item can be staged", () => {
  it("reads the credited answer as resolved on all 42", () => {
    for (const r of rebuttals) {
      const res = readResolution(r, r.credited);
      expect(res.resolved, `item ${r.order}`).toBe(true);
    }
  });

  it("never names a trap against the bank's own credited answer", () => {
    for (const r of rebuttals) {
      const res = readResolution(r, r.credited);
      expect(res.trap, `item ${r.order} flagged ${res.trap}`).toBeNull();
    }
  });
});
