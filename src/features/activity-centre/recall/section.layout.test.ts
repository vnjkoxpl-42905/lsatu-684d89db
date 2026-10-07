import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * The footer carries the instruction, the presence bar and the microphone
 * error. On a 13-inch laptop it was 55px below the fold, because the card
 * asked for 700px of height inside a 664px viewport, so the one line that says
 * "Nothing is reaching the microphone" was on a part of the page she had no
 * reason to scroll to during a timed run.
 *
 * jsdom does no layout, so the rule itself is what is asserted. The invariant
 * is the same either way: the card's floor must be bounded by the viewport, and
 * the footer must not be the thing that gives way when it is.
 */

const css = readFileSync("src/features/activity-centre/recall/section.css", "utf8");

function block(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, `${selector} is not declared at the top level`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

describe("the section card at a short viewport", () => {
  it("bounds the card's floor by the viewport rather than a bare constant", () => {
    const paper = block(".ac-section-paper");
    expect(paper).toMatch(/min-height:\s*min\(/);
    expect(paper).toMatch(/100vh/);
    expect(paper).not.toMatch(/min-height:\s*\d+px\s*;/);
  });

  it("never lets the footer be the thing that shrinks", () => {
    expect(block(".ac-section-foot")).toMatch(/flex-shrink:\s*0/);
  });

  it("lets the reading area give way instead, and scroll rather than clip", () => {
    const body = block(".ac-section-body");
    expect(body).toMatch(/min-height:\s*0/);
    expect(body).toMatch(/overflow-y:\s*auto/);
  });

  it("answers a short viewport with a height query, not only a width one", () => {
    expect(css).toMatch(/@media\s*\(max-height:/);
  });
});
