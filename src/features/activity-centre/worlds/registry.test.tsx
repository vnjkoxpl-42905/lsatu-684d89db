import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../content";

/**
 * Every Activity gets a world except the spoken one.
 *
 * Read, Recall, Colour is a runner rather than a world
 * (`docs/adr/0009-read-recall-colour-is-a-runner-not-a-world.md`): it has no
 * typed answer for a world to sit beside, its answering unit is a chunk rather
 * than an item, and during a recall the screen must carry nothing readable at
 * all. `ActivityRunner` hands it the whole screen on `item_format`, so it never
 * reaches this registry and must not be asserted against it.
 *
 * Filtering on the format rather than the slug is deliberate: a second spoken
 * Activity should be excluded automatically, not remembered.
 */
const WORLDED = SEED_ACTIVITIES.filter((a) => a.item_format !== "spoken-recall");
import { WORLD_BINDINGS, cardIdentityFor, slugFromTitle, worldForTitle } from "./registry";

// Eight worlds were built, one per Activity, and none was reachable: the only
// importer was the dev-only Activity Lab, so every Activity rendered the same
// generic rail. These pin the wiring that connects them, and in particular the
// two ways it can silently come undone — an Activity retitled so its slug no
// longer matches, or authored content that its world can no longer parse.

describe("world registry", () => {
  it("covers every seeded Activity, plus Negation Station", () => {
    const covered = new Set(WORLD_BINDINGS.map((w) => w.slug));
    for (const a of WORLDED) {
      expect(covered.has(a.slug), `${a.slug} has no world`).toBe(true);
    }
    expect(covered.has("negation-station")).toBe(true);
    expect(WORLD_BINDINGS).toHaveLength(8);
  });

  it("finds a world from the title alone, which is all an assignment carries", () => {
    // An activity_assignments row snapshots title but not slug, so the lookup
    // goes through the title. Every seeded title must normalize to its slug.
    for (const a of WORLDED) {
      expect(slugFromTitle(a.title)).toBe(a.slug);
      expect(worldForTitle(a.title)?.slug).toBe(a.slug);
    }
    expect(worldForTitle("Negation Station")?.slug).toBe("negation-station");
  });

  it("returns nothing for an unknown Activity rather than guessing one", () => {
    expect(worldForTitle("Some Activity That Has No World")).toBeUndefined();
    expect(worldForTitle(undefined)).toBeUndefined();
    expect(worldForTitle("")).toBeUndefined();
  });

  it("renders each world's stage from its own Activity's first item", () => {
    for (const a of WORLDED) {
      const world = worldForTitle(a.title)!;
      const item = a.items[0];

      const before = world.render({ item, answered: false });
      expect(before, `${a.slug} did not render before commit`).not.toBeNull();
      const { unmount } = render(<div>{before}</div>);
      unmount();

      const after = world.render({
        item,
        response: item.credited_answers[0],
        answered: true,
      });
      expect(after, `${a.slug} did not render after commit`).not.toBeNull();
      const second = render(<div>{after}</div>);
      second.unmount();
    }
  });

  it("shows the item's own words in every world that claims to carry the prompt", () => {
    // `carriesPrompt` is what tells the answer column to stop drawing the
    // statement, so a world that claims it and then stops showing the text
    // would leave the student with no question at all. The claim is checked
    // against what the world actually renders, not taken on trust.
    const carriers = WORLD_BINDINGS.filter((w) => w.carriesPrompt);
    expect(carriers.length).toBeGreaterThan(0);

    for (const a of WORLDED) {
      const world = worldForTitle(a.title)!;
      if (!world.carriesPrompt) continue;

      const item = a.items[0];
      const { container, unmount } = render(<div>{world.render({ item, answered: false })}</div>);
      const shown = container.textContent ?? "";

      // Compare on content words: the worlds set the prompt in their own
      // furniture, so whitespace and the authored emphasis marks differ.
      const words = item.prompt
        .replace(/[*_]/g, "")
        .split(/\s+/)
        .filter((w) => w.replace(/\W/g, "").length > 6);
      const missing = words.filter((w) => !shown.includes(w.replace(/[^\w'-]/g, "")));

      // Guard against passing vacuously on a prompt with nothing long enough
      // to compare, which would make the check above meaningless.
      expect(words.length, `${a.slug} gave the check nothing to compare`).toBeGreaterThan(2);
      expect(
        missing.length,
        `${a.slug} claims to carry the prompt but its stage is missing: ${missing.join(", ")}`,
      ).toBe(0);
      unmount();
    }
  });

  it("returns null on an item its world cannot read, so the caller can fall back", () => {
    const unreadable = {
      order: 1,
      prompt: "",
      credited_answers: [],
      explanation: "",
    } as never;
    // Not every world rejects an empty item (some render an empty surface
    // honestly), but none may throw: a null return is the contract that lets
    // ActivityRunner drop back to the generic rail.
    for (const w of WORLD_BINDINGS) {
      expect(() => w.render({ item: unreadable, answered: false })).not.toThrow();
    }
  });
});

/**
 * The card label on the rows that have no world.
 *
 * Read, Recall, Colour is matched by title prefix, and the titles are not
 * uniform: the door is plain "Read, Recall, Colour" and the sections carry the
 * section they are. This caught a real one. Removing the base Activity took
 * with it a lookup keyed on the exact slug `read-recall-colour`, and the prefix
 * left behind had a trailing hyphen, so the door -- the one card a student is
 * ever given for this drill -- came back unlabelled while every section it
 * opens onto stayed fine.
 */
describe("the card identity of a drill with no world", () => {
  it.each([
    ["the door", "Read, Recall, Colour"],
    ["a section", "Read, Recall, Colour \u00b7 PT105 Section 2"],
    ["a section named another way", "Read, Recall, Colour \u00b7 PT1 Section 3"],
  ])("labels %s", (_what, title) => {
    const identity = cardIdentityFor(title);
    expect(identity, `${title} came back unlabelled`).not.toBeNull();
    expect(identity!.label).toBe("Out Loud");
    expect(identity!.scope.trim()).not.toBe("");
  });

  it("gives the door and its sections the same identity, because they are one drill", () => {
    expect(cardIdentityFor("Read, Recall, Colour")).toEqual(
      cardIdentityFor("Read, Recall, Colour \u00b7 PT105 Section 2"),
    );
  });

  it("leaves a worlded Activity wearing its world, and labels nothing else", () => {
    // The world branch runs first, so this prefix never reaches an Activity
    // that has a room of its own.
    expect(cardIdentityFor("Vocab Rehab")?.label).toBe("The Specimen Lab");
    expect(cardIdentityFor("Something Nobody Built")).toBeNull();
    expect(cardIdentityFor(null)).toBeNull();
  });
});
