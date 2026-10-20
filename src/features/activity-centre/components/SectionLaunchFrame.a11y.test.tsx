import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import instructionsJson from "../content/read-recall-colour-section.instructions.json";
import type { ActivityInstructions } from "../api/types";
import { SectionLaunchFrame } from "./SectionLaunchFrame";

/**
 * What the door owes a keyboard and a screen reader.
 *
 * Measured in the browser on 2026-09-09, the door announced its demonstration
 * on a loop, put that demonstration's Play button in front of the way out as
 * the first thing Tab reached, and ran a heading outline of H1, H3, H2. None
 * of that is visible in a screenshot and none of it was under test, so each
 * one is pinned here.
 */
const instructions = instructionsJson as unknown as ActivityInstructions;

function renderDoor(props: Partial<Parameters<typeof SectionLaunchFrame>[0]> = {}) {
  return render(
    <SectionLaunchFrame
      title="Read, Recall, Colour · PT105 Section 2"
      subtitle="Say it back."
      instructions={instructions}
      onExit={() => {}}
      {...props}
    >
      <div>the sections</div>
    </SectionLaunchFrame>,
  );
}

const LEVEL = (h: Element) => Number(h.tagName[1]);

describe("the door's outline, focus order and live regions", () => {
  it("starts at h1 and never skips a level on the way down", () => {
    const { container } = renderDoor();
    const levels = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(LEVEL);

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
    // Every section down the page owns a heading, not just an aria-label.
    expect(levels.filter((l) => l === 2).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the outline intact with the full instructions open", () => {
    const { container } = renderDoor();
    fireEvent.click(screen.getByRole("tab", { name: /full instructions/i }));

    const levels = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(LEVEL);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("never announces the demonstration, which turns over every few seconds", () => {
    const { container } = renderDoor();
    expect(container.querySelectorAll(".rd-demo [aria-live]")).toHaveLength(0);
  });

  it("puts the way out before the demonstration's Play button", () => {
    const { container } = renderDoor();
    const focusable = [...container.querySelectorAll<HTMLElement>("a[href],button,[tabindex]:not([tabindex='-1'])")];

    expect(focusable[0]).toHaveClass("sl-crumb-back");
    const play = focusable.findIndex((el) => el.classList.contains("rd-demo-play"));
    const exit = focusable.findIndex((el) => el.classList.contains("sl-crumb-back"));
    expect(play).toBeGreaterThan(exit);
  });

  it("holds every loop still until its surface is on screen", () => {
    // The IntersectionObserver stub in the test setup never reports a crossing,
    // which is exactly the off-screen case: nothing should be running.
    const { container } = renderDoor();
    expect(container.querySelector(".mw")).toHaveAttribute("data-still");
    expect(container.querySelector(".rd-demo")).toHaveAttribute("data-still");
    expect(container.querySelector(".rd-method")).toHaveAttribute("data-still");
  });
});
