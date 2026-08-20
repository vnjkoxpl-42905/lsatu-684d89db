import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES, librarySortIndex } from "../content";
import { slugFromTitle } from "../worlds/registry";
import { ActivityCard } from "./ActivityCard";

function asAssignment(a: (typeof SEED_ACTIVITIES)[number], status = "assigned") {
  return {
    id: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    items: a.items,
    status,
    score: null,
  } as never;
}

describe("ActivityCard", () => {
  it("names the world each Activity opens into", () => {
    for (const a of SEED_ACTIVITIES) {
      const { unmount } = render(
        <ActivityCard assignment={asAssignment(a)} position={1} onOpen={vi.fn()} />,
      );
      // Eight identical rows read as one list; the world is what tells them apart.
      expect(screen.getByText(a.title)).toBeInTheDocument();
      const eyebrow = document.querySelector('[class*="uppercase"]');
      expect(eyebrow?.textContent).toMatch(/^The /);
      unmount();
    }
  });

  it("counts items truthfully rather than rounding to a tidy number", () => {
    const a = SEED_ACTIVITIES[0];
    render(<ActivityCard assignment={asAssignment(a)} position={3} onOpen={vi.fn()} />);
    expect(screen.getByText(`· ${a.items.length} items`)).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});

describe("Activity Centre ordering", () => {
  it("runs word to passage, the teaching progression, not seed date", () => {
    // Regression: the student list sorted by status then created_at, so the
    // passage-level Activity led and the word-level one sat near the bottom.
    const titles = SEED_ACTIVITIES.map((a) => a.title);
    const ordered = [...titles].sort(
      (x, y) => librarySortIndex(slugFromTitle(x)) - librarySortIndex(slugFromTitle(y)),
    );
    expect(ordered[0]).toBe("Vocab Rehab");
    expect(ordered[ordered.length - 1]).toBe("Spot the Callback");
  });
});
