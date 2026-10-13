import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { RoleCall } from "./RoleCall";
import { LightTable } from "./LightTable";
import { buildLightTable, buildRoleCall } from "./rounds";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "find-the-conclusion")!;
const roleRound = buildRoleCall(drill.items);
const lightPages = buildLightTable(drill.items);

describe("building the rounds", () => {
  it("pairs each argument's conclusion with one of its supports, so the call is even", () => {
    const round = buildRoleCall(drill.items, 20);
    const crowns = round.filter((c) => c.isConclusion).length;
    expect(crowns).toBe(round.length - crowns);
  });

  it("does not let the answer run, which a student could ride", () => {
    const round = buildRoleCall(drill.items, 20);
    const answers = round.map((c) => c.isConclusion);
    for (let i = 0; i + 2 < answers.length; i += 1) {
      expect(new Set(answers.slice(i, i + 3)).size, `at ${i}`).toBeGreaterThan(1);
    }
  });

  it("only uses arguments whose conclusion can actually be pointed at", () => {
    // Every call's claim must come from its own argument's text.
    for (const c of roleRound) expect(c.argument).toContain(c.claim);
  });

  it("gives the light table at least two strips to choose between", () => {
    for (const p of lightPages) {
      expect(p.strips.length, `item ${p.order}`).toBeGreaterThanOrEqual(2);
      expect(p.strips.some((s) => s.n === p.answer)).toBe(true);
    }
  });

  it("only lifts HUD words the argument actually contains", () => {
    for (const p of lightPages) {
      const text = p.strips.map((s) => s.text).join(" ").toLowerCase();
      for (const w of p.hud) expect(text, `item ${p.order}: ${w}`).toContain(w);
    }
  });

  it("says so rather than inventing rounds when there is no bank", () => {
    expect(buildRoleCall([])).toEqual([]);
    expect(buildLightTable([])).toEqual([]);
  });
});

describe("Role Call", () => {
  it("shows the claim alone, since position would answer the question", () => {
    const call = roleRound[0];
    const { getByTestId, queryByTestId } = render(<RoleCall round={[call]} />);
    expect(getByTestId("at-role-claim").textContent).toContain(call.claim);
    expect(queryByTestId("at-role-verdict")).toBeNull();
  });

  it("credits calling the conclusion the conclusion", () => {
    const call = roleRound.find((c) => c.isConclusion)!;
    const { getByTestId } = render(<RoleCall round={[call]} />);
    fireEvent.click(getByTestId("at-role-conclusion"));
    expect(getByTestId("at-role-verdict").textContent).toContain("Called right");
  });

  it("names the truth when a support is called the conclusion", () => {
    const call = roleRound.find((c) => !c.isConclusion)!;
    const { getByTestId } = render(<RoleCall round={[call]} />);
    fireEvent.click(getByTestId("at-role-conclusion"));
    expect(getByTestId("at-role-verdict").textContent).toContain("It is support");
    expect(getByTestId("at-role-support").getAttribute("data-truth")).toBe("true");
  });

  it("shows the whole argument only after the call", () => {
    const call = roleRound[0];
    const { getByTestId, container } = render(<RoleCall round={[call]} />);
    expect(container.querySelector(".at-context")).toBeNull();
    fireEvent.click(getByTestId("at-role-support"));
    expect(container.querySelector(".at-context")?.textContent).toContain(call.argument);
  });

  it("will not take a second call", () => {
    const { getByTestId } = render(<RoleCall round={[roleRound[0]]} />);
    fireEvent.click(getByTestId("at-role-conclusion"));
    expect(getByTestId("at-role-support")).toBeDisabled();
  });

  it("says there is nothing to call rather than rendering an empty round", () => {
    const { getByTestId } = render(<RoleCall round={[]} />);
    expect(getByTestId("role-call-empty").textContent).toContain("nothing here to call");
  });
});

describe("The Light Table", () => {
  const page = lightPages.find((p) => p.hud.length > 0)!;

  it("keeps the HUD down until a tap has actually missed", () => {
    const { queryByTestId } = render(<LightTable pages={[page]} />);
    expect(queryByTestId("at-hud")).toBeNull();
  });

  it("raises the HUD after a wrong tap, carrying this argument's own words", () => {
    const wrong = page.strips.find((s) => s.n !== page.answer)!;
    const { getByTestId, getAllByTestId } = render(<LightTable pages={[page]} />);
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    expect(getByTestId("at-hud")).toBeTruthy();
    expect(getAllByTestId("at-hud-word").length).toBe(page.hud.length);
  });

  it("never raises an empty HUD", () => {
    const bare = { ...page, hud: [] };
    const wrong = bare.strips.find((s) => s.n !== bare.answer)!;
    const { getByTestId, queryByTestId } = render(<LightTable pages={[bare]} />);
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    expect(queryByTestId("at-hud")).toBeNull();
  });

  it("leaves a missed strip visible and marked rather than removing it", () => {
    const wrong = page.strips.find((s) => s.n !== page.answer)!;
    const { getByTestId } = render(<LightTable pages={[page]} />);
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    expect(getByTestId(`at-strip-${wrong.n}`).getAttribute("data-wrong")).toBe("true");
  });

  it("credits a first tap as a first tap", () => {
    const { getByTestId } = render(<LightTable pages={[page]} />);
    fireEvent.click(getByTestId(`at-strip-${page.answer}`));
    expect(getByTestId("at-light-verdict").textContent).toContain("First tap");
  });

  it("counts the misses when it took more than one", () => {
    const wrong = page.strips.find((s) => s.n !== page.answer)!;
    const { getByTestId } = render(<LightTable pages={[page]} />);
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    fireEvent.click(getByTestId(`at-strip-${page.answer}`));
    expect(getByTestId("at-light-verdict").textContent).toContain("Found it after 1");
  });

  it("does not count the same wrong strip twice", () => {
    const wrong = page.strips.find((s) => s.n !== page.answer)!;
    const { getByTestId } = render(<LightTable pages={[page]} />);
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    fireEvent.click(getByTestId(`at-strip-${wrong.n}`));
    fireEvent.click(getByTestId(`at-strip-${page.answer}`));
    expect(getByTestId("at-light-verdict").textContent).toContain("Found it after 1");
  });

  it("says there is nothing to tap rather than rendering an empty table", () => {
    const { getByTestId } = render(<LightTable pages={[]} />);
    expect(getByTestId("light-table-empty").textContent).toContain("nothing here to tap");
  });
});
