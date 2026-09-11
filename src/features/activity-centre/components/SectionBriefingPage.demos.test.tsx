import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionBriefingPage } from "./SectionBriefingPage";
import type { ActivityInstructions } from "../api/types";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";
import { RRC_DEMOS, demoLabel } from "../content/read-recall-colour-section.demos";

/**
 * The demonstrations on the briefing page (2026-09-10).
 *
 * Three real stimuli, each captioned with its practice test, section and
 * question. The caption is assembled from numbers, so the test checks the
 * assembly, and the house rules that leaked through this page once before.
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
  it("shows one player per demo, captioned with its practice test, section and question", () => {
    renderPage();
    const videos = document.querySelectorAll(".sl-bp-demo video");
    expect(videos.length).toBe(RRC_DEMOS.length);
    const text = document.querySelector(".sl-bp-demos")?.textContent ?? "";
    for (const d of RRC_DEMOS) {
      expect(text).toContain(`PrepTest ${d.prepTest} · Section ${d.section} · Question ${d.question}`);
      expect(demoLabel(d)).toMatch(/^Demo · PrepTest \d+ · Section \d+ · Question \d+$/);
    }
  });

  it("never autoplays and never loops: nothing begins without her", () => {
    renderPage();
    for (const v of Array.from(document.querySelectorAll<HTMLVideoElement>(".sl-bp-demo video"))) {
      expect(v.hasAttribute("autoplay")).toBe(false);
      expect(v.hasAttribute("loop")).toBe(false);
      expect(v.hasAttribute("controls")).toBe(true);
      expect(v.getAttribute("preload")).toBe("metadata");
    }
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
