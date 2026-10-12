import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionStage } from "./SectionStage";
import { coachNote } from "./coach";
import { METHOD_STEPS } from "./method";
import type { SectionStimulus } from "./section";

/*
 * The walkthrough card, which the Activity Lab does not render and which is
 * therefore the one surface nobody was looking at. It is also the surface that
 * did the most damage: for three stimuli it told a first-timer to read out loud
 * when step 1 is silent, and to say what the sentence was doing in the argument
 * when a structural label is the one thing the judge will not accept as a
 * colour. She was coached into two faults and marked down for both.
 */

const stimulus: SectionStimulus = {
  slug: "pt-105-s2-q01",
  chunks: [{ n: 1, text: "The council's own survey contradicts the figure it published." }],
} as SectionStimulus;

function renderWithCoach(item: number, phase: "working" | "recalling") {
  const coach = coachNote(item, phase);
  if (!coach) throw new Error(`no walkthrough note for item ${item} in ${phase}`);
  return render(
    <SectionStage
      stimulus={stimulus}
      phase={phase}
      stimulusNumber={item + 1}
      totalStimuli={26}
      error={null}
      elapsedSeconds={12}
      coach={coach}
    />,
  );
}

describe("the first-run walkthrough", () => {
  it("states the four steps from the one place they are authored", () => {
    const { container } = renderWithCoach(0, "working");
    const items = [...container.querySelectorAll(".ac-section-coach-steps li")].map(
      (li) => li.textContent ?? "",
    );
    expect(items).toHaveLength(METHOD_STEPS.length);
    METHOD_STEPS.forEach((step, i) => {
      expect(items[i]).toContain(step.label);
      expect(items[i]).toContain(step.short);
    });
  });

  it("tells her step one is silent, which is what it used to get wrong", () => {
    const { container } = renderWithCoach(0, "working");
    const text = container.textContent ?? "";
    expect(text).toMatch(/silently/i);
    expect(text).not.toMatch(/out loud in pieces/i);
    expect(text).not.toMatch(/doing in the argument/i);
  });

  it("names the fourth step The Recall on every card that mentions it", () => {
    for (const item of [0, 1, 2]) {
      const { container, unmount } = renderWithCoach(item, "recalling");
      const text = container.textContent ?? "";
      expect(text, `recalling card ${item}`).toMatch(/The Recall/);
      expect(text, `recalling card ${item}`).not.toMatch(/\byour Read\b/i);
      unmount();
    }
  });

  it("carries no em dash, which Joshua never types", () => {
    for (const phase of ["working", "recalling"] as const) {
      for (const item of [0, 1, 2]) {
        const { container, unmount } = renderWithCoach(item, phase);
        expect(container.textContent ?? "", `${phase} ${item}`).not.toMatch(/[—–]/);
        unmount();
      }
    }
  });

  it("keeps the beat to the microphone, and the step names out of it", () => {
    render(
      <SectionStage
        stimulus={stimulus}
        phase="working"
        stimulusNumber={1}
        totalStimuli={26}
        error={null}
        elapsedSeconds={0}
        countdown={2}
      />,
    );
    // The instruction moved to the foot of the briefing. What is left is the
    // one thing only the beat can show her.
    expect(screen.getByText("Microphone on.")).toBeInTheDocument();
    expect(screen.getByText(/say something to check your microphone/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/given your Read/);
    expect(document.body.textContent).not.toMatch(/Space twice/);
  });
});
