import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityEditorialIntro as ActivityIntro } from "./ActivityEditorialIntro";
import type { ActivityInstructions } from "../api/types";

// The intro ends with its primary action, under the rules and the worked
// example. Measured at 1280x900, Start sat 1123px down an 1186px page: the one
// button the student came here to press was below the fold. The dock carries it
// until the real button is on screen, and must never compete with it.

const instructions: ActivityInstructions = {
  tagline: "Find the trigger word, and it tells you which side is which.",
  task: "Rephrase the statement as If [sufficient], then [necessary], in your own words.",
  rules: ["If, when, whenever: these mark the sufficient side."],
  answer_label: "Your rephrase",
};

let observed: Element | null = null;
let fire: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
const disconnect = vi.fn();

class FakeObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    fire = cb;
  }
  observe(node: Element) {
    observed = node;
  }
  disconnect = disconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn();
}

beforeEach(() => {
  observed = null;
  fire = null;
  disconnect.mockClear();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

function renderIntro(props: Partial<React.ComponentProps<typeof ActivityIntro>> = {}) {
  return render(
    <ActivityIntro
      title="Conditional Rephrase"
      subtitle="The Switchyard"
      instructions={instructions}
      itemCount={62}
      maxAttempts={2}
      onStart={vi.fn()}
      onExit={vi.fn()}
      {...props}
    />,
  );
}

const dock = () => screen.getByTestId("act-start-dock");
const reveal = (isIntersecting: boolean) => act(() => fire?.([{ isIntersecting }]));

describe("the Start dock", () => {
  it("carries the action while the real button is out of sight", () => {
    renderIntro();
    expect(dock()).toHaveAttribute("data-retired", "false");
    expect(dock()).toHaveAttribute("aria-hidden", "false");
  });

  it("watches the real Start button, not something else", () => {
    renderIntro();
    expect(observed).not.toBeNull();
    expect(observed).toHaveClass("act-start");
    expect((observed as HTMLElement).closest(".act-start-dock")).toBeNull();
  });

  it("retires the moment the real button comes into view", () => {
    renderIntro();
    reveal(true);
    expect(dock()).toHaveAttribute("data-retired", "true");
    expect(dock()).toHaveAttribute("aria-hidden", "true");
  });

  // Once the real button is on screen the dock is fully out of the way: not
  // focusable, not announced, not clickable. While it is live the real button
  // is simply further down the page, still in the tab order where it belongs.
  it("takes itself out of the tab order once the real button is on screen", () => {
    renderIntro();
    const reachable = () =>
      screen.getAllByRole("button", { name: /start/i }).filter((b) => b.tabIndex !== -1);
    expect(reachable()).toHaveLength(2);
    reveal(true);
    expect(reachable()).toHaveLength(1);
    expect(reachable()[0].closest(".act-start-dock")).toBeNull();
  });

  it("stops taking clicks once retired, so a stale tap cannot reach it", () => {
    renderIntro();
    reveal(true);
    expect(dock()).toHaveAttribute("aria-hidden", "true");
    expect(dock().className).toContain("act-start-dock");
  });

  it("comes back if the student scrolls away from the real button again", () => {
    renderIntro();
    reveal(true);
    reveal(false);
    expect(dock()).toHaveAttribute("data-retired", "false");
  });

  it("says which question it would return to on a resumed run", () => {
    renderIntro({ resumeAt: 24 });
    expect(screen.getAllByRole("button", { name: /back to question 24/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^start$/i })).not.toBeInTheDocument();
  });

  it("stops observing when the intro goes away", () => {
    const { unmount } = renderIntro();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("renders no dock at all where there is no observer to retire it", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    renderIntro();
    expect(screen.queryByTestId("act-start-dock")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^start$/i })).toHaveLength(1);
  });
});
