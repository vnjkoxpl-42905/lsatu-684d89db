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

  it("gives the two buttons their own focus ring, not the world's", () => {
    // `.sl :focus-visible` sets one ring for the whole world and loses the
    // cascade on these two classes, so Start and Back matched :focus-visible
    // and computed outline-style: none. Measured in the browser, not inferred.
    expect(CSS).toContain(".sl .sl-start:focus-visible");
    expect(CSS).toContain(".sl .sl-brief:focus-visible");
    // The door draws both on a dark panel, where an ink ring is invisible.
    expect(CSS).toContain(".rd-hero .sl-start:focus-visible");
  });

  it("sways the grass in groups, not once per blade", () => {
    // 170 blades each carrying their own keyframe put 191 animations on the
    // compositor at rest, for a picture that is usually scrolled past.
    expect(CSS).not.toContain(".mw-blades path {");
    expect(CSS).toContain(".mw-blades g {");
    // Skew, not rotation: rotation about a shared origin lifts the far blades
    // off the ground line, and the planted base is the whole look.
    expect(CSS).toMatch(/@keyframes mw-sway\s*\{[^@]*skewX/);
  });

  it("stops every loop when its surface leaves the screen", () => {
    for (const sel of [".mw[data-still]", ".rd-demo[data-still]", ".rd-method[data-still]"]) {
      expect(CSS).toContain(sel);
    }
    expect(CSS).toContain("animation-play-state: paused");
  });

  it("promises the compositor nothing for the layer that never moves", () => {
    const grain = CSS.match(/\.mw-grain\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(grain).toMatch(/will-change:\s*auto/);
  });

  it("gives the demonstration an ink focus ring, not the hero's white one", () => {
    // .rd-hero :focus-visible is white for the dark panel. The demo card is
    // cream paper sitting on it, where white measured 1.05:1.
    expect(CSS).toContain(".rd-hero .rd-demo :focus-visible");
  });

  it("makes the three small controls pressable at 44px", () => {
    // Visual size is unchanged; the target is an overlay, the way the runner's
    // rail controls were done. Measured in the browser: 44x44, 73x47, 58x47.
    expect(CSS).toMatch(/\.rd-demo-play::after\s*\{[^}]*inset:\s*-8px/);
    expect(CSS).toMatch(/\.sl-crumb-back::after\s*\{[^}]*inset:\s*-14px -8px/);
    const tab = CSS.match(/\.sl-dr-tab\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(tab).toMatch(/padding:\s*10px 0 14px/);
  });

  it("keeps the way out above the hero copy", () => {
    // Same layer, and the copy comes later in the DOM, so on a phone it took
    // the bottom half of the crumb's target with it.
    const zIndexOf = (selector: string) => {
      const after = CSS.split(`${selector} {`)[1] ?? "";
      return Number(after.slice(0, after.indexOf("}")).match(/z-index:\s*(\d+)/)?.[1]);
    };
    expect(zIndexOf(".rd-hero-top")).toBeGreaterThan(zIndexOf(".rd-hero-copy"));
  });

  it("draws no text in flat white on the briefing page, which sits on cream", () => {
    // The hero classes are white for the door's dark panel. Any of them reused
    // on .sl-briefing-page must restate a colour.
    const scoped = [...CSS.matchAll(/\.sl-briefing-page\s+\.([a-z0-9-]+)\s*\{([^}]*)\}/g)];
    for (const [, cls, body] of scoped) {
      expect(`${cls}: ${body}`).not.toMatch(new RegExp(String.raw`color:\s*(#fff\b|var\(--rd-on-dark\))`, "i"));
    }
  });
});
