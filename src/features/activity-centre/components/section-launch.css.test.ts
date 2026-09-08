import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS = fs.readFileSync(path.join(__dirname, "section-launch.css"), "utf8");

/**
 * A `var(--name)` whose custom property is never defined does not fail loudly.
 * It falls back, or it inherits, and the result is text nobody can read that no
 * test notices. `--rd-ink-soft` did exactly that here: two rules asked for it,
 * it had never been declared, and the section headings quietly rendered fainter
 * than the body copy underneath them.
 *
 * CLAUDE.md carries the same warning from an earlier round, where three token
 * names shipped undefined for five months and removed the focus ring from every
 * shared Button.
 */
describe("section-launch.css", () => {
  const defined = new Set([...CSS.matchAll(/(--rd-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = [...CSS.matchAll(/var\((--rd-[a-z0-9-]+)/g)].map((m) => m[1]);

  it("defines every --rd- token it uses", () => {
    const missing = [...new Set(used)].filter((n) => !defined.has(n));
    expect(missing).toEqual([]);
  });

  it("draws no text in flat white on the briefing page, which sits on cream", () => {
    // The hero classes are white for the door's dark panel. Any of them reused
    // on .sl-briefing-page must restate a colour.
    const scoped = [...CSS.matchAll(/\.sl-briefing-page\s+\.([a-z0-9-]+)\s*\{([^}]*)\}/g)];
    for (const [, cls, body] of scoped) {
      expect(`${cls}: ${body}`).not.toMatch(/color:\s*#fff\b/i);
    }
  });
});
