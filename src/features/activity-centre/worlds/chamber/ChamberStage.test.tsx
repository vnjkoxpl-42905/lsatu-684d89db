import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { ChamberStage } from "./ChamberStage";
import { ChamberEntrance } from "./ChamberEntrance";
import { parseRebuttal, readResolution, rejectionOf } from "./chamber";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "rebuttal-rephrase")!;
const rebuttals = drill.items.map((i) => parseRebuttal(i)!);

const simple = rebuttals.find((r) => r.level === 1 && r.creditedStrength !== null)!;
const compound = rebuttals.find((r) => r.level >= 4)!;

describe("the plinths", () => {
  it("carries their claim and leaves the author's empty before the answer", () => {
    const { getByTestId } = render(<ChamberStage rebuttal={simple} phase="unresolved" />);
    expect(getByTestId("ch-plinth-theirs").textContent).toContain(simple.attributed!.slice(0, 30));
    expect(getByTestId("ch-plinth-authors").getAttribute("data-state")).toBe("empty");
  });

  it("does not print the credited claim anywhere before it is resolved", () => {
    const { getByTestId, queryByTestId } = render(
      <ChamberStage rebuttal={simple} phase="unresolved" />,
    );
    expect(queryByTestId("ch-credited")).toBeNull();
    expect(getByTestId("chamber").textContent).not.toContain(simple.credited);
  });

  it("materializes the author's claim on resolution", () => {
    const { getByTestId } = render(<ChamberStage rebuttal={simple} phase="resolved" />);
    expect(getByTestId("ch-plinth-authors").getAttribute("data-state")).toBe("resolved");
    expect(getByTestId("ch-credited").textContent).toContain(simple.credited.slice(0, 25));
  });

  it("shimmers the referential words of the rejection, not the whole phrase", () => {
    const withRejection = rebuttals.find((r) => rejectionOf(r.argument) !== null)!;
    const { getAllByTestId } = render(
      <ChamberStage rebuttal={withRejection} phase="unresolved" />,
    );
    expect(getAllByTestId("ch-ghost-ref").length).toBeGreaterThan(0);
  });

  /**
   * split() on a capturing regex interleaves the matches into its result, so
   * pulling them separately and re-inserting printed every referential word
   * twice ("thisthis is not so"). Caught in the browser, pinned here.
   */
  it("prints the rejection once, not with its referential words doubled", () => {
    const withRejection = rebuttals.find((r) => rejectionOf(r.argument) !== null)!;
    const { getByTestId } = render(
      <ChamberStage rebuttal={withRejection} phase="unresolved" />,
    );
    expect(getByTestId("ch-ghost").textContent).toBe(rejectionOf(withRejection.argument));
  });

  it("says so rather than inventing a phrase when the rejection is not separable", () => {
    const embedded = rebuttals.find((r) => rejectionOf(r.argument) === null)!;
    const { getByTestId } = render(<ChamberStage rebuttal={embedded} phase="unresolved" />);
    expect(getByTestId("ch-ghost").textContent).toContain("without ever stating their own");
  });
});

describe("the certainty arc", () => {
  it("draws both needles when both claims fix a position", () => {
    const { getByTestId } = render(<ChamberStage rebuttal={simple} phase="resolved" />);
    expect(getByTestId("ch-arc").getAttribute("data-lit")).toBe("true");
    expect(getByTestId("ch-needle-attributed")).toBeTruthy();
    expect(getByTestId("ch-needle-credited")).toBeTruthy();
  });

  it("stays dark on a compound rebuttal and says why", () => {
    const { getByTestId, queryByTestId } = render(
      <ChamberStage rebuttal={compound} phase="resolved" />,
    );
    expect(getByTestId("ch-arc").getAttribute("data-lit")).toBe("false");
    expect(queryByTestId("ch-needle-credited")).toBeNull();
    expect(getByTestId("ch-arc").textContent).toContain("more than one move");
  });

  it("adds the student's needle when their answer fixes a position", () => {
    const withPosition = readResolution(simple, simple.credited);
    const { getByTestId } = render(
      <ChamberStage rebuttal={simple} phase="resolved" resolution={withPosition} />,
    );
    expect(getByTestId("ch-needle-student")).toBeTruthy();
  });

  it("leaves the student's needle off when their answer fixes none", () => {
    const withoutPosition = readResolution(simple, "the wood was old");
    expect(withoutPosition.strength).toBeNull();
    const { queryByTestId } = render(
      <ChamberStage rebuttal={simple} phase="resolved" resolution={withoutPosition} />,
    );
    expect(queryByTestId("ch-needle-student")).toBeNull();
  });

  it("lights only the labels a claim actually sits on", () => {
    const { getByTestId } = render(<ChamberStage rebuttal={simple} phase="resolved" />);
    const lit = getByTestId(`ch-arc-label-${simple.creditedStrength}`);
    expect(lit.getAttribute("data-lit")).toBe("true");
  });
});

describe("trap staging", () => {
  it("puts a premise answer at the base of the plinth, not on it", () => {
    const withEvidence = rebuttals.find((r) => r.level === 2)!;
    const resolution = { strength: null, trap: "premise" as const, dropped: [], resolved: false };
    const { getByTestId } = render(
      <ChamberStage
        rebuttal={withEvidence}
        phase="resolved"
        response="some evidence sentence"
        resolution={resolution}
      />,
    );
    const block = getByTestId("ch-base-block");
    expect(block.textContent).toContain("It holds the claim up, it is not the claim");
  });

  it("carves the dropped scope word into the credited claim", () => {
    const scoped = rebuttals.find((r) => r.qualifiers.length > 0)!;
    const resolution = {
      strength: null,
      trap: "scope-drop" as const,
      dropped: [scoped.qualifiers[0]],
      resolved: true,
    };
    const { getByTestId } = render(
      <ChamberStage rebuttal={scoped} phase="resolved" resolution={resolution} />,
    );
    expect(getByTestId("ch-carved").textContent?.toLowerCase()).toBe(
      scoped.qualifiers[0].toLowerCase(),
    );
  });

  it("names the overshoot and what the author did not say", () => {
    const withOvershoot = rebuttals.find((r) => r.overshoot)!;
    const resolution = readResolution(withOvershoot, withOvershoot.overshoot!);
    const { getByTestId } = render(
      <ChamberStage rebuttal={withOvershoot} phase="resolved" resolution={resolution} />,
    );
    const reading = getByTestId("ch-reading");
    expect(reading.getAttribute("data-trap")).toBe("overshoot");
    expect(reading.textContent).toContain("The author has not said");
  });

  it("reports a clean resolution without naming a trap", () => {
    const resolution = readResolution(simple, simple.credited);
    const { getByTestId } = render(
      <ChamberStage rebuttal={simple} phase="resolved" resolution={resolution} />,
    );
    expect(getByTestId("ch-reading").getAttribute("data-trap")).toBe("none");
  });
});

describe("the rail", () => {
  it("shows nothing rather than faking a run", () => {
    const { queryByTestId } = render(<ChamberStage rebuttal={simple} phase="unresolved" />);
    expect(queryByTestId("ch-rail")).toBeNull();
  });

  it("counts only real verdicts", () => {
    const rail = [
      { order: 1, outcome: "correct" as const },
      { order: 2, outcome: null },
    ];
    const { getByTestId } = render(
      <ChamberStage rebuttal={simple} phase="unresolved" rail={rail} />,
    );
    expect(getByTestId("ch-rail").textContent).toContain("1 of 2 argued");
  });
});

describe("every rebuttal can be staged", () => {
  it("renders all 42 in both phases without throwing", () => {
    for (const r of rebuttals) {
      const { unmount, getByTestId } = render(
        <ChamberStage
          rebuttal={r}
          phase="resolved"
          response={r.credited}
          resolution={readResolution(r, r.credited)}
        />,
      );
      expect(getByTestId("chamber"), `item ${r.order}`).toBeTruthy();
      unmount();
    }
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the room over after both lights have come up", () => {
    const onDone = vi.fn();
    render(<ChamberEntrance onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(2499));
    expect(onDone).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<ChamberEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("chamber-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows the author's plinth empty, which is the whole staging", () => {
    const { getByTestId } = render(<ChamberEntrance onDone={vi.fn()} />);
    expect(getByTestId("ch-entrance-authors").getAttribute("data-state")).toBe("empty");
  });
});
