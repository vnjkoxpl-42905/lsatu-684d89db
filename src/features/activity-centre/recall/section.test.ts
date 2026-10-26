import { describe, expect, it } from "vitest";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import {
  advanceCursor,
  buildSectionRun,
  formatElapsed,
  goalSeconds,
  startCursor,
  type SectionCursor,
  type SectionRun,
} from "./section";

// The section machine, driven against real captured content rather than a
// fixture. Everything here is what one key press does, and it has to be right
// without a browser: she runs 25-odd minutes unbroken with no coach in the loop
// to catch a wrong state, so a phase bug would surface as a lost place
// mid-section rather than as an error.

const run = buildSectionRun(
  pt105.items,
  pt105.source_section,
  pt105.time_goal_minutes,
) as SectionRun;

/** Drive the whole section, one press at a time, collecting every cursor. */
function walk(r: SectionRun): SectionCursor[] {
  const seen: SectionCursor[] = [];
  let at: SectionCursor | null = startCursor();
  // Bounded so a machine that never terminates fails as a test rather than
  // hanging the suite.
  const cap = r.stimuli.length * 2 + 10;
  while (at && seen.length < cap) {
    seen.push(at);
    at = advanceCursor(r, at);
  }
  expect(seen.length, "the section never ended").toBeLessThan(cap);
  return seen;
}

describe("building a section run", () => {
  it("reads a real captured section", () => {
    expect(run).not.toBeNull();
    expect(run.sourceSection).toBe("PT105.S2");
    expect(run.stimuli).toHaveLength(pt105.items.length);
  });

  it("keeps the chunks as authored, because the grader's Details live inside them", () => {
    // A Chunk is the unit content is written in and a guide for her eye. It is
    // not a boundary the machine holds her to, but the Details it carries are
    // what Coverage is counted against, so the run must not flatten them away.
    expect(run.stimuli[0].chunks).toHaveLength(pt105.items[0].chunks.length);
    expect(run.stimuli[0].chunks[0].details.length).toBeGreaterThan(0);
  });

  it("refuses anything that is not a section rather than half-rendering it", () => {
    // Each of these is a real way the snapshot can be wrong, and every one of
    // them would otherwise reach a student as a blank or broken screen.
    expect(buildSectionRun([], "PT105.S2", pt105.time_goal_minutes)).toBeNull();
    expect(buildSectionRun(pt105.items, null, pt105.time_goal_minutes)).toBeNull();
    expect(buildSectionRun(pt105.items, "PT105.S2", null)).toBeNull();
    // A goal missing one accommodation is worse than no goal: it would score a
    // student with extra time against a number that was never set for her.
    expect(
      buildSectionRun(pt105.items, "PT105.S2", { standard: 20, accommodation_53: 25 }),
    ).toBeNull();
    // A v1 item has chunks but none of the section capture's fields.
    expect(
      buildSectionRun(
        [{ ...pt105.items[0], the_read: "" }],
        "PT105.S2",
        pt105.time_goal_minutes,
      ),
    ).toBeNull();
  });
});

describe("advancing", () => {
  const walked = walk(run);

  it("gives every stimulus exactly two states: working, then recalling", () => {
    // One key, pressed twice per stimulus. The first press is her saying
    // "Recall Full Stimulus": the text goes and The Recall begins. The second
    // ends it. Nothing else exists between those moments, because the app does
    // not track which chunk she is on (ADR 0013).
    for (const stimulus of run.stimuli) {
      const mine = walked.filter((c) => run.stimuli[c.item].slug === stimulus.slug);
      expect(mine.map((c) => c.phase), stimulus.slug).toEqual(["working", "recalling"]);
    }
  });

  it("takes exactly two presses per stimulus across the whole section", () => {
    expect(walked).toHaveLength(run.stimuli.length * 2);
  });

  it("runs the stimuli in order and never goes back", () => {
    // Nothing is revisitable. A stimulus she has passed does not come back
    // until the Report Card.
    const order = walked.map((c) => c.item);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(run.stimuli.length);
  });

  it("ends after the last stimulus's Recall rather than looping", () => {
    const last = walked[walked.length - 1];
    expect(last.item).toBe(run.stimuli.length - 1);
    expect(last.phase).toBe("recalling");
    expect(advanceCursor(run, last)).toBeNull();
  });

  it("has no chunk grain anywhere in it", () => {
    // She may not chunk the way we cut, and a cursor that expects otherwise
    // scores her for disagreeing with our line breaks. The machine carries no
    // chunk position at all, so there is nothing to desync.
    for (const at of walked) {
      expect("chunk" in at).toBe(false);
    }
  });
});

describe("the clock", () => {
  it("gives a student with extra time more of it, not the standard goal", () => {
    // Grading her against the standard goal would score her accommodation as a
    // failure, which is the whole reason the goal is three numbers.
    //
    // Read off the content rather than written out, because what is being
    // checked here is that the right key is picked and turned into seconds. The
    // numbers themselves belong to the section, and the content fixture test is
    // where they are pinned.
    expect(goalSeconds(run, "standard")).toBe(pt105.time_goal_minutes.standard * 60);
    expect(goalSeconds(run, "accommodation_53")).toBeGreaterThan(goalSeconds(run, "standard"));
    expect(goalSeconds(run, "accommodation_70")).toBeGreaterThan(
      goalSeconds(run, "accommodation_53"),
    );
  });

  it("reads the clock the way someone glancing at it would", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9)).toBe("0:09");
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(20 * 60)).toBe("20:00");
    // A negative or fractional reading is a bug upstream, not something to show
    // her mid-section.
    expect(formatElapsed(-5)).toBe("0:00");
    expect(formatElapsed(61.9)).toBe("1:01");
  });
});
