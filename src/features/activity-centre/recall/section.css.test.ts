import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The handover warms to the ground the card actually lands on.
 *
 * `.ac-section.is-finishing` copies a colour it cannot reference: the report
 * phase's ground is declared in `report-card.css`, scoped to elements the
 * runner is not inside. A copied value drifts silently, and this one already
 * had: the field warmed to the Activity Centre's cream while the card arrived
 * on a violet ground, so the ten seconds after twenty-five unbroken minutes
 * crossed three grounds instead of one.
 */
const HERE = __dirname;
const SECTION = fs.readFileSync(path.join(HERE, "section.css"), "utf8");
const REPORT_CARD = fs.readFileSync(path.join(HERE, "../components/report-card.css"), "utf8");

/** The `background:` of the first rule whose selector list contains `selector`. */
function backgroundOf(css: string, selector: string): string {
  const at = css.indexOf(selector);
  const open = css.indexOf("{", at);
  const body = css.slice(open, css.indexOf("}", open));
  return (body.match(/background:\s*([^;]+);/) ?? [])[1]?.trim() ?? "";
}

describe("the handover out of the drill room", () => {
  it("warms to the same colour the report phase paints", () => {
    const warmsTo = backgroundOf(SECTION, ".ac-section.is-finishing");
    const landsOn = backgroundOf(REPORT_CARD, ".rc-ground");
    expect(warmsTo).not.toBe("");
    expect(warmsTo).toBe(landsOn);
  });

  it("does not warm to the Activity Centre's cream, which nothing downstream paints", () => {
    expect(backgroundOf(SECTION, ".ac-section.is-finishing")).not.toMatch(/38\s+36%\s+93%/);
  });
});
