import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import {
  gaugeState,
  nearestForm,
  parsePress,
  readStroke,
  sentenceCount,
  wordCount,
} from "./press";

// The press stages two claims about a student's sentence: how many sentences it
// is, and which named trap it fell into. Both are pinned here. What is NOT
// pinned is idea coverage, because this module refuses to derive it, and that
// refusal is itself asserted below.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "dumb-it-down")!;
const presses = drill.items.map((i) => parsePress(i)!);
const byOrder = (n: number) => presses.find((p) => p.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 24 items into a press", () => {
    expect(drill.items.length).toBe(24);
    expect(presses.every(Boolean)).toBe(true);
  });

  it("pulls a checklist of three or four big ideas from every item", () => {
    for (const p of presses) {
      expect(p.ideas.length, `item ${p.order}`).toBeGreaterThanOrEqual(3);
      expect(p.ideas.length, `item ${p.order}`).toBeLessThanOrEqual(4);
      expect(p.ideas.map((i) => i.n)).toEqual(p.ideas.map((_, i) => i + 1));
    }
  });

  it("finds both named traps on every item", () => {
    for (const p of presses) {
      expect(p.traps.narrow, `item ${p.order} narrow`).toBeTruthy();
      expect(p.traps.topic, `item ${p.order} topic`).toBeTruthy();
    }
  });

  it("never lets a checklist entry swallow the traps prose or its neighbour", () => {
    // Length is not the contract; several authored ideas are legitimately long
    // (item 15's quotes two phrases). What must never happen is one entry
    // running into the next idea or into the trap sentences after them.
    for (const p of presses) {
      for (const idea of p.ideas) {
        expect(idea.text, `item ${p.order}`).not.toContain("Named traps");
        expect(idea.text, `item ${p.order}`).not.toContain("·");
        expect(idea.text, `item ${p.order}`).not.toMatch(/\(\d\)/);
      }
    }
  });

  it("takes the gauge's target from the credited slug's own length", () => {
    const p = byOrder(1);
    expect(p.targetWords).toBe(wordCount(p.slug));
  });
});

describe("sentenceCount", () => {
  it("counts one sentence as one, with or without a full stop", () => {
    expect(sentenceCount("Keepers were tradespeople, not romantics.")).toBe(1);
    expect(sentenceCount("Keepers were tradespeople, not romantics")).toBe(1);
  });

  it("catches the sprawl the drill forbids", () => {
    expect(sentenceCount("Keepers were tradespeople. They were not romantics.")).toBe(2);
  });

  it("does not count an abbreviation as a sentence break", () => {
    expect(sentenceCount("The study by Dr. Aliyev changed the method.")).toBe(1);
  });

  it("treats an empty response as no sentences", () => {
    expect(sentenceCount("   ")).toBe(0);
  });
});

describe("nearestForm", () => {
  it("recognises each authored form on every item in the bank", () => {
    // The three authored sentences are the only texts whose classification is
    // knowable, so they are the contract. A bank edit that blurs them fails here.
    const misses: string[] = [];
    for (const p of presses) {
      if (nearestForm(p.slug, p) !== "credited") misses.push(`${p.order} credited`);
      if (p.traps.narrow && nearestForm(p.traps.narrow, p) !== "narrow") {
        misses.push(`${p.order} narrow`);
      }
      if (p.traps.topic && nearestForm(p.traps.topic, p) !== "topic") {
        misses.push(`${p.order} topic`);
      }
    }
    expect(misses).toEqual([]);
  });

  it("says nothing about a sentence with no words in common", () => {
    expect(nearestForm("zzz qqq", byOrder(1))).toBeNull();
  });
});

describe("readStroke", () => {
  it("calls sprawl on two sentences, whatever else they are", () => {
    const p = byOrder(1);
    const stroke = readStroke(`${p.slug} And there is more to say.`, p);
    expect(stroke.trap).toBe("sprawl");
    expect(stroke.sentences).toBe(2);
  });

  it("claims no trap for the credited answer", () => {
    const p = byOrder(1);
    expect(readStroke(p.slug, p).trap).toBeNull();
  });

  it("stages the thin slug for the too-narrow trap", () => {
    const p = byOrder(1);
    expect(readStroke(p.traps.narrow!, p).trap).toBe("narrow");
  });

  it("stages the hollow slug for the topic-only trap", () => {
    const p = byOrder(1);
    expect(readStroke(p.traps.topic!, p).trap).toBe("topic");
  });

  it("passes the Coach's coverage through and invents none of its own", () => {
    const p = byOrder(1);
    expect(readStroke(p.slug, p).covered).toBeUndefined();
    expect(readStroke(p.slug, p, [1, 3]).covered).toEqual([1, 3]);
  });
});

describe("the compression gauge", () => {
  it("reads in range at the credited length", () => {
    const p = byOrder(1);
    expect(gaugeState(p.targetWords, p.targetWords)).toBe("in-range");
  });

  it("reads long well past it and short well under", () => {
    expect(gaugeState(60, 30)).toBe("long");
    expect(gaugeState(5, 30)).toBe("short");
  });
});
