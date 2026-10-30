import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SectionLibraryLaunch } from "./SectionLibraryLaunch";
import type { ActivityInstructions } from "../api/types";
import { METHOD_STEPS } from "../recall/method";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";

/**
 * The door to the whole drill, and what it must not say.
 *
 * These three claims were asserted against the editorial intro until the door
 * stopped being that page. They are about the door, not about which component
 * happens to draw it, so they moved here with it.
 */
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

const instructions = {
  tagline: "Read it, tell it back, react to it.",
  task: "Work through the stimulus out loud.",
  rules: ["Everything here is out loud."],
  briefing: {
    lede: "The drill in one line.",
    closer: "One a day holds you steady. The second one is where you improve.",
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

  it("uses the requested title and omits the old hero slogan", () => {
    renderDoor();
    expect(screen.getByRole("heading", { name: "Read, Recall, Colour" })).toBeInTheDocument();
    expect(screen.queryByText(/Read it once/i)).toBeNull();
    expect(screen.queryByText(/One section · out loud · no pauses/i)).toBeNull();
  });

  it("keeps the sitting rule in the instructions rather than the hero metadata", () => {
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

  it("opens directly on the steps without the removed method copy", () => {
    renderDoor();
    expect(screen.queryByText(/The method, in/i)).toBeNull();
    expect(screen.queryByText(/One stimulus at a time/i)).toBeNull();
    expect(screen.queryByText(/One a day holds you steady/i)).toBeNull();
  });

  it("shows the hero actions without decorative arrows", () => {
    renderDoor();
    const hero = document.querySelector(".rd-hero");
    expect(hero?.querySelector(".sl-start svg")).toBeNull();
    expect(hero?.querySelector(".sl-brief svg")).toBeNull();
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

  it("moves directly to the section choices when asked", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderDoor();

    fireEvent.click(screen.getAllByRole("button", { name: "Choose a section" })[0]);

    const destination = screen.getByRole("region", { name: "Choose a section" });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(destination).toHaveFocus();
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
      "Read about one sentence at a time, silently. Give each word enough attention to hear it naturally in your head. If that feels like too much to hold, take a shorter piece. When you take on too much, the part that slips is always the beginning.",
    );
    expect(pageText).toContain("Your entire section is recorded in one take");
    /*
     * The aside no longer repeats the four steps. Joshua cut them on
     * 2026-09-11: the method is performed in the hero, drawn as the four step
     * cards, and filmed under those, and a fourth telling in prose was the one
     * she skipped. The steps still appear on the page, once each, as authored,
     * in the cards. The aside keeps only the two facts the cards do not carry.
     */
    for (const step of METHOD_STEPS) {
      expect(pageText, `the step cards must state ${step.label}`).toContain(step.label);
    }
    expect(document.querySelector(".sl-aside-steps")).toBeNull();
    expect(pageText).not.toMatch(
      /One section keeps the method steady|Say each retelling|The whole section records/i,
    );
    // The retired step-2 label, which is what the hand-written aside had.
    expect(pageText).not.toMatch(/\bsay it back\b/i);
  });
});


describe("Reading Center inline instructions and examples", () => {
  function renderCompact() {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    return render(
      <SectionLibraryLaunch title="Read, Recall, Colour" subtitle={null}
        instructions={sectionInstructions as ActivityInstructions} compact>
        <p>the sections go here</p>
      </SectionLibraryLaunch>,
    );
  }

  it("keeps only the opening demonstration and section choices on first load", () => {
    const { container } = renderCompact();
    expect(container.querySelector(".rd-demo")).not.toBeNull();
    expect(container.querySelector(".sl-tagline")).toBeNull();
    expect(container.querySelector(".sl-aside")).toBeNull();
    expect(container.querySelector(".rd-counts")).toBeNull();
    expect(container.querySelector(".rd-method")).toBeNull();
    expect(screen.queryByRole("button", { name: "Watch instructions" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Example 1/ })).toBeNull();
  });

  it("swaps the whole entrance for all four complete steps and closed extended reading", async () => {
    const { container } = renderCompact();
    fireEvent.click(screen.getByRole("button", { name: "Read the full instructions" }));
    expect(container.querySelector(".rd-demo")).toBeNull();
    expect(screen.getByRole("heading", { name: "Instructions", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Instructions", level: 1 })).toHaveFocus());
    const steps = sectionInstructions.briefing.sections.find((section) => "steps" in section)?.steps ?? [];
    expect(container.querySelectorAll(".sl-workspace-steps .rd-step")).toHaveLength(4);
    for (const step of steps) expect(within(container.querySelector(".sl-workspace-steps") as HTMLElement).getByText(step.body)).toBeInTheDocument();
    const more = container.querySelector("details");
    expect(more).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Read more", { selector: "summary" }));
    expect(more).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Choose a section" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(container.querySelector(".rd-demo")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Read, Recall, Colour" })).toHaveFocus();
  });

  it("opens one paused player, chooses examples, and stops it when leaving", () => {
    const { container } = renderCompact();
    fireEvent.click(screen.getByRole("button", { name: "Read the full instructions" }));
    fireEvent.click(screen.getByRole("button", { name: "Watch examples" }));
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video")?.autoplay).toBe(false);
    expect(screen.getByRole("button", { name: "Play Example 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Example 1 player" })).toBeInTheDocument();
    for (const n of [1, 2, 3]) expect(screen.getByRole("button", { name: new RegExp(`^Example ${n},`) })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Example 3,/ }));
    expect(screen.getByRole("button", { name: /^Example 3,/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Choose a section" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to instructions" }));
    expect(container.querySelector("video")).toBeNull();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(container.querySelectorAll(".sl-workspace-steps .rd-step")).toHaveLength(4);
  });
});
