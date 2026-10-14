import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { findCrown, indicatorOf, parseArgument, readBuild, splitClaims } from "./atelier";

// The atelier crowns a pane and tells a student that is the conclusion. The
// tests that matter are the ones that stop it crowning the wrong one, so the
// safety properties are pinned first and the counts second.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "find-the-conclusion")!;
const args = drill.items.map((i) => parseArgument(i)!);
const byOrder = (n: number) => args.find((a) => a.order === n)!;

describe("parsing the bank", () => {
  it("turns every one of the 62 items into an argument", () => {
    expect(drill.items.length).toBe(62);
    expect(args.every(Boolean)).toBe(true);
  });

  it("reads the level off every item's own category", () => {
    for (const a of args) expect(a.level, `item ${a.order}`).toBeGreaterThanOrEqual(1);
  });

  it("gives every argument at least two claims to stack", () => {
    for (const a of args) expect(a.claims.length, `item ${a.order}`).toBeGreaterThanOrEqual(2);
  });
});

describe("splitting claims", () => {
  it("cuts in front of a support indicator, which is where Level 2 hides the conclusion", () => {
    const claims = splitClaims(
      "The lab's freezer alarm is inadequate, since it pages one technician and gives no second alert.",
    );
    expect(claims.length).toBe(2);
    expect(claims[0].text).toBe("The lab's freezer alarm is inadequate");
    expect(claims[1].behindSupport).toBe(true);
  });

  it("leaves a leading support indicator alone rather than cutting off a stub", () => {
    // The 25-character floor. "As the report shows" is running the sentence.
    const claims = splitClaims("As the report shows, the ferry schedule changed in March.");
    expect(claims.length).toBe(1);
  });

  it("keeps ordinary sentences whole", () => {
    const claims = splitClaims("Attendance has fallen. The room runs half empty.");
    expect(claims.map((c) => c.text)).toEqual([
      "Attendance has fallen.",
      "The room runs half empty.",
    ]);
  });
});

describe("crowning the conclusion", () => {
  const crowned = args.filter((a) => a.crown !== null);
  const silent = args.filter((a) => a.crown === null);

  it("crowns the 45 it can and stays silent on the other 17", () => {
    expect(crowned.length).toBe(45);
    expect(silent.length).toBe(17);
  });

  /**
   * The property the whole world rests on. A crown is shown to a student as
   * the answer, so crowning a claim the bank itself calls the wrong turn would
   * be teaching the error.
   */
  it("never crowns a claim the bank names as the wrong turn", () => {
    for (const a of crowned) {
      if (a.wrongTurn === null) continue;
      expect(a.wrongTurn, `item ${a.order}`).not.toBe(a.crown);
    }
  });

  it("never crowns an argument whose conclusion the bank marks unstated", () => {
    const unstated = args.filter((a) => a.unstated);
    expect(unstated.length).toBe(6);
    for (const a of unstated) expect(a.crown, `item ${a.order}`).toBeNull();
  });

  it("strips the authored marker so the student never reads '(derived):'", () => {
    for (const a of args.filter((x) => x.unstated)) {
      expect(a.conclusion).not.toMatch(/derived|substituted/i);
      expect(a.conclusion.startsWith("(")).toBe(false);
    }
  });

  it("refuses to crown when two claims restate each other", () => {
    // No margin: both claims carry the conclusion equally well.
    const claims = splitClaims("The rule is unfair. The rule is unfair to newcomers.");
    expect(findCrown(claims, "The rule is unfair.")).toBeNull();
  });

  it("crowns a conclusion that opens the argument, since position is not the tell", () => {
    // Item 2: "So the archive should digitize the glass negatives first."
    expect(byOrder(2).crown).toBe(0);
  });
});

describe("indicators", () => {
  it("finds the conclusion indicator the ladder fades after Level 2", () => {
    expect(indicatorOf("Therefore the goal has not been met.")).toBe("therefore");
    expect(indicatorOf("It follows that the series no longer earns the room.")).toBe(
      "it follows that",
    );
  });

  it("does not match an indicator buried inside a word", () => {
    expect(indicatorOf("The sothern route was closed.")).toBeNull();
  });

  it("says nothing rather than guessing when no indicator is present", () => {
    expect(indicatorOf("The tapes shed oxide with every playback.")).toBeNull();
  });
});

describe("reading the build", () => {
  const arg = byOrder(1);

  it("puts a correct answer on the crown at distance zero", () => {
    const build = readBuild(arg, arg.conclusion);
    expect(build.placement).toBe("crown");
    expect(build.distance).toBe(0);
  });

  it("accepts a paraphrase, since the drill asks for the student's own words", () => {
    const build = readBuild(arg, "the early commuter goal was not met by the program");
    expect(build.placement).toBe("crown");
  });

  it("places a premise answer off the crown and measures the gap", () => {
    const premise = arg.claims.find((c) => c.n !== arg.crown)!;
    const build = readBuild(arg, premise.text);
    expect(build.placement === "support" || build.placement === "wrong-turn").toBe(true);
    expect(build.distance).toBeGreaterThan(0);
  });

  it("places nothing rather than pinning a vague answer to a pane", () => {
    const build = readBuild(arg, "something about bikes I think");
    expect(build.placement).toBe("off-table");
    expect(build.pickedClaim).toBeNull();
  });

  it("can still credit the answer when the conclusion was never on the table", () => {
    const unstated = args.find((a) => a.unstated)!;
    const build = readBuild(unstated, unstated.conclusion);
    expect(build.crown).toBeNull();
    expect(build.placement).toBe("crown");
  });

  it("claims no placement before the student has answered", () => {
    const build = readBuild(arg);
    expect(build.placement).toBeNull();
    expect(build.distance).toBeNull();
  });

  it("lists every non-crown claim as a support", () => {
    const build = readBuild(arg);
    expect(build.supports).not.toContain(arg.crown);
    expect(build.supports.length).toBe(arg.claims.length - 1);
  });
});

describe("every item can be staged", () => {
  it("produces a build for all 62 without throwing", () => {
    for (const a of args) {
      const build = readBuild(a, a.conclusion);
      expect(build.placement, `item ${a.order}`).toBe("crown");
    }
  });
});
