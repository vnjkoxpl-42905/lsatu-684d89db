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
      onStart={vi.fn()}
      {...props}
    />,
  );
}

describe("the section briefing page", () => {
  it("says at the foot, beside Start, what one take and a pause each cost her, and what the time is for", () => {
    renderPage();
    const foot = document.querySelector(".sl-bp-foot")?.textContent ?? "";
    expect(foot).toMatch(/one take/i);
    // The runner ships a Pause button, so the foot says what pausing does
    // rather than denying it. Joshua's call, 2026-09-09.
    expect(foot).toMatch(/you can pause/i);
    expect(foot).toMatch(/the clock stops/i);
    expect(foot).toMatch(/cannot go back/i);
    expect(foot).toMatch(/goal/i);
    // The key, and the step it ends, live here now rather than in the ready
    // beat, where they were thirty words to read in three seconds.
    expect(foot).toMatch(/Space twice per stimulus/);
    expect(foot).toMatch(/given The Recall/);
    expect(foot).not.toMatch(/given your Read/);
    // The authored closer is the last beat before Start, and it renders here.
    expect(foot).toContain("One a day holds you steady.");
  });

  it("carries no em dash, which Joshua never types", () => {
    renderPage();
    expect(document.body.textContent ?? "").not.toMatch(/[—–]/);
  });

  it("carries no meta line: the title names the section and nothing else belongs there", () => {
    renderPage();
    expect(document.querySelector(".sl-bp-meta")).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\d+ stimuli/);
    expect(text).not.toMatch(/about \d+ min/);
    // The count and the clock were the whole line, and both were noise here.
    // The clock is stated where it matters, at the foot and in the long version.
    expect(text).not.toContain("pieces to read");
  });

  it("keeps the internal writing vocabulary off the page", () => {
    renderPage();
    // CONTEXT.md: "Beat" is the internal code term for one of the four method
    // steps. Students see "step". The door already forbids these words, but the
    // door never renders the written instructions and this page does, so
    // "Three beats through the stimulus" reached a student through the gap.
    expect(document.body.textContent ?? "").not.toMatch(
      /(?:beat|beats|briefing|intake|chunk|chunks)/i,
    );
  });

  it("says only that nothing is recording, and does not re-explain the take", () => {
    renderPage();
    const notice = document.querySelector(".sl-notice")?.textContent ?? "";
    expect(notice).toContain("Nothing is recording yet");
    expect(notice).not.toMatch(/one take|cannot pause/i);
  });

  it("steps its headings down without skipping a level", () => {
    renderPage();
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
      Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    // WCAG 1.3.1. The page ran H1 to H2 to H4, because the long version's
    // label looked like a heading without being one.
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("makes the long version's label a real heading, not just heading-shaped", () => {
    renderPage();
    const heading = document.querySelector(".sl-bp-more > summary > h2");
    expect(heading?.textContent).toBe("Read the long version");
  });

  it("does not announce static copy as a live region", () => {
    renderPage();
    // A live region is for state that changes without a page load. This
    // sentence is the same every time.
    expect(document.querySelector(".sl-notice")?.getAttribute("role")).toBeNull();
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
