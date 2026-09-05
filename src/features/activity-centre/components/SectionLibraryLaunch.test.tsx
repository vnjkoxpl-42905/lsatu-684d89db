import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionLibraryLaunch } from "./SectionLibraryLaunch";
import type { ActivityInstructions } from "../api/types";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";

/**
 * The door to the whole drill, and what it must not say.
 *
 * These three claims were asserted against the editorial intro until the door
 * stopped being that page. They are about the door, not about which component
 * happens to draw it, so they moved here with it.
 */
const instructions = {
  tagline: "Read it, tell it back, react to it.",
  task: "Work through the stimulus out loud.",
  rules: ["Everything here is out loud."],
  briefing: {
    lede: "The drill in one line.",
    sections: [
      {
        heading: "What you actually do.",
        body: [],
        steps: [
          { label: "Read it.", body: "Intake only." },
          { label: "Tell it back.", body: "Look away and tell it." },
        ],
      },
    ],
  },
} as unknown as ActivityInstructions;

function renderDoor() {
  return render(
    <SectionLibraryLaunch
      title="Read, Recall, Colour"
      subtitle={null}
      instructions={instructions}
    >
      <p>the sections go here</p>
    </SectionLibraryLaunch>,
  );
}

describe("the library door", () => {
  it("does not promise a resumable sitting", () => {
    renderDoor();
    expect(screen.queryByText(/pick up where you left off/i)).toBeNull();
  });

  it("says the sitting is one go", () => {
    renderDoor();
    expect(screen.getByText(/one take/i)).toBeInTheDocument();
  });

  it("never opens on a stimulus count the door does not have", () => {
    renderDoor();
    expect(screen.queryByText(/stimuli/i)).toBeNull();
  });

  it("carries the same four beats as the section's own page", () => {
    renderDoor();
    expect(screen.getByRole("tab", { name: /Read it/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Tell it back/ })).toBeInTheDocument();
  });

  it("shows no stat strip, because trend and target are per section", () => {
    renderDoor();
    expect(screen.queryByText(/^Trend$/i)).toBeNull();
    expect(screen.queryByText(/^Target$/i)).toBeNull();
  });

  it("puts the sections on the page itself", () => {
    renderDoor();
    expect(screen.getByText("the sections go here")).toBeInTheDocument();
  });

  it("does not repeat the page location in a breadcrumb bar", () => {
    renderDoor();
    expect(screen.queryByText(/^Library$/)).toBeNull();
    expect(screen.queryByText("Pick a section")).toBeNull();
  });

  it("keeps internal writing terms off the student-facing page", () => {
    render(
      <SectionLibraryLaunch
        title="Read, Recall, Colour"
        subtitle={null}
        instructions={sectionInstructions as ActivityInstructions}
      >
        <p>the sections go here</p>
      </SectionLibraryLaunch>,
    );
    expect(document.body.textContent).not.toMatch(/\b(?:beat|beats|briefing|intake)\b/i);
  });

  it("states the reading and recording instructions in direct language", () => {
    render(
      <SectionLibraryLaunch
        title="Read, Recall, Colour"
        subtitle={null}
        instructions={sectionInstructions as ActivityInstructions}
      >
        <p>the sections go here</p>
      </SectionLibraryLaunch>,
    );

    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain(
      "Read roughly one sentence at a time, without saying it aloud.",
    );
    expect(pageText).toContain("Your entire section is recorded in one take");
    expect(pageText).not.toMatch(
      /One section keeps the method steady|Read about a sentence|Say each retelling|The whole section records/i,
    );
  });
});
