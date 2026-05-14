import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { BOOTCAMP_TOPICS, findTopic } from "../topicRegistry";

const EM_DASH = String.fromCharCode(0x2014);
const ROOT = resolve(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|md|json|css)$/.test(entry)) out.push(p);
  }
  return out;
}

describe("bootcamp topic registry", () => {
  it("has Abstract as a shipped topic", () => {
    const abstract = findTopic("abstract");
    expect(abstract).toBeDefined();
    expect(abstract?.name).toBe("Abstract");
    expect(abstract?.drills.length).toBe(5);
    expect(abstract?.chapterSections.length).toBe(3);
  });

  it("each topic's drill attemptMode strings are unique within the topic", () => {
    for (const t of BOOTCAMP_TOPICS) {
      const modes = t.drills.map((d) => d.attemptMode);
      expect(new Set(modes).size).toBe(modes.length);
    }
  });

  it("each topic has a positive flashcard total and section count", () => {
    for (const t of BOOTCAMP_TOPICS) {
      expect(t.flashcardTotal).toBeGreaterThan(0);
      expect(t.chapterSectionCount).toBeGreaterThan(0);
    }
  });
});

describe("teacher bootcamps voice invariants", () => {
  it("contains no em dashes in any committed source file", () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const text = readFileSync(f, "utf8");
      if (text.includes(EM_DASH)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
