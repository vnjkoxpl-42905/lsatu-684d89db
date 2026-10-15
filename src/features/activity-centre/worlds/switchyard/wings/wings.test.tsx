import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { SortingYard } from "./SortingYard";
import { TriggerGallery } from "./TriggerGallery";
import { buildGallery, buildSortingRound } from "./rounds";

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
const round = buildSortingRound(conditional.items, 3, 0);
const levers = buildGallery(conditional.items);

describe("the Sorting Yard", () => {
  it("asks for one call and credits the right track", () => {
    const { getByTestId } = render(<SortingYard round={round} />);
    // The first card is whichever clause this item presents first.
    const truth = round[0].swapped ? "then" : "if";
    fireEvent.click(getByTestId(`sy-route-${truth}`));
    expect(getByTestId("sy-sorting-verdict").textContent).toContain("Routed clean");
  });

  it("calls a derailment on a reversal and says where it belonged", () => {
    const { getByTestId } = render(<SortingYard round={round} />);
    const wrong = round[0].swapped ? "if" : "then";
    fireEvent.click(getByTestId(`sy-route-${wrong}`));
    const verdict = getByTestId("sy-sorting-verdict");
    expect(verdict.textContent).toContain("Derailment: reversed");
    expect(verdict.textContent).toContain(round[0].swapped ? "THEN" : "IF");
  });

  it("leaves the credited arrangement on the tracks after a miss", () => {
    const { getByTestId } = render(<SortingYard round={round} />);
    fireEvent.click(getByTestId(round[0].swapped ? "sy-route-if" : "sy-route-then"));
    expect(getByTestId("sy-slot-if").textContent?.trim()).toBe(round[0].ifText);
    expect(getByTestId("sy-slot-then").textContent?.trim()).toBe(round[0].thenText);
  });

  it("routes from the keyboard, which is the point of a rapid-fire wing", () => {
    const { getByTestId } = render(<SortingYard round={round} />);
    fireEvent.keyDown(getByTestId("sorting-yard"), {
      key: round[0].swapped ? "ArrowDown" : "ArrowUp",
    });
    expect(getByTestId("sy-sorting-verdict").textContent).toContain("Routed clean");
  });

  it("reports the real per-item results when the round ends", () => {
    const onComplete = vi.fn();
    const { getByTestId } = render(<SortingYard round={round} onComplete={onComplete} />);
    for (const it of round) {
      fireEvent.click(getByTestId(it.swapped ? "sy-route-then" : "sy-route-if"));
      fireEvent.click(getByTestId("sy-sorting-next"));
    }
    expect(onComplete).toHaveBeenCalledWith(
      round.map((it) => ({ order: it.order, verdict: "clean" })),
    );
  });

  it("counts the round honestly in the summary", () => {
    const { getByTestId, container } = render(<SortingYard round={round} />);
    for (const it of round) {
      // Miss every one on purpose.
      fireEvent.click(getByTestId(it.swapped ? "sy-route-if" : "sy-route-then"));
      fireEvent.click(getByTestId("sy-sorting-next"));
    }
    expect(container.textContent).toContain(`0 of ${round.length} routed clean`);
  });
});

describe("the Trigger Gallery", () => {
  it("puts the look-alike levers next to each other on the wall", () => {
    const { container } = render(<TriggerGallery levers={levers} />);
    const words = [...container.querySelectorAll('[data-testid^="sy-lever-"]')].map(
      (b) => (b as HTMLElement).dataset.testid,
    );
    const a = words.indexOf("sy-lever-only-if");
    const b = words.indexOf("sy-lever-the-only");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(Math.abs(a - b)).toBe(1);
  });

  it("shows no miss counts when no history was passed", () => {
    const { container } = render(<TriggerGallery levers={levers} />);
    expect(container.textContent).not.toContain("missed");
  });

  it("shows a real miss count when history is passed", () => {
    const { getByTestId } = render(<TriggerGallery levers={levers} misses={{ unless: 4 }} />);
    expect(getByTestId("sy-lever-unless").textContent).toContain("4 missed");
  });

  it("pulling a lever demands one call between the item's two clauses", () => {
    const { getByTestId, getAllByTestId } = render(<TriggerGallery levers={levers} />);
    fireEvent.click(getByTestId("sy-lever-unless"));
    const drill = getByTestId("sy-lever-drill");
    const choices = getAllByTestId("sy-choice");
    expect(choices).toHaveLength(2);
    expect(within(drill).getByText(/Which one is the necessary condition/)).toBeTruthy();
  });

  it("labels both clauses once the call is made, not only the one picked", () => {
    const { getByTestId, getAllByTestId } = render(<TriggerGallery levers={levers} />);
    fireEvent.click(getByTestId("sy-lever-unless"));
    fireEvent.click(getAllByTestId("sy-choice")[0]);
    const truths = getAllByTestId("sy-choice").map((c) => (c as HTMLElement).dataset.truth);
    expect(truths.sort()).toEqual(["necessary", "sufficient"]);
  });

  it("comes back to the wall when the lever's statements run out", () => {
    const single = levers.find((l) => l.prompts.length >= 1)!;
    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <TriggerGallery levers={[{ ...single, prompts: single.prompts.slice(0, 1) }]} />,
    );
    fireEvent.click(getByTestId(`sy-lever-${single.word.replace(/\s+/g, "-")}`));
    fireEvent.click(getAllByTestId("sy-choice")[0]);
    fireEvent.click(getByTestId("sy-lever-next"));
    fireEvent.click(getByTestId("sy-lever-back"));
    expect(queryByTestId("trigger-gallery")).toBeTruthy();
  });
});
