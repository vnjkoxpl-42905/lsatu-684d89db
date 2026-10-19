import { describe, expect, it } from "vitest";
import { readSectionBriefing } from "./sectionBriefing";

describe("readSectionBriefing", () => {
  const timed = {
    pt: 155,
    kind: "timed_section",
    href: "/drill?mode=full-section&pt=155&section=1&minutes=53&sealed=1",
    minutes: 53,
    section: 1,
    section_kind: "lr",
    sealed: true,
  };

  it("reads a timed section off the item's metadata", () => {
    expect(readSectionBriefing(timed)).toEqual({
      minutes: 53,
      sectionName: "Logical Reasoning",
      href: timed.href,
      sealed: true,
    });
  });

  it("keeps an accommodated clock exactly rather than snapping to a preset", () => {
    expect(readSectionBriefing({ ...timed, minutes: 70 })?.minutes).toBe(70);
  });

  it("is null for work that is not a timed section", () => {
    expect(readSectionBriefing({ kind: "guided_drill", minutes: 20, href: "/x" })).toBeNull();
    expect(readSectionBriefing(null)).toBeNull();
    expect(readSectionBriefing("timed_section")).toBeNull();
  });

  it("falls back to the ordinary route when the row cannot be trusted", () => {
    expect(readSectionBriefing({ ...timed, href: undefined })).toBeNull();
    expect(readSectionBriefing({ ...timed, minutes: 0 })).toBeNull();
  });

  it("names an unknown section kind without inventing one", () => {
    expect(readSectionBriefing({ ...timed, section_kind: "??" })?.sectionName).toBe("Timed Section");
  });

  it("treats a missing sealed flag as not sealed", () => {
    expect(readSectionBriefing({ ...timed, sealed: undefined })?.sealed).toBe(false);
  });
});
