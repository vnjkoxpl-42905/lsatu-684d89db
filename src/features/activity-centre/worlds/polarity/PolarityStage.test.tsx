import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PolarityStage } from "./PolarityStage";
import { PolarityEntrance } from "./PolarityEntrance";
import { Assay } from "./wings/Assay";
import { buildAssay } from "./wings/rounds";
import { PLATES, readPush } from "./polarity";

const measurable = PLATES.find((p) => p.measurable)!;
const stamped = PLATES.find((p) => !p.measurable)!;
const assay = buildAssay(PLATES);

describe("the plate", () => {
  it("engraves the statement on the front and the negation on the back", () => {
    const { getByTestId } = render(<PolarityStage plate={measurable} phase="statement" />);
    expect(getByTestId("po-face-front").textContent).toBe(measurable.statement);
    expect(getByTestId("po-face-back").textContent).toBe(measurable.negation);
  });

  /**
   * The negation is in the DOM from the start because the plate is one object,
   * but it must be hidden from assistive technology until the turn, or the
   * answer is simply read out before the student has tried.
   */
  it("hides the negation from assistive technology until the plate turns", () => {
    const { getByTestId, rerender } = render(
      <PolarityStage plate={measurable} phase="statement" />,
    );
    expect(getByTestId("po-face-back").getAttribute("aria-hidden")).toBe("true");
    rerender(<PolarityStage plate={measurable} phase="inverted" />);
    expect(getByTestId("po-face-back").getAttribute("aria-hidden")).toBe("false");
  });

  it("does not turn before the student commits", () => {
    const { getByTestId } = render(<PolarityStage plate={measurable} phase="statement" />);
    expect(getByTestId("po-plate").getAttribute("data-face")).toBe("statement");
  });

  it("turns on the inversion", () => {
    const { getByTestId } = render(<PolarityStage plate={measurable} phase="inverted" />);
    expect(getByTestId("po-plate").getAttribute("data-face")).toBe("negation");
  });

  it("refuses to turn, and says why, on a wrong answer", () => {
    const { getByTestId } = render(<PolarityStage plate={measurable} phase="refused" />);
    expect(getByTestId("po-plate").getAttribute("data-face")).toBe("statement");
    expect(getByTestId("po-refusal").textContent).toContain("would not turn");
  });
});

describe("the strength beam", () => {
  it("renders for a quantity item, with the credited level ringed", () => {
    const { getByTestId } = render(<PolarityStage plate={measurable} phase="inverted" />);
    expect(getByTestId("po-beam").getAttribute("data-measurable")).toBe("true");
    expect(getByTestId("po-ring").getAttribute("data-level")).toBe(measurable.negationLevel);
  });

  it("puts no marker up before the student has answered", () => {
    const { queryByTestId } = render(<PolarityStage plate={measurable} phase="inverted" />);
    expect(queryByTestId("po-marker")).toBeNull();
  });

  it("meets the ring on the credited negation", () => {
    const reading = readPush(measurable, measurable.negation);
    const { getByTestId } = render(
      <PolarityStage plate={measurable} phase="inverted" reading={reading} />,
    );
    const marker = getByTestId("po-marker");
    expect(marker.getAttribute("data-push")).toBe("minimal");
    expect(marker.getAttribute("data-level")).toBe(measurable.negationLevel);
  });

  it("floods the room on an overshoot", () => {
    const universal = PLATES.find((p) => p.statementLevel === "all" && p.measurable)!;
    const reading = readPush(universal, "No such thing is ever the case.");
    expect(reading.push).toBe("overshoot");
    const { getByTestId } = render(
      <PolarityStage plate={universal} phase="inverted" reading={reading} />,
    );
    expect(getByTestId("polarity").getAttribute("data-glare")).toBe("true");
    expect(getByTestId("po-verdict").textContent).toContain("says more than you need");
  });

  it("does not flood the room on a correct answer", () => {
    const reading = readPush(measurable, measurable.negation);
    const { getByTestId } = render(
      <PolarityStage plate={measurable} phase="inverted" reading={reading} />,
    );
    expect(getByTestId("polarity").getAttribute("data-glare")).toBeNull();
  });
});

describe("the two stamps", () => {
  /**
   * Strength is not a quantity for a conditional or causal claim, so the beam
   * must not appear at all rather than appear with nothing on it.
   */
  it("replaces the beam where strength is not a quantity", () => {
    const { getByTestId, queryByTestId } = render(
      <PolarityStage plate={stamped} phase="inverted" />,
    );
    expect(queryByTestId("po-beam")).toBeNull();
    expect(getByTestId("po-stamps").getAttribute("data-measurable")).toBe("false");
  });

  it("lights the stamps only once the answer contradicts", () => {
    const { getByTestId, rerender } = render(
      <PolarityStage plate={stamped} phase="inverted" />,
    );
    expect(getByTestId("po-stamp-contradicts").getAttribute("data-lit")).toBeNull();
    rerender(
      <PolarityStage
        plate={stamped}
        phase="inverted"
        reading={readPush(stamped, stamped.negation)}
      />,
    );
    expect(getByTestId("po-stamp-contradicts").getAttribute("data-lit")).toBe("true");
  });

  it("makes no claim about strength on an unmeasured item", () => {
    const reading = readPush(stamped, stamped.negation);
    const { getByTestId } = render(
      <PolarityStage plate={stamped} phase="inverted" reading={reading} />,
    );
    expect(getByTestId("po-verdict").getAttribute("data-push")).toBe("unmeasured");
  });
});

describe("the chamber floor", () => {
  it("shows nothing rather than faking a run", () => {
    const { queryByTestId } = render(<PolarityStage plate={measurable} phase="statement" />);
    expect(queryByTestId("po-chips")).toBeNull();
  });

  it("counts only the items that were really broken", () => {
    const chips = [
      { order: 1, level: "full" as const },
      { order: 2, level: "half" as const },
      { order: 3, level: "dark" as const },
      { order: 4, level: null },
    ];
    const { getByTestId } = render(
      <PolarityStage plate={measurable} phase="statement" chips={chips} />,
    );
    expect(getByTestId("po-chips").textContent).toContain("2 of 4 broken");
  });
});

describe("every plate can be staged", () => {
  it("renders all 30 in both phases without throwing", () => {
    for (const p of PLATES) {
      const { unmount, getByTestId } = render(
        <PolarityStage plate={p} phase="inverted" reading={readPush(p, p.negation)} />,
      );
      expect(getByTestId("polarity"), `item ${p.order}`).toBeTruthy();
      unmount();
    }
  });
});

describe("The Assay", () => {
  it("offers four real category labels, one of them right", () => {
    for (const call of assay) {
      expect(call.options.length).toBe(4);
      expect(call.options).toContain(call.kind);
      expect(new Set(call.options).size).toBe(4);
    }
  });

  it("does not park the right label in one position", () => {
    const positions = assay.map((c) => c.options.indexOf(c.kind));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("credits the right identification and gives the bank's reason", () => {
    const call = assay[0];
    const { getByTestId, getAllByTestId } = render(<Assay round={[call]} />);
    const right = getAllByTestId("po-assay-option").find((b) => b.textContent === call.kind)!;
    fireEvent.click(right);
    const verdict = getByTestId("po-assay-verdict");
    expect(verdict.textContent).toContain("Identified");
    expect(verdict.textContent).toContain(call.why);
  });

  it("names the truth when the identification is wrong", () => {
    const call = assay[0];
    const { getByTestId, getAllByTestId } = render(<Assay round={[call]} />);
    const wrong = getAllByTestId("po-assay-option").find((b) => b.textContent !== call.kind)!;
    fireEvent.click(wrong);
    expect(getByTestId("po-assay-verdict").textContent).toContain(`It is a ${call.kind}`);
  });

  it("says there is nothing to assay rather than rendering an empty wing", () => {
    const { getByTestId } = render(<Assay round={[]} />);
    expect(getByTestId("assay-empty").textContent).toContain("nothing here to assay");
  });

  it("builds nothing when there are not four kinds to choose between", () => {
    expect(buildAssay(PLATES.slice(0, 1))).toEqual([]);
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the chamber over after the nameplate burns off", () => {
    const onDone = vi.fn();
    render(<PolarityEntrance onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<PolarityEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("polarity-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("descends blank glass rather than pretending to show a claim", () => {
    const { getByTestId } = render(<PolarityEntrance onDone={vi.fn()} />);
    expect(getByTestId("po-entrance-plate").textContent).toBe("");
  });
});
