import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionStage } from "./SectionStage";
import type { SectionStimulus } from "./section";

/*
 * What the drill room owed a keyboard, and did not pay.
 *
 * The confirm carried `aria-modal="true"` and none of what that attribute
 * promises: Escape did nothing, and three Tabs put focus on the Pause button
 * behind it, where Space still advanced the drill underneath a dialog asking
 * whether to throw twenty-five minutes away. The screen also had no heading of
 * any kind, so a screen reader's heading list was empty on the one page a
 * student spends half an hour inside.
 */

const stimulus: SectionStimulus = {
  slug: "pt-105-s2-q01",
  chunks: [{ n: 1, text: "The council's own survey contradicts the figure it published." }],
} as SectionStimulus;

function renderStage(over: Partial<Parameters<typeof SectionStage>[0]> = {}) {
  return render(
    <SectionStage
      stimulus={stimulus}
      phase="working"
      stimulusNumber={7}
      totalStimuli={26}
      error={null}
      elapsedSeconds={461}
      sectionName="PT105.S2"
      goalSeconds={25 * 60}
      {...over}
    />,
  );
}

describe("the drill room's heading", () => {
  it("names the drill and the section, for a heading list that was empty", () => {
    renderStage();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Read, Recall, Colour, PT105.S2");
  });

  it("still says something when the section has no name", () => {
    renderStage({ sectionName: undefined });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Read, Recall, Colour");
  });
});

describe("the clock", () => {
  it("shows the goal it is counting against", () => {
    const { container } = renderStage();
    // The elapsed figure reads first; the goal sits after it in lighter type.
    // `.ac-section-clock i` was styled for this when the clock shipped and
    // nothing ever rendered it, so she paced against a target she could not see.
    const clock = container.querySelector(".ac-section-clock");
    expect(clock?.textContent).toBe("7:41 of 25:00");
  });

  it("draws no goal when there is none to draw", () => {
    const { container } = renderStage({ goalSeconds: undefined });
    expect(container.querySelector(".ac-section-clock")?.textContent).toBe("7:41");
    expect(container.querySelector(".ac-section-clock i")).toBeNull();
  });
});

describe("the leave confirmation", () => {
  const confirming = (onCancelExit: () => void) =>
    renderStage({
      onExit: vi.fn(),
      confirmingExit: true,
      onConfirmExit: vi.fn(),
      onCancelExit,
    });

  it("closes on Escape, and Escape means keep going", () => {
    const onCancelExit = vi.fn();
    const onConfirmExit = vi.fn();
    renderStage({
      onExit: vi.fn(),
      confirmingExit: true,
      onConfirmExit,
      onCancelExit,
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancelExit).toHaveBeenCalled();
    // A reflex keypress must never be the thing that throws the run away.
    expect(onConfirmExit).not.toHaveBeenCalled();
  });

  it("keeps Tab inside itself", () => {
    const { container } = confirming(vi.fn());
    const dialog = container.querySelector(".ac-section-confirm") as HTMLElement;
    const stops = [...dialog.querySelectorAll("button")];
    expect(stops).toHaveLength(2);

    stops[stops.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(stops[0]);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("pulls focus back when it has escaped the dialog", () => {
    const { container } = confirming(vi.fn());
    const dialog = container.querySelector(".ac-section-confirm") as HTMLElement;
    const outside = container.querySelector(".ac-section-exit") as HTMLElement;
    outside.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("takes the rest of the screen out of the tree while it is up", () => {
    const { container } = confirming(vi.fn());
    expect(container.querySelector("header")?.hasAttribute("inert")).toBe(true);
    expect(container.querySelector("main")?.hasAttribute("inert")).toBe(true);
  });

  it("leaves the screen alone when it is not up", () => {
    const { container } = renderStage({ onExit: vi.fn() });
    expect(container.querySelector("header")?.hasAttribute("inert")).toBe(false);
    expect(container.querySelector("main")?.hasAttribute("inert")).toBe(false);
  });
});
