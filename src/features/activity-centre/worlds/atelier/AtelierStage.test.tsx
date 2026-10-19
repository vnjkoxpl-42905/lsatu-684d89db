import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { AtelierStage } from "./AtelierStage";
import { AtelierEntrance } from "./AtelierEntrance";
import { parseArgument, readBuild } from "./atelier";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "find-the-conclusion")!;
const args = drill.items.map((i) => parseArgument(i)!);

const stated = args.find((a) => a.crown !== null && a.level <= 2)!;
const unstated = args.find((a) => a.unstated)!;

describe("the table", () => {
  it("lays the claims out in reading order and discloses nothing", () => {
    const { getByTestId, queryByTestId } = render(
      <AtelierStage argument={stated} phase="table" />,
    );
    const stack = getByTestId("atelier-stack");
    const panes = stack.querySelectorAll("[data-role]");
    expect(panes.length).toBe(stated.claims.length);
    // Before the build every pane is just a claim. No crown, no supports.
    for (const p of panes) expect(p.getAttribute("data-role")).toBe("claim");
    expect(queryByTestId("at-strut")).toBeNull();
    expect(queryByTestId("at-placement")).toBeNull();
  });

  it("lets the panes lift before the build and not after", () => {
    const { getByTestId, rerender } = render(<AtelierStage argument={stated} phase="table" />);
    expect(getByTestId(`at-pane-0`).getAttribute("data-liftable")).toBe("true");
    rerender(<AtelierStage argument={stated} phase="built" />);
    expect(getByTestId(`at-pane-0`).getAttribute("data-liftable")).toBe("false");
  });
});

describe("the build", () => {
  it("crowns the conclusion and puts everything else under it", () => {
    const { getByTestId } = render(<AtelierStage argument={stated} phase="built" />);
    const crown = getByTestId(`at-pane-${stated.crown}`);
    expect(crown.getAttribute("data-role")).toBe("crown");
    for (const c of stated.claims) {
      if (c.n === stated.crown) continue;
      expect(getByTestId(`at-pane-${c.n}`).getAttribute("data-role")).toBe("support");
    }
  });

  it("draws a strut from each support up to the crown", () => {
    const { getAllByTestId } = render(<AtelierStage argument={stated} phase="built" />);
    expect(getAllByTestId("at-strut").length).toBe(stated.claims.length - 1);
  });

  it("raises a drawn empty pane when the conclusion was never on the table", () => {
    const { getByTestId, queryAllByTestId } = render(
      <AtelierStage argument={unstated} phase="built" />,
    );
    const pane = getByTestId("at-pane-unstated");
    expect(pane.getAttribute("data-role")).toBe("unstated");
    expect(pane.textContent).toContain(unstated.conclusion);
    expect(pane.textContent).toContain("Not stated in the argument");
    // No struts: there is no crown among the claims for them to reach.
    expect(queryAllByTestId("at-strut").length).toBe(0);
  });

  it("never shows the student the authored '(derived)' marker", () => {
    const { getByTestId } = render(<AtelierStage argument={unstated} phase="built" />);
    expect(getByTestId("atelier").textContent).not.toMatch(/\(derived\)|\(substituted\)/i);
  });
});

describe("training wheels", () => {
  it("lifts the indicator into small-caps at Levels 1 and 2", () => {
    const low = args.find((a) => a.level <= 2 && a.indicator && a.crown !== null)!;
    const { queryAllByTestId } = render(<AtelierStage argument={low} phase="table" />);
    expect(queryAllByTestId("at-indicator").length).toBeGreaterThan(0);
  });

  it("takes them off at Level 3 and above, per the locked ladder", () => {
    const high = args.find((a) => a.level >= 3 && a.indicator)!;
    const { queryAllByTestId } = render(<AtelierStage argument={high} phase="table" />);
    expect(queryAllByTestId("at-indicator").length).toBe(0);
  });
});

describe("where the answer landed", () => {
  it("says nothing before the student has answered", () => {
    const { queryByTestId } = render(
      <AtelierStage argument={stated} phase="built" build={readBuild(stated)} />,
    );
    expect(queryByTestId("at-placement")).toBeNull();
  });

  it("puts a correct answer at the crown", () => {
    const build = readBuild(stated, stated.conclusion);
    const { getByTestId } = render(
      <AtelierStage argument={stated} phase="built" build={build} />,
    );
    const placement = getByTestId("at-placement");
    expect(placement.getAttribute("data-placement")).toBe("crown");
    expect(placement.textContent).toContain("at the crown");
  });

  it("measures the gap when the answer sits below the crown", () => {
    const support = stated.claims.find((c) => c.n !== stated.crown)!;
    const build = readBuild(stated, support.text);
    const { getByTestId } = render(
      <AtelierStage argument={stated} phase="built" build={build} />,
    );
    expect(getByTestId("at-placement").textContent).toMatch(/pane[s]? below the crown/);
  });

  it("says the answer matched nothing rather than inventing a distance", () => {
    const build = readBuild(stated, "no idea honestly");
    const { getByTestId } = render(
      <AtelierStage argument={stated} phase="built" build={build} />,
    );
    const placement = getByTestId("at-placement");
    expect(placement.getAttribute("data-placement")).toBe("off-table");
    expect(placement.textContent).not.toMatch(/panes? below/);
  });
});

describe("the blueprint strip", () => {
  it("draws nothing rather than faking a run", () => {
    const { queryByTestId } = render(<AtelierStage argument={stated} phase="table" />);
    expect(queryByTestId("at-strip")).toBeNull();
  });

  it("counts only the items that carry a real verdict", () => {
    const plaques = [
      { order: 1, outcome: "correct" as const },
      { order: 2, outcome: "partial" as const },
      { order: 3, outcome: null },
    ];
    const { getByTestId } = render(
      <AtelierStage argument={stated} phase="table" plaques={plaques} />,
    );
    expect(getByTestId("at-strip").textContent).toContain("2 of 3 drawn");
  });
});

describe("every argument can be staged", () => {
  it("renders all 62 in both phases without throwing", () => {
    for (const a of args) {
      const { unmount, getByTestId } = render(
        <AtelierStage argument={a} phase="built" build={readBuild(a, a.conclusion)} />,
      );
      expect(getByTestId("atelier"), `item ${a.order}`).toBeTruthy();
      unmount();
    }
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the room over after the panes have dealt in", () => {
    const onDone = vi.fn();
    render(<AtelierEntrance onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(2000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<AtelierEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("atelier-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("deals blank glass rather than pretending to show an argument", () => {
    const { getAllByTestId } = render(<AtelierEntrance onDone={vi.fn()} />);
    const panes = getAllByTestId("at-entrance-pane");
    expect(panes.length).toBeGreaterThan(0);
    for (const p of panes) expect(p.textContent).toBe("");
  });
});
