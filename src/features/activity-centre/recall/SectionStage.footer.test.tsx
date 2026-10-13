import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionStage } from "./SectionStage";
import type { SectionStimulus } from "./section";

/*
 * The footer's right-hand slot was a ternary, so a microphone warning did not
 * sit beside the key hint -- it replaced it. On the one run where something has
 * already gone wrong, the only line telling her which key advances the drill
 * disappeared.
 */

const stimulus: SectionStimulus = {
  slug: "pt-134-s3-q07",
  chunks: [{ n: 1, text: "The maintenance logs do not establish what the curators assumed." }],
} as SectionStimulus;

function renderStage(error: string | null) {
  return render(
    <SectionStage
      stimulus={stimulus}
      phase="working"
      stimulusNumber={7}
      totalStimuli={26}
      error={error}
      elapsedSeconds={461}
    />,
  );
}

describe("the drill's footer under a fault", () => {
  it("keeps the key hint on screen while the warning is up", () => {
    renderStage("Nothing is reaching the microphone. Check it is not muted, then keep going.");
    expect(screen.getByText(/nothing is reaching the microphone/i)).toBeInTheDocument();
    expect(screen.getByText("space")).toBeInTheDocument();
    expect(screen.getByText(/recall full stimulus/i)).toBeInTheDocument();
  });

  it("shows the hint alone when there is no fault", () => {
    renderStage(null);
    expect(screen.getByText("space")).toBeInTheDocument();
    expect(screen.queryByText(/nothing is reaching the microphone/i)).toBeNull();
  });
});
