import { describe, expect, it } from "vitest";
import instructions from "./read-recall-colour-section.instructions.json";

/**
 * The house rules for student-facing copy, checked against the content itself.
 *
 * These rules already existed. They were enforced per component, so each new
 * surface started uncovered, and in one night three separate rules leaked
 * through the same new page: an em dash, "Three beats through the stimulus",
 * and a title the product does not have. The door's own guard could not have
 * caught the second one even in principle, because the door never renders the
 * written instructions.
 *
 * So the guard belongs to the words, not to whichever component draws them.
 * Every surface that renders this file is covered by this test, including the
 * ones not written yet.
 *
 * `coach` is deliberately exempt: it is the brief handed to the grader, not
 * copy a student reads, and it needs the precise internal vocabulary.
 */

/** Internal names, from the glossary in `../CONTEXT.md`. */
const INTERNAL =
  /\b(beat|beats|briefing|intake|phase|tab|tabs|card|cards|chunk|chunks)\b/i;

/** Retired names the product has moved off. */
const RETIRED = /\b(say it back|the read\b|reading recall|CLIR|quip)\b/i;

function walk(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => walk(v, `${path}/${i}`));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => walk(v, `${path}/${k}`));
  }
  return [];
}

const studentFacing = walk(instructions).filter(([p]) => !p.startsWith("/coach"));

describe("the Read, Recall, Colour instructions, as a student reads them", () => {
  it("has copy to check", () => {
    // Guards the guard: a walk that silently returned nothing would pass
    // every assertion below and prove nothing.
    expect(studentFacing.length).toBeGreaterThan(20);
  });

  it("carries no em dash or en dash, which Joshua never types", () => {
    const bad = studentFacing.filter(([, v]) => /[—–]/.test(v));
    expect(bad.map(([p, v]) => `${p}: ${v}`)).toEqual([]);
  });

  it("uses no internal writing-room vocabulary", () => {
    // "Beat" is the code name for one of the four method steps. Students see
    // "step". "Chunk" is the authored cut of a stimulus; students see "piece".
    const bad = studentFacing.filter(([, v]) => INTERNAL.test(v));
    expect(bad.map(([p, v]) => `${p}: ${v.slice(0, 70)}`)).toEqual([]);
  });

  it("uses no retired step names", () => {
    // Step two is "Tell it back", never "say it back". Step four is "The
    // Recall"; "The Read" was its former name and collided with step one.
    const bad = studentFacing.filter(([, v]) => RETIRED.test(v));
    expect(bad.map(([p, v]) => `${p}: ${v.slice(0, 70)}`)).toEqual([]);
  });

  it("names the drill correctly wherever it names it at all", () => {
    const bad = studentFacing.filter(([, v]) => /Recall Rephrase Colour/i.test(v));
    expect(bad).toEqual([]);
  });
});
