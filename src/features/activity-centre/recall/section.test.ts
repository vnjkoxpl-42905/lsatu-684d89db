import { describe, expect, it } from "vitest";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import {
  advanceCursor,
  buildSectionRun,
  chunkStates,
  chunksDone,
  formatElapsed,
  goalSeconds,
  startCursor,
  type SectionCursor,
  type SectionRun,
} from "./section";

// The section machine, driven against real captured content rather than a
// fixture. Everything here is what one key press does, and it has to be right
// without a browser: she runs 20-odd minutes unbroken with no coach in the loop
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
  const cap = r.totalChunks * 2 + r.stimuli.length + 10;
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
    expect(run.totalChunks).toBe(
      pt105.items.reduce((n, i) => n + i.chunks.length, 0),
    );
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
    // A v1 item has chunks but no captured Read.
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

  it("alternates read and speak, chunk by chunk, and ends The Read on each stimulus", () => {
    for (const stimulus of run.stimuli) {
      const mine = walked.filter((c) => run.stimuli[c.item].slug === stimulus.slug);
      const shape = mine.map((c) => c.phase);
      const expected = [
        ...stimulus.chunks.flatMap(() => ["read", "speak"] as const),
        "the-read" as const,
      ];
      expect(shape, stimulus.slug).toEqual(expected);
    }
  });

  it("visits every chunk of every stimulus exactly once", () => {
    const reads = walked.filter((c) => c.phase === "read");
    expect(reads).toHaveLength(run.totalChunks);
    const keys = reads.map((c) => `${c.item}:${c.chunk}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("runs the stimuli in order and never goes back", () => {
    const order = walked.map((c) => c.item);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(run.stimuli.length);
  });

  it("ends after the last stimulus's Read rather than looping", () => {
    const last = walked[walked.length - 1];
    expect(last.item).toBe(run.stimuli.length - 1);
    expect(last.phase).toBe("the-read");
    expect(advanceCursor(run, last)).toBeNull();
  });

  it("has no cumulative round anywhere in it", () => {
    // Not an omission. The captured drill is read -> recall -> colour per chunk
    // and then The Read, which IS the synthesis; a cumulative round would be a
    // second one, and at roughly 48 seconds a stimulus it would not fit.
    expect(walked.every((c) => ["read", "speak", "the-read"].includes(c.phase))).toBe(true);
  });
});

describe("what is on screen", () => {
  it("shows every chunk of the stimulus from the first frame", () => {
    const states = chunkStates(run, startCursor());
    expect(states).toHaveLength(run.stimuli[0].chunks.length);
    // She can see how much is left against the clock without reading ahead.
    expect(states[0]).toBe("reading");
    expect(states.slice(1).every((s) => s === "upcoming")).toBe(true);
  });

  it("blanks the chunk she is recalling and leaves the rest alone", () => {
    const at: SectionCursor = { item: 0, chunk: 1, phase: "speak" };
    const states = chunkStates(run, at);
    expect(states[0]).toBe("done");
    expect(states[1]).toBe("speaking");
    expect(states.slice(2).every((s) => s === "upcoming")).toBe(true);
  });

  it("never blurs and blanks the same chunk", () => {
    // They mean different things: blurred is present but unreadable, blank is
    // read and now being said back. One state per chunk, always.
    for (const at of walk(run)) {
      const states = chunkStates(run, at);
      expect(states.filter((s) => s === "speaking").length).toBeLessThanOrEqual(1);
      expect(states.filter((s) => s === "reading").length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the chunk count fixed for a stimulus, so the layout cannot reflow", () => {
    for (const at of walk(run)) {
      expect(chunkStates(run, at)).toHaveLength(run.stimuli[at.item].chunks.length);
    }
  });

  it("brings the whole stimulus back sharp for The Read", () => {
    const at: SectionCursor = {
      item: 0,
      chunk: run.stimuli[0].chunks.length,
      phase: "the-read",
    };
    expect(chunkStates(run, at).every((s) => s === "done")).toBe(true);
  });
});

describe("progress and the clock", () => {
  it("counts a chunk once she has said it back, not once she has read it", () => {
    expect(chunksDone(run, startCursor())).toBe(0);
    expect(chunksDone(run, { item: 0, chunk: 0, phase: "speak" })).toBe(0);
    expect(chunksDone(run, { item: 0, chunk: 1, phase: "read" })).toBe(1);
  });

  it("never runs backwards and finishes at the section's total", () => {
    const walked = walk(run);
    const counts = walked.map((c) => chunksDone(run, c));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(counts[counts.length - 1]).toBe(run.totalChunks);
  });

  it("gives a student with extra time more of it, not the standard goal", () => {
    // Grading her against the standard goal would score her accommodation as a
    // failure, which is the whole reason the goal is three numbers.
    expect(goalSeconds(run, "standard")).toBe(20 * 60);
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
