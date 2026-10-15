import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionStage } from "./SectionStage";
import { NO_KEYBOARD_QUERY } from "./noKeyboard";
import type { SectionStimulus } from "./section";

/*
 * A phone could open the drill, read stimulus 1, and never reach stimulus 2.
 *
 * Advancing is bound to Space and to nothing else, which is the drill's whole
 * interaction on a laptop and is unreachable without a keyboard. Joshua's call
 * (2026-09-04) is that a phone is warned and let through rather than refused --
 * and "let through" is only honest if the run gives her a way to advance.
 *
 * Both halves are asserted here: the control exists where there is no keyboard,
 * and it does NOT exist where there is one, because the desktop loop is one key
 * with no mouse in it and that rule is not being traded away.
 */

const stimulus: SectionStimulus = {
  slug: "pt-134-s3-q07",
  chunks: [{ n: 1, text: "The maintenance logs do not establish what the curators assumed." }],
} as SectionStimulus;

/** Answer the pointer query one way, and every other query the way the suite does. */
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

function renderStage(onAdvance: () => void, countdown: number | null = null) {
  return render(
    <SectionStage
      stimulus={stimulus}
      phase="working"
      stimulusNumber={7}
      totalStimuli={26}
      elapsedSeconds={461}
      countdown={countdown}
      onAdvance={onAdvance}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("advancing where there is no keyboard", () => {
  it("gives a coarse pointer an on-screen way to advance", () => {
    setPointer(true);
    const onAdvance = vi.fn();
    renderStage(onAdvance);

    const control = screen.getByRole("button", { name: /recall full stimulus/i });
    fireEvent.click(control);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("draws no such control where a keyboard exists", () => {
    setPointer(false);
    renderStage(vi.fn());

    expect(screen.queryByRole("button", { name: /recall full stimulus/i })).toBeNull();
    // The key hint is still the whole of the controls on a laptop.
    expect(screen.getByText("space")).toBeInTheDocument();
  });

  it("does not name a key she has no way to press", () => {
    setPointer(true);
    const { container } = renderStage(vi.fn());
    // "space" rendered beside the on-screen button on a phone: an instruction
    // she cannot follow, sitting next to the one she can.
    expect(screen.queryByText("space")).toBeNull();
    // The sentence it prefixed is still there. Only the key went.
    expect(container.querySelector(".ac-section-hint")?.textContent).toMatch(
      /recall full stimulus/i,
    );
  });

  it("does not let her advance before the section has started", () => {
    setPointer(true);
    renderStage(vi.fn(), 3);

    // The beat is running: the recorder is open but nothing may be advanced
    // past yet, which is the same rule the hint states as "in a moment".
    expect(screen.getByRole("button", { name: /starting/i })).toBeDisabled();
  });

  it("says what it is waiting for when the microphone was refused", () => {
    setPointer(true);
    render(
      <SectionStage
        stimulus={stimulus}
        phase="working"
        stimulusNumber={7}
        totalStimuli={26}
        elapsedSeconds={0}
        countdown={3}
        micRefused
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /waiting for the microphone/i })).toBeDisabled();
  });

  it("names the next act rather than the key, once she is running", () => {
    setPointer(true);
    render(
      <SectionStage
        stimulus={stimulus}
        phase="recalling"
        stimulusNumber={7}
        totalStimuli={26}
        elapsedSeconds={500}
        onAdvance={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /next stimulus/i })).toBeInTheDocument();
  });
});
