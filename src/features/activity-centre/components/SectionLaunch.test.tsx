import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ActivityInstructions } from "../api/types";

const readMyRecentSectionGrades = vi.fn();
vi.mock("../api/activitiesClient", () => ({
  readMyRecentSectionGrades: (...a: unknown[]) => readMyRecentSectionGrades(...a),
}));

import { SectionLaunch } from "./SectionLaunch";

/**
 * The section's front door.
 *
 * The assertions worth having here are about restraint: what the page refuses
 * to say when the evidence is thin, and who it refuses to say it to. A surface
 * that prints a confident number from a partial grade is worse than one that
 * prints nothing.
 */

const instructions: ActivityInstructions = {
  tagline: "Read it, tell it back, react to it.",
  briefing: {
    lede: "You can understand every sentence and still arrive with nothing.",
    sections: [
      { heading: "Why this is hard", body: ["Comprehension is not retention."] },
      {
        heading: "What you actually do.",
        body: ["Four beats, every stimulus."],
        steps: [
          { label: "Read it.", body: "Intake only." },
          { label: "Tell it back.", body: "Look away and tell it." },
          { label: "Colour it.", body: "React to it." },
          { label: "The Recall.", body: "The whole argument, from memory." },
        ],
      },
      { heading: "Simpler is not shorter", body: ["**Efficiency is never a licence.**"] },
    ],
  },
};

function stim(item_order: number, over: Record<string, unknown> = {}) {
  return {
    slug: `s${item_order}`,
    item_order,
    carried: 3,
    total: 3,
    percent: 100,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    spoken: "she said something here",
    ...over,
  };
}

function grade(totalSeconds: number, stimuli: unknown[], over: Record<string, unknown> = {}) {
  return {
    assignment_id: `a${totalSeconds}`,
    attempt_no: 1,
    source_section: "PT105.S2",
    graded_at: "2026-09-02T10:00:00Z",
    created_at: "2026-09-02T10:00:00Z",
    stimuli,
    section: {
      accommodation: "standard",
      goal_minutes: 25,
      total_seconds: totalSeconds,
      within_goal: totalSeconds <= 1500,
      mean_coverage: 90,
      stimuli_graded: stimuli.length,
      stimuli_in_section: 3,
      reciting_count: 0,
      listing_count: 0,
      uncoloured_count: 0,
      worst_dead_air_seconds: 0,
      dead_air_threshold_seconds: 8,
      decoy_failures: 0,
      clock: {},
    },
    ...over,
  };
}

function renderIt(over: Record<string, unknown> = {}) {
  return render(
    <SectionLaunch
      title="Read, Recall, Colour"
      subtitle={null}
      instructions={instructions}
      itemCount={3}
      timeGoalMinutes={25}
      sourceSection="PT105.S2"
      studentId="student-1"
      showHistory
      onStart={vi.fn()}
      {...over}
    />,
  );
}

beforeEach(() => {
  readMyRecentSectionGrades.mockReset();
  readMyRecentSectionGrades.mockResolvedValue({ runs: [], failed: false });
});

describe("the method strip", () => {
  it("is built from the steps inside one section, not from the sections", async () => {
    // The briefing has three sections and only one carries the procedure.
    // Rendering `sections` would put essay headings in the strip and lose the
    // method entirely.
    renderIt();
    const tabs = await screen.findAllByRole("tab");
    const beats = tabs.filter((t) => t.className.includes("sl-beat"));
    expect(beats).toHaveLength(4);
    expect(beats[0]).toHaveTextContent("Read it.");
    expect(beats[3]).toHaveTextContent("The Recall.");
  });

  it("moves between beats on the arrow keys, and wraps", async () => {
    renderIt();
    const beats = (await screen.findAllByRole("tab")).filter((t) =>
      t.className.includes("sl-beat"),
    );
    expect(beats[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(beats[0], { key: "ArrowRight" });
    expect(beats[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(beats[1], { key: "ArrowLeft" });
    fireEvent.keyDown(beats[0], { key: "ArrowLeft" });
    expect(beats[3]).toHaveAttribute("aria-selected", "true");
  });

  it("is absent when no section carries a procedure", async () => {
    renderIt({
      instructions: { briefing: { sections: [{ heading: "Only prose", body: ["x"] }] } },
    });
    await waitFor(() => expect(screen.queryByText("The method")).toBeNull());
  });
});

describe("the briefing switch", () => {
  it("reaches the full briefing and back", async () => {
    renderIt();
    fireEvent.click(await screen.findByRole("tab", { name: "Full instructions" }));
    expect(await screen.findByText("Why this is hard")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "This step" }));
    await waitFor(() => expect(screen.queryByText("Why this is hard")).toBeNull());
  });

  it("renders authored emphasis rather than printing its asterisks", async () => {
    renderIt();
    fireEvent.click(await screen.findByRole("tab", { name: "Full instructions" }));
    const marked = await screen.findByText("Efficiency is never a licence.");
    expect(marked.tagName).toBe("STRONG");
    expect(document.body.textContent).not.toContain("**");
  });
});

describe("who the history is shown to", () => {
  it("is not read at all when the reader is not the student", async () => {
    renderIt({ showHistory: false });
    await screen.findByRole("heading", { name: "Read, Recall, Colour" });
    expect(readMyRecentSectionGrades).not.toHaveBeenCalled();
  });

  it("scopes the read to this section and this student", async () => {
    renderIt();
    await waitFor(() =>
      expect(readMyRecentSectionGrades).toHaveBeenCalledWith(3, {
        sourceSection: "PT105.S2",
        studentId: "student-1",
      }),
    );
  });

  it("is not read when there is no student to scope it to", async () => {
    renderIt({ studentId: null });
    await screen.findByRole("heading", { name: "Read, Recall, Colour" });
    expect(readMyRecentSectionGrades).not.toHaveBeenCalled();
  });
});

describe("what the numbers say", () => {
  it("shows a faster run as a negative trend", async () => {
    readMyRecentSectionGrades.mockResolvedValue({
      runs: [
        grade(1450, [stim(1), stim(2), stim(3)]),
        grade(1665, [stim(1), stim(2), stim(3)]),
        grade(1862, [stim(1), stim(2), stim(3)]),
      ],
      failed: false,
    });
    renderIt();
    expect((await screen.findAllByText("−6:52")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("24:10").length).toBeGreaterThan(0);
  });

  it("counts an ungraded stimulus as recalled, and marks it as not judged", async () => {
    // The judge returned nothing on stimulus 2. She still recorded it, so the
    // count is 3 and the tick is its own state rather than a gap.
    readMyRecentSectionGrades.mockResolvedValue({
      runs: [grade(1450, [stim(1), stim(2, { ungraded: "timeout" }), stim(3)])],
      failed: false,
    });
    const { container } = renderIt();
    await screen.findByText("3 of 3");
    const states = [...container.querySelectorAll(".sl-tick")].map((n) =>
      n.getAttribute("data-state"),
    );
    expect(states).toEqual(["recorded", "notJudged", "recorded"]);
  });

  it("draws no ticks for a run written before positions were stored", async () => {
    readMyRecentSectionGrades.mockResolvedValue({
      runs: [grade(1450, [stim(1), { ...stim(2), item_order: undefined }])],
      failed: false,
    });
    const { container } = renderIt();
    expect((await screen.findAllByText("not recorded")).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".sl-tick")).toHaveLength(0);
  });
});

describe("when the history cannot be read", () => {
  it("says so, rather than saying she has never run it", async () => {
    readMyRecentSectionGrades.mockResolvedValue({ runs: [], failed: true });
    renderIt();
    expect(await screen.findByText(/not available right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/No runs yet/i)).toBeNull();
    // We know the read failed. We do not know that her work survived, so the
    // copy must not promise it.
    expect(document.body.textContent).not.toMatch(/nothing has been lost/i);
  });

  it("says she has never run it when that is the truth", async () => {
    readMyRecentSectionGrades.mockResolvedValue({ runs: [], failed: false });
    renderIt();
    expect(await screen.findByText(/No runs yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/not available right now/i)).toBeNull();
  });

  it("still offers the section", async () => {
    readMyRecentSectionGrades.mockResolvedValue({ runs: [], failed: true });
    renderIt();
    expect(
      await screen.findByRole("button", { name: /start the section/i }),
    ).toBeInTheDocument();
  });
});

describe("the copy", () => {
  // The first version of this test only rendered the empty-history case, where
  // the stat strip is not on screen at all -- so it passed while a student with
  // one run was being shown an em dash in the Trend cell.
  it.each([
    ["no history", { runs: [], failed: false }],
    ["a failed read", { runs: [], failed: true }],
    ["exactly one run", { runs: [grade(1450, [stim(1), stim(2), stim(3)])], failed: false }],
    [
      "a run with no stored positions",
      { runs: [grade(1450, [stim(1), { ...stim(2), item_order: undefined }])], failed: false },
    ],
    [
      "a run with no stored words",
      { runs: [grade(1450, [stim(1), { ...stim(2), spoken: undefined }])], failed: false },
    ],
  ])("carries no em dash with %s, which Joshua never types", async (_label, result) => {
    readMyRecentSectionGrades.mockResolvedValue(result);
    renderIt();
    await screen.findByRole("heading", { name: "Read, Recall, Colour" });
    await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull());
    expect(document.body.textContent).not.toContain("—");
  });
});

describe("silence", () => {
  it("is not counted as recall, and is drawn as its own state", async () => {
    readMyRecentSectionGrades.mockResolvedValue({
      runs: [grade(1450, [stim(1), { ...stim(2), spoken: "" }, stim(3)])],
      failed: false,
    });
    const { container } = renderIt();
    await screen.findByText("2 of 3");
    const states = [...container.querySelectorAll(".sl-tick")].map((n) =>
      n.getAttribute("data-state"),
    );
    expect(states).toEqual(["recorded", "silent", "recorded"]);
  });
});

describe("the tab contract", () => {
  it("names the tab each panel is showing", async () => {
    renderIt();
    const panel = await screen.findByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe("sl-pane-tab-beat sl-beat-tab-0");
    fireEvent.click(screen.getByRole("tab", { name: "Full instructions" }));
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      "sl-pane-tab-briefing",
    );
  });

  it("gives every tab an id its panel can point at", async () => {
    renderIt();
    const tabs = await screen.findAllByRole("tab");
    expect(tabs.every((t) => t.id)).toBe(true);
  });
});
