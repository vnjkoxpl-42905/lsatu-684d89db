import { describe, expect, it } from "vitest";
import readRecallColour from "./read-recall-colour.json";
import type { ActivityInstructions, RecallItem } from "../api/types";

// Read, Recall, Colour is the calibration fixture for the spoken-recall
// pipeline (spec: docs/specs/2026-08-29-read-recall-colour.md). Everything
// downstream is measured against these detail lists, so a silent malformation
// here would not show up as a bug, it would show up as a student being told she
// dropped a detail she said. The invariants are asserted rather than trusted.
//
// It is deliberately NOT in SEED_ACTIVITIES. That array is the seed migration's
// input and must stay exactly the seven Activities the migration inserts.

const activity = readRecallColour as unknown as {
  slug: string;
  title: string;
  subtitle: string;
  item_format: string;
  instructions: ActivityInstructions;
  items: RecallItem[];
};

const words = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** The longest run of words the response shares verbatim with the source. */
function longestSharedRun(response: string, source: string): number {
  const r = words(response);
  const s = words(source);
  const seen = new Set<string>();
  for (let n = 1; n <= s.length; n++) {
    for (let i = 0; i + n <= s.length; i++) seen.add(s.slice(i, i + n).join(" "));
  }
  let best = 0;
  for (let n = 1; n <= r.length; n++) {
    for (let i = 0; i + n <= r.length; i++) {
      if (seen.has(r.slice(i, i + n).join(" "))) best = Math.max(best, n);
    }
  }
  return best;
}

/** Share of the response's word pairs that appear verbatim in the source. */
function bigramOverlap(response: string, source: string): number {
  const r = words(response);
  const s = words(source);
  const pairs = new Set<string>();
  for (let i = 0; i + 2 <= s.length; i++) pairs.add(s.slice(i, i + 2).join(" "));
  let shared = 0;
  let total = 0;
  for (let i = 0; i + 2 <= r.length; i++) {
    total++;
    if (pairs.has(r.slice(i, i + 2).join(" "))) shared++;
  }
  return total === 0 ? 0 : shared / total;
}

describe("Read, Recall, Colour fixture", () => {
  it("is a spoken-recall Activity with a Coach brief of its own", () => {
    expect(activity.slug).toBe("read-recall-colour");
    expect(activity.item_format).toBe("spoken-recall");
    expect(activity.items.length).toBeGreaterThan(0);

    const coach = activity.instructions.coach;
    expect(coach).toBeDefined();
    expect(coach!.drill.trim()).not.toBe("");
    expect(coach!.rubric.length).toBeGreaterThanOrEqual(3);
    expect(coach!.partial_rule).toMatch(/partial/i);
  });

  it.each(readRecallColour.items.map((i) => [i.order, i] as const))(
    "item %s chunks reassemble the stimulus verbatim",
    (_order, raw) => {
      // The load-bearing invariant. She is scored against the chunk she was
      // shown, so a chunk that drifts from the stimulus by even a word is an
      // answer key for text nobody read.
      const item = raw as unknown as RecallItem;
      expect(item.chunks.map((c) => c.text).join(" ")).toBe(item.prompt);
    },
  );

  it.each(readRecallColour.items.map((i) => [i.order, i] as const))(
    "item %s chunks and details are densely numbered from 1 and non-empty",
    (_order, raw) => {
      const item = raw as unknown as RecallItem;
      expect(item.chunks.map((c) => c.n)).toEqual(item.chunks.map((_, n) => n + 1));

      for (const chunk of item.chunks) {
        expect(chunk.text.trim(), `chunk ${chunk.n}`).not.toBe("");
        expect(chunk.details.length, `chunk ${chunk.n} details`).toBeGreaterThanOrEqual(3);
        expect(chunk.details.map((d) => d.n)).toEqual(chunk.details.map((_, n) => n + 1));
        for (const detail of chunk.details) {
          expect(detail.text.trim(), `chunk ${chunk.n} detail ${detail.n}`).not.toBe("");
        }
      }
    },
  );

  it.each(readRecallColour.items.map((i) => [i.order, i] as const))(
    "item %s never combines two sentences into one chunk",
    (_order, raw) => {
      // Combining is the one chunking move the drill rules out outright: the
      // first sentence's details are what get lost when you do. Round down.
      const item = raw as unknown as RecallItem;
      for (const chunk of item.chunks) {
        const interior = chunk.text.slice(0, -1);
        expect(interior, `chunk ${chunk.n} holds a sentence break`).not.toMatch(/[.?!]\s/);
      }
    },
  );

  it.each(readRecallColour.items.map((i) => [i.order, i] as const))(
    "item %s cumulative rounds point at real chunks, in order",
    (_order, raw) => {
      const item = raw as unknown as RecallItem;
      const last = item.chunks.length;
      expect(item.cumulative_after.length).toBeGreaterThan(0);
      expect([...item.cumulative_after].sort((a, b) => a - b)).toEqual(item.cumulative_after);
      expect(new Set(item.cumulative_after).size).toBe(item.cumulative_after.length);
      for (const n of item.cumulative_after) {
        expect(n, "cumulative round after a chunk that does not exist").toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(last);
      }
      // The whole stimulus is always the last round. Without it the run never
      // asks for the full load, which is the part of the drill worth building.
      expect(item.cumulative_after).toContain(last);
    },
  );

  it.each(readRecallColour.items.map((i) => [i.order, i] as const))(
    "item %s reference recall passes the own-words rule it exists to model",
    (_order, raw) => {
      // Own-words is scored as verbatim overlap with the stimulus, where HIGH
      // overlap is the failure. A reference answer that quoted the stimulus
      // would be calibrating every downstream score against a bad example.
      const item = raw as unknown as RecallItem;
      expect(item.credited_answers).toHaveLength(1);
      const recall = item.credited_answers[0];
      expect(longestSharedRun(recall, item.prompt), "reference recall quotes the stimulus").toBeLessThanOrEqual(4);
      expect(bigramOverlap(recall, item.prompt)).toBeLessThanOrEqual(0.15);
    },
  );

  it("student-facing copy carries no em-dashes", () => {
    const studentFacing = [
      activity.title,
      activity.subtitle,
      activity.instructions.tagline ?? "",
      activity.instructions.task ?? "",
      ...(activity.instructions.rules ?? []),
      ...activity.items.map((i) => i.prompt),
      ...activity.items.flatMap((i) => i.credited_answers),
      ...activity.items.flatMap((i) => i.chunks.flatMap((c) => c.text)),
    ];
    for (const text of studentFacing) {
      expect(text, `"${text.slice(0, 60)}"`).not.toContain("—");
    }
  });

  it("student-facing copy avoids the internal name for how the pieces fit", () => {
    // "Framework" is the internal criterion name and is on the banned list for
    // anything a student reads.
    const studentFacing = [
      activity.instructions.tagline ?? "",
      activity.instructions.task ?? "",
      ...(activity.instructions.rules ?? []),
    ].join(" ");
    expect(studentFacing.toLowerCase()).not.toContain("framework");
  });
});
