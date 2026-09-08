import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionBriefingPage } from "./SectionBriefingPage";
import type { ActivityInstructions } from "../api/types";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";

/**
 * The instructions page, and the three ways it went wrong.
 *
 * It arrived without any of the guards the four older surfaces carry, which is
 * exactly how an em dash and a miscounted unit reached a student.
 */
function renderPage(props?: Partial<Parameters<typeof SectionBriefingPage>[0]>) {
  return render(
    <SectionBriefingPage
      title="Read, Recall, Colour · PT1 Section 3"
      subtitle="A whole section, out loud, against the clock"
      instructions={sectionInstructions as ActivityInstructions}
      itemCount={22}
      timeGoalMinutes={25}
      sourceSection="PT1.S3"
      onStart={vi.fn()}
      {...props}
    />,
  );
}

describe("the section briefing page", () => {
  it("carries no em dash, which Joshua never types", () => {
    renderPage();
    expect(document.body.textContent ?? "").not.toMatch(/[—–]/);
  });

  it("counts stimuli, never pieces", () => {
    renderPage();
    const text = document.body.textContent ?? "";
    expect(text).toContain("22 stimuli");
    // A "piece" is one chunk, roughly a sentence, in the instructions on this
    // same page. Counting stimuli in pieces made the line say 22 sentences.
    expect(text).not.toContain("22 pieces");
  });

  it("names the section once, in the title, not again in the meta line", () => {
    renderPage();
    const meta = document.querySelector(".sl-bp-meta")?.textContent ?? "";
    expect(document.querySelector(".sl-title")?.textContent).toContain("PT1 Section 3");
    expect(meta).toBe("22 stimuli · about 25 min");
  });

  it("falls back to the section in the meta line when the title omits it", () => {
    renderPage({ title: "Read, Recall, Colour" });
    expect(document.querySelector(".sl-bp-meta")?.textContent).toBe(
      "PT1.S3 · 22 stimuli · about 25 min",
    );
  });

  it("says only that nothing is recording, and does not re-explain the take", () => {
    renderPage();
    const notice = document.querySelector(".sl-notice")?.textContent ?? "";
    expect(notice).toContain("Nothing is recording yet");
    expect(notice).not.toMatch(/one take|cannot pause/i);
  });

  it("does not open on the long version, so the four steps read as the instruction", () => {
    renderPage();
    const details = document.querySelector(".sl-bp-more");
    expect(details).not.toBeNull();
    expect((details as HTMLDetailsElement).open).toBe(false);
  });

  it("still offers the long version to anyone who wants it", () => {
    renderPage();
    expect(screen.getByText("Read the long version")).toBeInTheDocument();
  });

  it("puts Start at the top and again at the foot", () => {
    renderPage();
    expect(screen.getAllByRole("button", { name: /Start the section/ })).toHaveLength(2);
  });
});
