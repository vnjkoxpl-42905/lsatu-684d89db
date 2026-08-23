import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { SwitchyardStage } from "./SwitchyardStage";
import { indicatorOf, parseRouting } from "./routing";

// The yard's teaching claim is that the contrapositive is one machine movement,
// not a second fact: the capsules swap tracks and their polarity inverts in the
// same turn. These assert the settled DOM for each phase, which is where that
// claim actually lives. Motion timing is not asserted here; it cannot be, and
// pretending otherwise would be worse than saying so.

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;

/**
 * Items are addressed by their own words, never by position. The bank is
 * ordered as a difficulty ladder and gets re-ordered when the teaching sequence
 * changes; a test that says "item 9 is the unless one" silently starts
 * asserting about a different sentence the day the ladder moves.
 */
function itemStarting(prefix: string) {
  const item = conditional.items.find((i) => i.prompt.startsWith(prefix));
  if (!item) throw new Error(`no Conditional Rephrase item starting "${prefix}"`);
  return item;
}

function stageFor(item: (typeof conditional.items)[number], phase: "arrival" | "routed" | "flipped") {
  const routing = parseRouting(item.credited_answers[0])!;
  const utils = render(
    <SwitchyardStage
      statement={item.prompt}
      routing={routing}
      contrapositive={item.credited_answers[1]}
      indicator={indicatorOf(item.explanation)}
      phase={phase}
    />,
  );
  return { ...utils, item, routing };
}

function capsuleTexts(container: HTMLElement) {
  return [...container.querySelectorAll('[data-testid="sy-capsule"]')].map((c) =>
    c.textContent?.trim(),
  );
}

function lampStates(container: HTMLElement) {
  return [...container.querySelectorAll('[data-testid="sy-lamp"]')].map(
    (l) => (l as HTMLElement).dataset.lit,
  );
}

const WHENEVER = itemStarting("Whenever the greenhouse fans");
const UNLESS = itemStarting("Unless the generator is refueled");

describe("the yard at arrival", () => {
  it("does not light the indicator, so nothing hints before the student commits", () => {
    const { container } = stageFor(WHENEVER, "arrival");
    expect(container.querySelector(".sy-indicator")).toBeNull();
    expect(screen.getByText(/Awaiting/i)).toBeTruthy();
  });

  it("leaves both rails dead", () => {
    const { container } = stageFor(WHENEVER, "arrival");
    const rails = [...container.querySelectorAll(".sy-rail")] as HTMLElement[];
    expect(rails.map((r) => r.dataset.live)).toEqual(["false", "false"]);
  });
});

describe("the yard once routed", () => {
  it("couples the sufficient clause onto IF and the necessary clause onto THEN", () => {
    const { container, routing } = stageFor(WHENEVER, "routed");
    expect(capsuleTexts(container)).toEqual([routing.ifClause.text, routing.thenClause.text]);
  });

  it("lights the indicator on the board only now", () => {
    const { container } = stageFor(WHENEVER, "routed");
    expect(container.querySelector(".sy-indicator")?.textContent).toBe("Whenever");
  });

  it("lights the polarity lamp on a negated clause and leaves the other dark", () => {
    // The unless item: "If the generator is NOT refueled by dusk, then..."
    const { container } = stageFor(UNLESS, "routed");
    expect(lampStates(container)).toEqual(["true", "false"]);
  });

  it("leaves the junction untouched until the flip", () => {
    const { container } = stageFor(WHENEVER, "routed");
    expect((container.querySelector(".sy-junction") as HTMLElement).dataset.turned).toBe("false");
  });
});

describe("the flip", () => {
  it("swaps the capsules onto each other's tracks", () => {
    const { container, routing } = stageFor(WHENEVER, "flipped");
    expect(capsuleTexts(container)).toEqual([routing.thenClause.text, routing.ifClause.text]);
  });

  it("inverts both polarities in the same movement", () => {
    const before = stageFor(WHENEVER, "routed");
    const beforeLamps = lampStates(before.container);
    before.unmount();

    const after = stageFor(WHENEVER, "flipped");
    expect(lampStates(after.container)).toEqual(beforeLamps.map((l) => String(l !== "true")));
  });

  it("turns the junction", () => {
    const { container } = stageFor(WHENEVER, "flipped");
    expect((container.querySelector(".sy-junction") as HTMLElement).dataset.turned).toBe("true");
  });

  it("shows the authored contrapositive on its plate, not a derived sentence", () => {
    const { container, item } = stageFor(UNLESS, "flipped");
    const plate = container.querySelector('[data-testid="sy-plate-contrapositive"]')!;
    expect(within(plate as HTMLElement).getByText(item.credited_answers[1])).toBeTruthy();
    expect(plate.getAttribute("aria-hidden")).toBeNull();
  });

  it("hides the contrapositive plate from assistive tech until it is earned", () => {
    const { container } = stageFor(UNLESS, "routed");
    const plate = container.querySelector('[data-testid="sy-plate-contrapositive"]')!;
    expect(plate.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("every item in the bank can run through the yard", () => {
  it("renders all three phases for all 62 items with both capsules present", () => {
    for (const item of conditional.items) {
      const routing = parseRouting(item.credited_answers[0])!;
      for (const phase of ["arrival", "routed", "flipped"] as const) {
        const { container, unmount } = render(
          <SwitchyardStage
            statement={item.prompt}
            routing={routing}
            contrapositive={item.credited_answers[1]}
            indicator={indicatorOf(item.explanation)}
            phase={phase}
          />,
        );
        expect(capsuleTexts(container).filter(Boolean).length, `item ${item.order} ${phase}`).toBe(2);
        unmount();
      }
    }
  });
});
