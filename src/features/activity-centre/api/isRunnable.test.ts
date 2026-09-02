import { describe, expect, it } from "vitest";
import { isRunnable } from "./activitiesClient";
import type { Activity } from "./types";

// Read, Recall, Colour is a whole section and only that. This predicate is the
// only thing keeping an Activity that nothing can run out of the library, and
// it fails silently in the direction that matters: get it wrong and an
// unrunnable card is offered for assignment again, with nothing to flag it.

const activity = (over: Partial<Activity>): Activity =>
  ({ id: "a", title: "t", item_format: "free-text", items: [], instructions: {}, ...over }) as Activity;

describe("what the library will offer", () => {
  it("offers a Read, Recall, Colour section", () => {
    expect(isRunnable(activity({ item_format: "spoken-recall", mode: "section" }))).toBe(true);
  });

  it("hides a spoken-recall Activity that is not a section", () => {
    // The one-stimulus runner is gone, so there is nothing to run this with.
    expect(isRunnable(activity({ item_format: "spoken-recall", mode: null }))).toBe(false);
    expect(isRunnable(activity({ item_format: "spoken-recall" }))).toBe(false);
    expect(isRunnable(activity({ item_format: "spoken-recall", mode: "stimulus" }))).toBe(false);
  });

  it("leaves every other kind of Activity alone", () => {
    // The rule is about one format. Nothing else should be touched by it.
    expect(isRunnable(activity({ item_format: "free-text" }))).toBe(true);
    expect(isRunnable(activity({ item_format: "mcq" }))).toBe(true);
    expect(isRunnable(activity({ item_format: "variation" }))).toBe(true);
    expect(isRunnable(activity({ item_format: "free-text", mode: null }))).toBe(true);
  });
});
