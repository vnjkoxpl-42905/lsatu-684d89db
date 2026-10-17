import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionBriefingPage } from "./SectionBriefingPage";
import { SectionDemos } from "./SectionDemos";
import type { ActivityInstructions } from "../api/types";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";
import { RRC_DEMOS, demoLabel } from "../content/read-recall-colour-section.demos";

/**
 * The demonstrations (2026-09-10, made a theatre 2026-09-11).
 *
 * One stage and three chapters. Three real stimuli, each captioned with its
 * practice test, section and question. The caption is assembled from numbers,
 * so the test checks the assembly, and the house rules that leaked through
 * this page once before.
 */
function renderPage() {
  return render(
    <SectionBriefingPage
      title="Read, Recall, Colour · PT1 Section 3"
      subtitle={null}
      instructions={sectionInstructions as ActivityInstructions}
      onStart={vi.fn()}
    />,
  );
}

describe("the demonstrations on the briefing page", () => {
  it("shows one stage and a chapter per demo, each named by practice test, section and question", () => {
    renderPage();
    expect(document.querySelectorAll(".sl-theatre-stage video").length).toBe(1);
    const chapters = document.querySelectorAll(".sl-theatre-chapter");
    expect(chapters.length).toBe(RRC_DEMOS.length);
    for (const d of RRC_DEMOS) {
      expect(demoLabel(d)).toMatch(/^Demo · PrepTest \d+ · Section \d+ · Question \d+$/);
      expect(
        screen.getByRole("button", { name: new RegExp(`Question ${d.question}, \\d+:\\d\\d$`) }),
      ).toBeInTheDocument();
    }
  });

  it("never autoplays, never loops, and hands her no download or picture-in-picture", () => {
    renderPage();
    const v = document.querySelector<HTMLVideoElement>(".sl-theatre-stage video")!;
    expect(v.hasAttribute("autoplay")).toBe(false);
    expect(v.hasAttribute("loop")).toBe(false);
    // The browser's own bar carries a download button. Ours does not.
    expect(v.hasAttribute("controls")).toBe(false);
    expect(v.getAttribute("controlslist")).toContain("nodownload");
    expect(v.hasAttribute("disablepictureinpicture")).toBe(true);
    expect(v.getAttribute("preload")).toBe("metadata");
  });

  it("puts the chosen chapter on the stage", () => {
    renderPage();
    const third = RRC_DEMOS[2];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Question ${third.question},`) }));
    const src = document.querySelector<HTMLSourceElement>(".sl-theatre-stage video source")!;
    expect(src.getAttribute("src")).toBe(third.src);
    expect(
      screen.getByRole("button", { name: new RegExp(`Question ${third.question},`) }).getAttribute("aria-current"),
    ).toBe("true");
  });

  it("runs the three as one sitting: when a film ends the next takes the stage", () => {
    render(<SectionDemos />);
    const video = () => document.querySelector<HTMLVideoElement>(".sl-theatre-stage video")!;
    const src = () => document.querySelector<HTMLSourceElement>(".sl-theatre-stage video source")!.getAttribute("src");
    expect(src()).toBe(RRC_DEMOS[0].src);
    fireEvent.ended(video());
    expect(src()).toBe(RRC_DEMOS[1].src);
    fireEvent.ended(video());
    expect(src()).toBe(RRC_DEMOS[2].src);
    fireEvent.ended(video());
    // The last one ends and stays; nothing loops back on its own.
    expect(src()).toBe(RRC_DEMOS[2].src);
  });

  it("sits between the steps and the long version", () => {
    renderPage();
    const steps = document.querySelector(".sl-bp-steps");
    const demos = document.querySelector(".sl-bp-demos");
    const more = document.querySelector(".sl-bp-more");
    expect(steps && demos && more).toBeTruthy();
    expect(steps!.compareDocumentPosition(demos!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(demos!.compareDocumentPosition(more!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the house rules: no em dash, no internal vocabulary", () => {
    renderPage();
    const text = document.querySelector(".sl-bp-demos")?.textContent ?? "";
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\b(beat|beats|card|cards|chunk|chunks|intake|phase)\b/i);
  });
});
