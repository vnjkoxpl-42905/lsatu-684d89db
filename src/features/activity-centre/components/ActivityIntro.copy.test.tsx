import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityIntro } from "./ActivityIntro";
import type { ActivityInstructions } from "../api/types";

/*
 * Three strings the door printed that the drill behind it does not honour.
 *
 * The library door promised a resumable sitting on a drill that is judged whole
 * (ADR 0023), and the briefing leaked its own emphasis markup at the student.
 * Both were visible on the trial run's very first screen.
 */

const instructions: ActivityInstructions = {
  tagline: "Say it back before you look again.",
  task: "Read the stimulus, then say it back without it in front of you.",
  rules: ["A section is run whole, or not at all."],
  answer_label: "Your recall",
};

const withBriefing: ActivityInstructions = {
  ...instructions,
  briefing: {
    lede: "The method in *four* moves.",
    sections: [
      {
        heading: "Say it in fewer words",
        body: [
          "Compression is the point of the drill.",
          "**Efficiency is never a licence to leave information out.**",
        ],
      },
    ],
    closer: "Then **run it**.",
  },
};

function renderIntro(props: Partial<React.ComponentProps<typeof ActivityIntro>> = {}) {
  return render(
    <ActivityIntro
      title="Read, Recall, Colour"
      subtitle="The section drill"
      instructions={instructions}
      itemCount={0}
      maxAttempts={2}
      onStart={vi.fn()}
      onExit={vi.fn()}
      {...props}
    />,
  );
}

describe("the library door's how-line", () => {
  it("does not promise a resumable sitting", () => {
    renderIntro({ format: "spoken-recall", mode: "section-library" });
    expect(screen.queryByText(/pick up where you left off/i)).toBeNull();
  });

  it("says the sitting is one go and marked at its end", () => {
    renderIntro({ format: "spoken-recall", mode: "section-library" });
    expect(screen.getByText(/one sitting/i)).toBeInTheDocument();
  });

  it("never opens on a stimulus count the door does not have", () => {
    renderIntro({ format: "spoken-recall", mode: "section-library" });
    expect(screen.queryByText(/^0 stimuli/i)).toBeNull();
  });

  it("still promises resuming on the v1 spoken drill, where it is true", () => {
    renderIntro({ format: "spoken-recall", mode: null, itemCount: 1 });
    expect(screen.getByText(/pick up where you left off/i)).toBeInTheDocument();
  });

  it("still counts the stimuli inside a real section", () => {
    renderIntro({ format: "spoken-recall", mode: "section", itemCount: 26 });
    expect(screen.getByText(/^26 stimuli/i)).toBeInTheDocument();
  });
});

describe("the briefing's authored marks", () => {
  it("renders bold rather than printing its asterisks", () => {
    renderIntro({ instructions: withBriefing });
    expect(
      screen.queryByText(/\*\*Efficiency is never a licence to leave information out\.\*\*/),
    ).toBeNull();
    expect(
      screen.getByText("Efficiency is never a licence to leave information out.").tagName,
    ).toBe("STRONG");
  });

  it("renders the lede's and the closer's marks too", () => {
    renderIntro({ instructions: withBriefing });
    expect(screen.getByText("four").tagName).toBe("EM");
    expect(screen.getByText("run it").tagName).toBe("STRONG");
  });

  it("leaves unmarked prose alone", () => {
    renderIntro({ instructions: withBriefing });
    expect(screen.getByText("Compression is the point of the drill.")).toBeInTheDocument();
  });
});
