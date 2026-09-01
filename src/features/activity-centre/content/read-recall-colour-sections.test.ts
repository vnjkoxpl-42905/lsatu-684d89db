import { describe, expect, it } from "vitest";
import pt102 from "./read-recall-colour-pt102-s3.json";
import pt105 from "./read-recall-colour-pt105-s2.json";
import pt134 from "./read-recall-colour-pt134-s3.json";
import type { ActivityMode, RecallSectionItem, TimeGoalMinutes } from "../api/types";

// The captured sections (spec: docs/specs/2026-08-31-rrc-section-mode.md). Each
// is a whole LR section she runs unbroken against the clock, so these files are
// the answer key for roughly twenty minutes of unbroken work with no coach in
// the loop to catch a malformation on the way past. A drifted chunk here does
// not read as a bug; it reads as the student being told she dropped a detail
// she said.
//
// The base Activity's own fixture test stays where it is. This file asserts
// only what is true of a SECTION, which is deliberately not the same set: a
// section has no cumulative round and no reference retelling, so the invariants
// that exist to protect those would fail here for the right reason.

type Section = {
  slug: string;
  title: string;
  subtitle: string;
  item_format: string;
  mode: ActivityMode;
  time_goal_minutes: TimeGoalMinutes;
  source_section: string;
  instructions: Record<string, unknown>;
  items: RecallSectionItem[];
};

/** Collapse every run of whitespace, the way the build's own check does. */
const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * Periods that do not end a sentence. A dialogue stimulus is full of them and
 * an unguarded rule reads "AutoFaber Inc. are planning" as two sentences.
 */
const ABBREVIATION = /(?:Inc|Ltd|Co|Corp|Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e|U\.S|No)\.$/;

const SECTIONS: [string, Section][] = [
  ["PT102.S3", pt102 as unknown as Section],
  ["PT105.S2", pt105 as unknown as Section],
  ["PT134.S3", pt134 as unknown as Section],
];

describe.each(SECTIONS)("%s", (citation, section) => {
  it("is a spoken-recall Activity in section mode, carrying its own clock", () => {
    expect(section.item_format).toBe("spoken-recall");
    expect(section.mode).toBe("section");
    expect(section.source_section).toBe(citation);
    expect(section.slug).toBe(`read-recall-colour-${citation.toLowerCase().replace(".", "-")}`);
    expect(section.items.length).toBeGreaterThan(0);

    // Time is a scored criterion, so the goal cannot be one number: a student
    // with extra time is not slow when she takes longer, and one goal would
    // score her accommodation as a failure.
    //
    // The source method states its own goals precisely, and they are 20 / 25 /
    // 30. We ship 25 / 38 / 50 instead: 25 for a standard 35-minute section,
    // and each accommodated goal scaled by that accommodation's own multiplier,
    // 53/35 and 70/35. The source's numbers do not scale -- they hand a student
    // with double the time a goal only half again as long -- so an accommodated
    // run was being measured against a tighter standard than a standard one.
    const { standard, accommodation_53, accommodation_70 } = section.time_goal_minutes;
    expect(standard).toBe(25);
    expect(accommodation_53).toBe(Math.round((standard * 53) / 35));
    expect(accommodation_70).toBe(Math.round((standard * 70) / 35));
  });

  it("leaves instructions to the base Activity", () => {
    // The rules are authored once and copied in by the seed builder. A section
    // that carried its own copy would drift from the other two silently.
    expect(Object.keys(section.instructions)).toEqual([]);
  });

  it("numbers its items densely from 1 and names each one once", () => {
    expect(section.items.map((i) => i.order)).toEqual(section.items.map((_, n) => n + 1));
    expect(new Set(section.items.map((i) => i.slug)).size).toBe(section.items.length);
  });

  it.each(SECTIONS.length ? section.items.map((i) => [i.order, i] as const) : [])(
    "item %s chunks reassemble the stimulus verbatim",
    (_order, item) => {
      // The load-bearing invariant. She is scored against the chunk she was
      // shown, so a chunk that drifts by a word is an answer key for text
      // nobody read.
      //
      // Compared with whitespace flattened, which is what the build asserts
      // too: a dialogue stimulus carries a newline between speakers and the
      // chunks do not, so only the words are the claim being made here.
      expect(flat(item.chunks.map((c) => c.text).join(" "))).toBe(flat(item.prompt));
    },
  );

  it.each(section.items.map((i) => [i.order, i] as const))(
    "item %s chunks and details are densely numbered, non-empty, and 3 to 8 deep",
    (_order, item) => {
      expect(item.chunks.map((c) => c.n)).toEqual(item.chunks.map((_, n) => n + 1));
      for (const chunk of item.chunks) {
        expect(chunk.text.trim(), `chunk ${chunk.n}`).not.toBe("");
        expect(chunk.details.length, `chunk ${chunk.n} details`).toBeGreaterThanOrEqual(3);
        expect(chunk.details.length, `chunk ${chunk.n} details`).toBeLessThanOrEqual(8);
        expect(chunk.details.map((d) => d.n)).toEqual(chunk.details.map((_, n) => n + 1));
        for (const detail of chunk.details) {
          expect(detail.text.trim(), `chunk ${chunk.n} detail ${detail.n}`).not.toBe("");
        }
        // Duplicates are the failure mode that inflates a completeness score
        // without adding anything to recall.
        const texts = chunk.details.map((d) => d.text.trim().toLowerCase());
        expect(new Set(texts).size, `chunk ${chunk.n} repeats a detail`).toBe(texts.length);
      }
    },
  );

  it.each(section.items.map((i) => [i.order, i] as const))(
    "item %s never combines two sentences into one chunk",
    (_order, item) => {
      // Combining is the one chunking move the drill rules out outright: the
      // first sentence's details are what get lost when you do. This caught a
      // real one -- "the lessons of World War I. But what are they?" arrived as
      // one chunk, because the splitter read the "I" as somebody's initial.
      for (const chunk of item.chunks) {
        const interior = chunk.text.slice(0, -1);
        for (const m of interior.matchAll(/[.?!]\s+/g)) {
          const before = interior.slice(0, m.index + m[0].length).trimEnd();
          const after = interior.slice(m.index + m[0].length);
          if (ABBREVIATION.test(before)) continue;
          if (after[0] !== after[0]?.toUpperCase()) continue;
          expect.fail(`chunk ${chunk.n} holds a sentence break: ${chunk.text}`);
        }
      }
    },
  );

  it.each(section.items.map((i) => [i.order, i] as const))(
    "item %s carries the captured Read, its recording and its questions",
    (_order, item) => {
      expect(item.the_read.trim()).not.toBe("");
      expect(["L", "I", "C", "R"]).toContain(item.the_read_type);
      // Named from the item's own slug: the play button in her review resolves
      // the path, so a mismatch is a control that does nothing.
      expect(item.model_recording).toBe(`audio/${item.slug}.mp3`);
      expect(item.model_transcript).toBe(`transcripts/${item.slug}.txt`);
      expect(item.questions.length).toBeGreaterThan(0);
      for (const q of item.questions) {
        expect(q.citation.startsWith(citation), q.citation).toBe(true);
        expect(q.correct_answer).toMatch(/^[A-E]$/);
      }
    },
  );

  it.each(section.items.map((i) => [i.order, i] as const))(
    "item %s has no cumulative round and no reference retelling",
    (_order, item) => {
      // Both empty by design, not by omission: the captured drill is read ->
      // recall -> colour per chunk and then The Read, which IS the synthesis.
      // A cumulative round would be a second one, and at roughly 48 seconds a
      // stimulus it would not fit regardless.
      expect(item.cumulative_after).toEqual([]);
      expect(item.credited_answers).toEqual([]);
    },
  );

  it("shares a stimulus rather than repeating it", () => {
    // Two questions can hang off one stimulus, and the drill's unit is the
    // stimulus, so she recalls it once. A section where every question got its
    // own item would make her recall the same text twice.
    const prompts = section.items.map((i) => i.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
    const questions = section.items.reduce((n, i) => n + i.questions.length, 0);
    expect(questions).toBeGreaterThanOrEqual(section.items.length);
  });

  it("carries no em-dash in anything written for her", () => {
    // The em-dash ban is a rule about what we write, and a stimulus is not
    // ours: `prompt` and every chunk are lifted verbatim from a real LR
    // section, must reassemble it exactly, and carry that section's own
    // punctuation. Editing one to satisfy a house style would change the text
    // she is scored against. So the ban applies to everything around it.
    const written = [
      section.title,
      section.subtitle,
      ...section.items.flatMap((i) => i.chunks.flatMap((c) => c.details.map((d) => d.text))),
      ...section.items.map((i) => i.explanation),
      ...section.items.flatMap((i) => i.questions.map((q) => q.question_type)),
    ];
    for (const text of written) {
      expect(text, `"${text.slice(0, 60)}"`).not.toContain("—");
    }
  });

  it("shows her none of the captured vocabulary, stimulus text included", () => {
    // The one source tag that carries an outside brand name is mapped to
    // "Gap Flaw" by the build. If the raw name survives anywhere she can read,
    // the map was skipped. Checked over the stimulus too: exempting it from the
    // em-dash rule is about punctuation we may not edit, not a general licence.
    const everything = [
      section.title,
      section.subtitle,
      ...section.items.map((i) => i.prompt),
      ...section.items.map((i) => i.the_read),
      ...section.items.flatMap((i) => i.chunks.map((c) => c.text)),
      ...section.items.flatMap((i) => i.chunks.flatMap((c) => c.details.map((d) => d.text))),
      ...section.items.map((i) => i.explanation),
      ...section.items.flatMap((i) => i.questions.map((q) => q.question_type)),
    ];
    for (const text of everything) {
      expect(text.toLowerCase(), `"${text.slice(0, 60)}"`).not.toContain("loophole");
    }
  });
});
