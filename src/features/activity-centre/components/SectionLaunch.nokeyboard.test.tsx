import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionLaunch } from "./SectionLaunch";
import { NO_KEYBOARD_QUERY } from "../recall/noKeyboard";
import type { ActivityInstructions } from "../api/types";

/*
 * Nothing before the run said a keyboard was needed.
 *
 * The briefing, the door and the library all render fine at 390x844, so the
 * first thing that told her a phone could not do this was the drill failing to
 * advance -- by which point the recording was already running and the run was
 * already spoiled.
 *
 * Joshua's call, 2026-09-04: warn and let her through. So this asserts the
 * warning appears AND that it takes nothing away. A notice that quietly
 * disabled Start would be the refuse-at-the-door answer he did not pick.
 */

const instructions: ActivityInstructions = {
  tagline: "One section, out loud, in one take.",
} as ActivityInstructions;

function setPointer(coarse: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query === NO_KEYBOARD_QUERY ? coarse : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

function renderDoor() {
  return render(
    <SectionLaunch
      title="PT134 Section 3"
      subtitle={null}
      instructions={instructions}
      itemCount={26}
      timeGoalMinutes={25}
      sourceSection="PT134.S3"
      studentId={null}
      onStart={() => {}}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the door on a device with no keyboard", () => {
  it("says what the run needs before she starts it", () => {
    setPointer(true);
    renderDoor();
    expect(screen.getByText(/built for a laptop/i)).toBeInTheDocument();
  });

  it("warns without refusing: Start is still there and still enabled", () => {
    setPointer(true);
    renderDoor();
    const start = screen.getByRole("button", { name: /start the section/i });
    expect(start).toBeEnabled();
  });

  it("says nothing at all where there is a keyboard", () => {
    setPointer(false);
    renderDoor();
    expect(screen.queryByText(/built for a laptop/i)).toBeNull();
    expect(screen.getByRole("button", { name: /start the section/i })).toBeEnabled();
  });
});
