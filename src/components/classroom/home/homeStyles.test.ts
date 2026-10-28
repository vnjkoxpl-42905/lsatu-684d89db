import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const css = postcss.parse(readFileSync("src/components/classroom/home/home.css", "utf8"));
describe("Home styles across input devices", () => {
  it("keeps hover queries outside base rules and populated", () => {
    css.walkAtRules("media", rule => {
      expect(rule.parent?.type).not.toBe("rule");
      expect(rule.nodes?.length).toBeGreaterThan(0);
    });
    css.walkRules(rule => expect(rule.parent?.type).not.toBe("rule"));
  });
  it("highlights today without requiring a mouse", () => {
    const today = css.nodes.filter(node => node.type === "rule" && node.selector === ".classroom-root .classroom-home-day-today");
    expect(today).toHaveLength(1);
  });
});
