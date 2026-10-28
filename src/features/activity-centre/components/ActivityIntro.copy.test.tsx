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
  tagline: "Tell it back before you look again.",
  task: "Read the stimulus, then tell it back without it in front of you.",
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

/*
 * The library door's three claims moved to `SectionLibraryLaunch.test.tsx` when
 * the door stopped being this component. What stays here is the pair that
 * proves the editorial intro still serves what it always served: the v1 spoken
 * drill, and a real section.
 */
describe("the how-line on the pages this component still draws", () => {
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

  it("renders the marks in a heading, a step and a demo beat too", () => {
    // These four slots printed their asterisks raw while the lede, the closer
    // and the body paragraphs did not. Authored emphasis is authored emphasis
    // wherever it lands.
    render(
      <ActivityIntro
        title="Dumb it Down"
        subtitle={null}
        instructions={{
          briefing: {
            sections: [
              {
                heading: "The **hard** part",
                body: ["plain"],
                steps: [{ label: "**Recite** it.", body: "Intake **only**." }],
                demo: { beats: [{ kind: "Read", text: "A **marked** beat." }] },
              },
            ],
          },
        }}
        onStart={() => {}}
      />,
    );
    for (const text of ["hard", "Recite", "only", "marked"]) {
      expect(screen.getByText(text).tagName).toBe("STRONG");
    }
    expect(document.body.textContent).not.toContain("**");
  });

  it("leaves unmarked prose alone", () => {
    renderIntro({ instructions: withBriefing });
    expect(screen.getByText("Compression is the point of the drill.")).toBeInTheDocument();
  });
});
