import { describe, expect, it } from "vitest";
import { sortForLibrary } from "../api/activitiesClient";
import {
  ACTIVITY_LIBRARY_ORDER,
  SEED_ACTIVITY_SLUGS,
  librarySortIndex,
} from "./index";

// The library's order is a teaching sequence, a word up to a passage, and it
// used to be thrown away at query time in favour of created_at. These pin it.

/** The teaching sequence, which is a decision rather than content. */
const TEACHING_ORDER = [
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
];

/** The captured sections, in the order the library actually lists them. */
const SECTION_SLUGS = ACTIVITY_LIBRARY_ORDER.slice(TEACHING_ORDER.length);

/** PrepTest, then section within it. */
const byPrepTest = (a: string, b: string): number => {
  const key = (slug: string): [number, number] => {
    const m = /-pt(\d+)-s(\d+)$/.exec(slug);
    if (!m) throw new Error(`not a section slug: ${slug}`);
    return [Number(m[1]), Number(m[2])];
  };
  const [pa, sa] = key(a);
  const [pb, sb] = key(b);
  return pa - pb || sa - sb;
};

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
    // The teaching decision is pinned literally: which skill comes before
    // which, and that Read, Recall, Colour sits after all of them. The
    // captured sections are NOT pinned literally, for the same reason the
    // count above is not: which sections exist is content, and listing them
    // here made building one a test edit. What IS pinned about them is the
    // rule -- they follow the Activity they scale up, and they run by
    // PrepTest so the list does not reshuffle when the next one is built.
    expect(ACTIVITY_LIBRARY_ORDER.slice(0, TEACHING_ORDER.length)).toEqual(TEACHING_ORDER);
    expect(SECTION_SLUGS).toEqual([...SECTION_SLUGS].sort(byPrepTest));
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
    // Reversed rather than listed: what the query returns is newest-seeded
    // first, and the point of the assertion is that ANY order comes back in
    // teaching order. Listing it made adding a section a test edit here too.
    const fromQuery = [...ACTIVITY_LIBRARY_ORDER].reverse().map((slug) => ({ slug }));
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
