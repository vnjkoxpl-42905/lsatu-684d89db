import { describe, expect, it } from "vitest";
import { looksLikeSpeakerLabel } from "./dialogue";

describe("looksLikeSpeakerLabel", () => {
  it("accepts genuine Title-Case speaker names", () => {
    expect(looksLikeSpeakerLabel("Figorian Wildlife Commission")).toBe(true);
    expect(looksLikeSpeakerLabel("Figorian Development Commission")).toBe(true);
    expect(looksLikeSpeakerLabel("Editorial")).toBe(true);
    expect(looksLikeSpeakerLabel("Letter to the Editor")).toBe(true);
  });

  it("rejects sentence clauses that merely end with a colon", () => {
    expect(
      looksLikeSpeakerLabel(
        "To protect wildlife we must regulate such development in Figoria",
      ),
    ).toBe(false);
  });

  it("rejects labels that are too long even if every word is capitalized", () => {
    expect(looksLikeSpeakerLabel("One Two Three Four Five Six Seven")).toBe(false);
  });
});
