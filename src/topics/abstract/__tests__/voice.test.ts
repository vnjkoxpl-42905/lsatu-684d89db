import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// AC #26 + #28: no em dashes anywhere; FABS and Trap Master rendered verbatim.
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

const files = walk(ROOT);

describe("voice and architecture invariants", () => {
  it("contains no em dashes in any committed source file", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      if (text.includes(EM_DASH)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("FABS appears verbatim in the chapter and the FABS reference card", () => {
    const chapter = readFileSync(join(ROOT, "content/chapter.md"), "utf8");
    const card = readFileSync(
      join(ROOT, "content/reference-cards/02-fabs-and-indicator-buckets.md"),
      "utf8",
    );
    expect(chapter).toContain("FABS");
    expect(card).toContain("FABS");
  });

  it("Trap Master appears verbatim in the chapter and the Trap Master card", () => {
    const chapter = readFileSync(join(ROOT, "content/chapter.md"), "utf8");
    const card = readFileSync(
      join(ROOT, "content/reference-cards/08-trap-master-catalog.md"),
      "utf8",
    );
    expect(chapter).toContain("Trap Master");
    expect(card).toContain("Trap Master");
  });
});
