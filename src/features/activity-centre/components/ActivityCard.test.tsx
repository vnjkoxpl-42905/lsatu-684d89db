import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES, librarySortIndex } from "../content";
import { slugFromTitle } from "../worlds/registry";
import { ActivityCard } from "./ActivityCard";
import type { ActivityAssignmentSummary } from "../api/types";

/**
 * A list row, which is what the card takes: a count, never the questions. The
 * old fixture handed it `items` and cast the shape away, so it kept passing
 * after the card stopped reading them.
 */
function asAssignment(
  a: (typeof SEED_ACTIVITIES)[number],
  status: ActivityAssignmentSummary["status"] = "assigned",
): ActivityAssignmentSummary {
  return {
    id: a.slug,
    activity_id: null,
    student_id: "student",
    title: a.title,
    subtitle: a.subtitle,
    instructions: a.instructions,
    status,
    score: null,
    created_at: "2026-08-01T00:00:00.000Z",
    started_at: null,
    completed_at: null,
    item_count: a.items.length,
  };
}

describe("ActivityCard", () => {
  it("names the world each Activity opens into", () => {
    for (const a of SEED_ACTIVITIES) {
      const { unmount } = render(
        <ActivityCard assignment={asAssignment(a)} position={1} onOpen={vi.fn()} />,
      );
      // Nine identical rows read as one list; the eyebrow is what tells them
      // apart. Every Activity has one, including the spoken one, which has no
      // world (ADR 0009) and would otherwise be the single unlabelled row.
      expect(screen.getByText(a.title)).toBeInTheDocument();
      const eyebrow = document.querySelector('[class*="uppercase"]');
      expect(eyebrow?.textContent?.trim(), `${a.slug} has no eyebrow`).toBeTruthy();
      if (a.item_format !== "spoken-recall") {
        expect(eyebrow?.textContent).toMatch(/^The /);
      }
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
    // The spoken Activities tail the list, and not because their text is the
    // longest: they are off the scope line entirely, worked out loud from
    // memory rather than analysed on the page. Everything above them is
    // scope-ordered.
    //
    // Every one of them here is a captured section. The door they are reached
    // through sits with them in the library order but is not seeded from
    // `content/`, so it is not among these titles.
    const spoken = ordered.filter((t) => t.startsWith("Read, Recall, Colour"));
    expect(ordered.slice(-spoken.length)).toEqual(spoken);
    expect(spoken.every((t) => / \u00b7 PT\d+ Section \d+$/.test(t))).toBe(true);
    expect(ordered[ordered.length - spoken.length - 1]).toBe("Spot the Callback");
  });
});
