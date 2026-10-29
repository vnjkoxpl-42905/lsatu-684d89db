import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { parsePress } from "../press";
import { buildIdeaCensus, buildSlugJudge } from "./rounds";

// Both wings are built entirely from authored text. The tests that matter here
// are the ones that would catch a wing quietly becoming guessable: a census
// where shape predicts the answer, or a judge where the credited slug always
// sits in the same place.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "dumb-it-down")!;
const presses = drill.items.map((i) => parsePress(i)!);

describe("the idea census", () => {
  const pages = buildIdeaCensus(drill.items);

  it("builds a page per paragraph", () => {
    expect(pages.length).toBe(24);
    expect(pages.map((p) => p.order)).toEqual(presses.map((p) => p.order));
  });

  it("carries every authored idea as a survivor, and both traps as not", () => {
    for (const page of pages) {
      const press = presses.find((p) => p.order === page.order)!;
      const survivors = page.candidates.filter((c) => c.survives).map((c) => c.text);
      expect(survivors.sort(), `item ${page.order}`).toEqual(press.ideas.map((i) => i.text).sort());

      const traps = page.candidates.filter((c) => c.kind === "trap").map((c) => c.text);
      expect(traps).toContain(press.traps.narrow);
      expect(traps).toContain(press.traps.topic);
      expect(page.candidates.filter((c) => c.kind === "trap").every((c) => !c.survives)).toBe(true);
    }
  });

  it("never shows a foreign idea that belongs to the paragraph on screen", () => {
    for (const page of pages) {
      const press = presses.find((p) => p.order === page.order)!;
      const own = new Set(press.ideas.map((i) => i.text));
      for (const c of page.candidates.filter((c) => c.kind === "foreign")) {
        expect(own.has(c.text), `item ${page.order}: ${c.text}`).toBe(false);
      }
    }
  });

  /**
   * The reason foreign ideas are in the round at all. Traps are full sentences
   * and ideas are short analytic phrases, so a census of ideas-versus-traps
   * alone could be cleared on length without reading the paragraph. If this
   * ever passes trivially the wing has become a shape-matching exercise.
   */
  it("cannot be cleared by calling the long candidates dead", () => {
    for (const page of pages) {
      const byLength = [...page.candidates].sort((a, b) => a.text.length - b.text.length);
      const guessed = byLength.map((c, i) => i < page.candidates.length / 2);
      const right = byLength.filter((c, i) => guessed[i] === c.survives).length;
      expect(right, `item ${page.order} is guessable by length`).toBeLessThan(
        page.candidates.length,
      );
    }
  });

  it("gives every candidate an authored reason and a stable id", () => {
    for (const page of pages) {
      expect(new Set(page.candidates.map((c) => c.id)).size).toBe(page.candidates.length);
      expect(page.candidates.every((c) => c.why.trim().length > 0)).toBe(true);
    }
  });

  it("presents in a fixed order, so a returning student sees the same page", () => {
    const again = buildIdeaCensus(drill.items);
    expect(again.map((p) => p.candidates.map((c) => c.id))).toEqual(
      pages.map((p) => p.candidates.map((c) => c.id)),
    );
  });

  it("does not leave the candidates in authored order", () => {
    // Authored order is every idea, then the two traps, then the foreign ones,
    // which would put every survivor at the front. If the scramble ever no-ops
    // the wing becomes "pick the first four" and stops testing anything.
    const inAuthoredOrder = pages.filter((page) => {
      const authored = [
        ...page.candidates.filter((c) => c.kind === "idea").map((c) => c.id),
        ...page.candidates.filter((c) => c.kind === "trap").map((c) => c.id),
        ...page.candidates.filter((c) => c.kind === "foreign").map((c) => c.id),
      ].join(",");
      return page.candidates.map((c) => c.id).join(",") === authored;
    });
    expect(inAuthoredOrder.length, "pages left unscrambled").toBeLessThan(pages.length / 4);
  });

  it("says so rather than inventing a round when there is no bank", () => {
    expect(buildIdeaCensus([])).toEqual([]);
  });
});

describe("the slug judge", () => {
  const calls = buildSlugJudge(drill.items);

  it("runs on every item, since all 24 carry both traps", () => {
    expect(calls.length).toBe(24);
  });

  it("offers exactly the credited slug and the two authored traps", () => {
    for (const call of calls) {
      const press = presses.find((p) => p.order === call.order)!;
      expect(call.choices.length).toBe(3);
      expect(call.choices.map((c) => c.text).sort()).toEqual(
        [press.slug, press.traps.narrow!, press.traps.topic!].sort(),
      );
      expect(call.choices.filter((c) => c.kind === "credited").length).toBe(1);
    }
  });

  it("does not park the credited slug in one position", () => {
    const positions = calls.map((c) => c.choices.findIndex((x) => x.kind === "credited"));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("carries the checklist so the reveal can show what had to survive", () => {
    for (const call of calls) {
      expect(call.ideas.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("leaves out an item that is missing a trap rather than showing two choices", () => {
    const stripped = drill.items.slice(0, 3).map((i) => ({
      ...i,
      explanation: i.explanation.replace(/Topic[- ]only:\s*"[^"]+"/, ""),
    }));
    expect(buildSlugJudge(stripped)).toEqual([]);
  });
});
