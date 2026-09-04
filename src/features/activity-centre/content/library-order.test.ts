import { describe, expect, it } from "vitest";
import { sortForLibrary } from "../api/activitiesClient";
import {
  ACTIVITY_LIBRARY_ORDER,
  SEED_ACTIVITY_SLUGS,
  librarySortIndex,
} from "./index";

// The library's order is a teaching sequence, a word up to a passage, and it
// used to be thrown away at query time in favour of created_at. These pin it.

describe("the library order", () => {
  // Derived rather than a literal count. The literal was 12 and had to be
  // edited every time a captured section was built, which makes adding content
  // a test edit and teaches the wrong reflex. What this is actually pinning is
  // that the order holds every seeded Activity plus the one made by hand, and
  // that is exactly what the arithmetic says. The ORDER of the list is pinned
  // literally below, because that one IS a teaching decision.
  it("lists every seeded Activity plus the one outside the seed pipeline", () => {
    expect(ACTIVITY_LIBRARY_ORDER.length).toBe(SEED_ACTIVITY_SLUGS.length + 1);
    expect(ACTIVITY_LIBRARY_ORDER).toContain("negation-station");
  });

  it("covers every seeded Activity", () => {
    for (const slug of SEED_ACTIVITY_SLUGS) {
      expect(ACTIVITY_LIBRARY_ORDER, `${slug} is missing from the library order`).toContain(slug);
    }
  });

  it("names no Activity twice", () => {
    expect(new Set(ACTIVITY_LIBRARY_ORDER).size).toBe(ACTIVITY_LIBRARY_ORDER.length);
  });

  it("runs from the smallest scope of text to the largest, then the one that is not on that line", () => {
    expect([...ACTIVITY_LIBRARY_ORDER]).toEqual([
      "vocab-rehab", // a word
      "spot-the-relationship", // a sentence
      "conditional-rephrase", // a statement, translated
      "negation-station", // a statement, negated
      "find-the-conclusion", // an argument
      "rebuttal-rephrase", // an argument, restated
      "dumb-it-down", // a paragraph
      "spot-the-callback", // a passage
      // Last, and deliberately not because its text is the longest. Everything
      // above is ordered by the scope of text a skill works on. Read, Recall,
      // Colour is a different axis: a stimulus worked from memory rather than
      // analysed on the page. Sitting at the end says "different kind of thing"
      // rather than "bigger version of the last one".
      "read-recall-colour", // a stimulus, from memory
      // Then the captured sections: the same drill at full scale, a whole LR
      // section run unbroken against the clock. They follow the Activity they
      // scale up rather than sorting among the scope-ordered ones, and they run
      // by PrepTest so the list does not reshuffle when the next is built.
      "read-recall-colour-pt1-s3",
      "read-recall-colour-pt21-s3",
      "read-recall-colour-pt102-s3",
      "read-recall-colour-pt105-s2",
      "read-recall-colour-pt134-s3",
    ]);
  });

  it("keeps the spoken Activities last, where a scope-ordered list cannot rank them", () => {
    const spoken = ACTIVITY_LIBRARY_ORDER.filter((s) => s.startsWith("read-recall-colour"));
    expect(ACTIVITY_LIBRARY_ORDER.slice(-spoken.length)).toEqual(spoken);
    // The base Activity comes before the sections it scales up.
    expect(spoken[0]).toBe("read-recall-colour");
  });

  it("keeps the two statement-level Activities together", () => {
    const conditional = librarySortIndex("conditional-rephrase");
    const negation = librarySortIndex("negation-station");
    expect(Math.abs(conditional - negation)).toBe(1);
  });
});

describe("sorting a library page", () => {
  it("puts the query's created_at order back into teaching order", () => {
    // What the query actually returns: newest seeded first, with the oldest
    // Activity last. This is the order the library used to display.
    const fromQuery = [
      { slug: "vocab-rehab" },
      { slug: "spot-the-relationship" },
      { slug: "spot-the-callback" },
      { slug: "find-the-conclusion" },
      { slug: "conditional-rephrase" },
      { slug: "rebuttal-rephrase" },
      { slug: "dumb-it-down" },
      { slug: "negation-station" },
      { slug: "read-recall-colour" },
      { slug: "read-recall-colour-pt134-s3" },
      { slug: "read-recall-colour-pt102-s3" },
      { slug: "read-recall-colour-pt21-s3" },
      { slug: "read-recall-colour-pt105-s2" },
      { slug: "read-recall-colour-pt1-s3" },
    ];
    expect(sortForLibrary(fromQuery).map((r) => r.slug)).toEqual([
      ...ACTIVITY_LIBRARY_ORDER,
    ]);
  });

  /**
   * An Activity made by hand, outside the content pipeline, must still show up.
   * A falsy index would have sorted it to the front instead.
   */
  it("keeps an unlisted Activity, after the ones it knows", () => {
    const sorted = sortForLibrary([
      { slug: "something-new" },
      { slug: "spot-the-callback" },
      { slug: "vocab-rehab" },
    ]);
    expect(sorted.map((r) => r.slug)).toEqual([
      "vocab-rehab",
      "spot-the-callback",
      "something-new",
    ]);
  });

  it("does not lose or duplicate rows", () => {
    const rows = ACTIVITY_LIBRARY_ORDER.map((slug) => ({ slug }));
    expect(sortForLibrary(rows).length).toBe(rows.length);
  });

  it("leaves the caller's array alone", () => {
    const rows = [{ slug: "spot-the-callback" }, { slug: "vocab-rehab" }];
    sortForLibrary(rows);
    expect(rows.map((r) => r.slug)).toEqual(["spot-the-callback", "vocab-rehab"]);
  });

  it("handles a row with no slug rather than throwing", () => {
    expect(() => sortForLibrary([{ slug: null }, { slug: "vocab-rehab" }])).not.toThrow();
    expect(sortForLibrary([{ slug: null }, { slug: "vocab-rehab" }])[0].slug).toBe("vocab-rehab");
  });
});
