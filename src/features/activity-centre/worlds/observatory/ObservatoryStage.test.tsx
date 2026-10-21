import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { ObservatoryStage } from "./ObservatoryStage";
import { ObservatoryEntrance } from "./ObservatoryEntrance";
import { directionOf, parseSignal, readAnswer, splitWords } from "./observatory";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
const signals = drill.items.map((i) => parseSignal(i)!);
const byOrder = (n: number) => signals.find((s) => s.order === n)!;

const single = signals.find((s) => s.relations.length === 1)!;
const multi = byOrder(27);

describe("the field", () => {
  it("puts every word of the statement on the field", () => {
    const { getByTestId } = render(<ObservatoryStage signal={single} phase="arrival" />);
    const text = getByTestId("ob-field").textContent!.replace(/\s+/g, " ").trim();
    expect(text).toContain(single.statement.split(/\s+/)[0]);
    expect(splitWords(single.statement).length).toBeGreaterThan(3);
  });

  it("marks the indicator words as anchors", () => {
    const { getAllByTestId } = render(<ObservatoryStage signal={single} phase="arrival" />);
    expect(getAllByTestId("ob-anchor-word").length).toBeGreaterThan(0);
  });

  /**
   * The anchors exist before the verdict because the figure needs them, but
   * lighting them early would point straight at the answer.
   */
  it("does not light the anchors before the figure is drawn", () => {
    const { getAllByTestId } = render(<ObservatoryStage signal={single} phase="arrival" />);
    for (const w of getAllByTestId("ob-anchor-word")) {
      expect(w.getAttribute("data-drawn")).toBeNull();
    }
  });

  it("draws no figure and no caption before the verdict", () => {
    const { queryByTestId } = render(<ObservatoryStage signal={single} phase="arrival" />);
    expect(queryByTestId("ob-figures")).toBeNull();
    expect(queryByTestId("ob-captions")).toBeNull();
  });

  it("lights the anchors once the figure is drawn", () => {
    const { getAllByTestId } = render(<ObservatoryStage signal={single} phase="drawn" />);
    const lit = getAllByTestId("ob-anchor-word").filter((w) => w.getAttribute("data-drawn"));
    expect(lit.length).toBeGreaterThan(0);
  });
});

describe("the captions", () => {
  it("names the geometry and quotes the indicators it drew from", () => {
    const { getByTestId } = render(<ObservatoryStage signal={single} phase="drawn" />);
    const captions = getByTestId("ob-captions").textContent!;
    expect(captions).toContain(single.relations[0].indicators[0]);
  });

  it("captions every relationship on a multi-relationship item", () => {
    const { getByTestId } = render(<ObservatoryStage signal={multi} phase="drawn" />);
    const captions = getByTestId("ob-captions");
    expect(captions.querySelectorAll("[data-kind]").length).toBe(multi.relations.length);
  });

  it("says what is still undrawn when the student missed one", () => {
    const reading = readAnswer(multi, 'conditional, "Only if"');
    const { getByTestId } = render(
      <ObservatoryStage signal={multi} phase="drawn" reading={reading} />,
    );
    expect(getByTestId("ob-missed").textContent).toContain("causal");
  });

  it("captions only what the student actually found", () => {
    const reading = readAnswer(multi, 'conditional, "Only if"');
    const { getByTestId } = render(
      <ObservatoryStage signal={multi} phase="drawn" reading={reading} />,
    );
    expect(getByTestId("ob-captions").querySelectorAll("[data-kind]").length).toBe(1);
  });
});

describe("conditional direction", () => {
  /**
   * An arrow pointing the wrong way teaches the reversal error, so the
   * direction comes from an explicit lexicon or not at all.
   */
  it("knows the standard sufficient and necessary markers", () => {
    expect(directionOf("if")).toBe("sufficient");
    expect(directionOf("whenever")).toBe("sufficient");
    expect(directionOf("only if")).toBe("necessary");
    expect(directionOf("requires")).toBe("necessary");
  });

  it("reads 'only if' as necessary rather than falling through to 'if'", () => {
    expect(directionOf("only if")).toBe("necessary");
  });

  it("claims no direction for an indicator it does not know", () => {
    expect(directionOf("accelerates")).toBeNull();
    expect(directionOf("more than")).toBeNull();
  });
});

describe("the seals", () => {
  it("lights none until a type is really completed", () => {
    const { getByTestId } = render(<ObservatoryStage signal={single} phase="arrival" />);
    for (const k of ["conditional", "causal", "comparative"]) {
      expect(getByTestId(`ob-seal-${k}`).getAttribute("data-lit")).toBeNull();
    }
  });

  it("lights exactly the types passed in", () => {
    const { getByTestId } = render(
      <ObservatoryStage
        signal={single}
        phase="arrival"
        seals={{ conditional: true, causal: false, comparative: false }}
      />,
    );
    expect(getByTestId("ob-seal-conditional").getAttribute("data-lit")).toBe("true");
    expect(getByTestId("ob-seal-causal").getAttribute("data-lit")).toBeNull();
  });
});

describe("every signal can be staged", () => {
  it("renders all 48 in both phases without throwing", () => {
    for (const s of signals) {
      const item = drill.items.find((i) => i.order === s.order)!;
      const { unmount, getByTestId } = render(
        <ObservatoryStage
          signal={s}
          phase="drawn"
          reading={readAnswer(s, item.credited_answers[0])}
        />,
      );
      expect(getByTestId("observatory"), `item ${s.order}`).toBeTruthy();
      unmount();
    }
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the sky over after the dials have powered on", () => {
    const onDone = vi.fn();
    render(<ObservatoryEntrance onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(2499));
    expect(onDone).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<ObservatoryEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("observatory-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("resolves a sky rather than pretending to show a statement", () => {
    const { getAllByTestId } = render(<ObservatoryEntrance onDone={vi.fn()} />);
    const stars = getAllByTestId("ob-entrance-star");
    expect(stars.length).toBeGreaterThan(0);
    for (const s of stars) expect(s.textContent).toBe("");
  });

  it("powers on all three dials", () => {
    const { getAllByTestId } = render(<ObservatoryEntrance onDone={vi.fn()} />);
    expect(getAllByTestId("ob-entrance-seal").length).toBe(3);
  });
});
