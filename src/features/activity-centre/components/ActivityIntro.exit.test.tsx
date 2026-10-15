import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../content";
import { ActivityIntro } from "./ActivityIntro";

// Placement, not just presence. The exit first shipped next to "Start
// drilling" at the foot of the intro, where it read as a second action
// competing with the primary one. A back control belongs at the top left.

function renderIntro() {
  const a = SEED_ACTIVITIES[0];
  render(
    <ActivityIntro
      title={a.title}
      subtitle={a.subtitle}
      instructions={a.instructions}
      onStart={vi.fn()}
      onExit={vi.fn()}
    />,
  );
  return a;
}

describe("ActivityIntro exit placement", () => {
  it("sits in the hero's top row, above the title crumb", () => {
    renderIntro();
    const exit = screen.getByRole("button", { name: /exit/i });
    const heroTop = document.querySelector(".act-hero-top");
    expect(heroTop).not.toBeNull();
    expect(heroTop!.contains(exit)).toBe(true);

    // Above the crumb in document order, so it reads first top-to-bottom.
    const crumb = document.querySelector(".act-edit-crumb")!;
    expect(exit.compareDocumentPosition(crumb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("no longer sits beside the primary Start action", () => {
    renderIntro();
    const exit = screen.getByRole("button", { name: /exit/i });
    const start = document.querySelector(".act-start")!;
    expect(start.parentElement!.contains(exit)).toBe(false);
  });
});

describe("ActivityIntro worked example", () => {
  it("shows each Activity's own answer in the after orb, never a fixed string", () => {
    // Regression: the after orb hardcoded Negation Station's gloss, so every
    // Activity's intro claimed the same answer while the before orb beside it
    // showed that Activity's real statement.
    for (const a of SEED_ACTIVITIES) {
      const ex = a.instructions.worked_example;
      if (!ex) continue;
      const { unmount } = render(
        <ActivityIntro
          title={a.title}
          subtitle={a.subtitle}
          instructions={a.instructions}
          onStart={vi.fn()}
          onExit={vi.fn()}
        />,
      );
      const after = document.querySelector(".act-orb--after .act-orb-statement")!;
      expect(after.textContent).toBe(ex.credited_answers[0]);
      expect(after.textContent).not.toMatch(/100% conformity/);
      unmount();
    }
  });
});
