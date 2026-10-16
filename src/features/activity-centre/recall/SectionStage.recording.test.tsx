import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionStage } from "./SectionStage";
import type { SectionStimulus } from "./section";

/*
 * The one thing she asked to be able to see mid-run: that it is recording.
 * A word in the rail, not only a red dot, so it survives grayscale and a
 * screen reader. Absent, not merely hidden, when nothing is being recorded.
 */

const stimulus: SectionStimulus = {
  slug: "pt-134-s3-q07",
  chunks: [{ n: 1, text: "The maintenance logs do not establish what the curators assumed." }],
} as SectionStimulus;

function renderStage(recording: boolean) {
  return render(
    <SectionStage
      stimulus={stimulus}
      phase="working"
      stimulusNumber={7}
      totalStimuli={26}
      error={null}
      elapsedSeconds={461}
      recording={recording}
    />,
  );
}

describe("the recording mark in the rail", () => {
  it("says Recording, in words, while the microphone is open", () => {
    renderStage(true);
    const mark = document.querySelector(".ac-section-rec");
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute("role")).toBe("status");
    expect(mark?.textContent).toMatch(/recording/i);
  });

  it("says nothing when nothing is being recorded", () => {
    renderStage(false);
    expect(screen.queryByText(/^recording$/i)).toBeNull();
  });
});
