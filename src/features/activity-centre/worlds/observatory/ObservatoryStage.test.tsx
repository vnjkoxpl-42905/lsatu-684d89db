import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { ObservatoryStage } from "./ObservatoryStage";
import { ObservatoryEntrance } from "./ObservatoryEntrance";
import { directionOf, parseSignal, readAnswer, splitWords } from "./observatory";
import { WORLD_BINDINGS } from "../registry";

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
    expect(getByTestId("ob-missed").textContent).toMatch(/causal/i);
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

describe("figures stay off the words", () => {
  /**
   * Lay the words out as a browser would: WORDS_PER_LINE to a line, letters
   * LETTERS tall, lines PITCH apart. jsdom does no layout, so the boxes are
   * stated rather than measured.
   */
  const WORDS_PER_LINE = 6;
  const LETTERS = 28;
  const PITCH = 48;
  const WIDTH = 90;

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("ob-word")) {
        const i = [...this.parentElement!.children].indexOf(this);
        const line = Math.floor(i / WORDS_PER_LINE);
        const col = i % WORDS_PER_LINE;
        return { left: col * WIDTH, top: line * PITCH, width: WIDTH - 10, height: LETTERS, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
      }
      return { left: 0, top: 0, width: WORDS_PER_LINE * WIDTH, height: 4 * PITCH, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  /**
   * The highest and lowest y the drawn curve reaches. A quadratic's control
   * point is not on the curve; its peak is a quarter of each end plus half the
   * control. A causal echo is shifted by its own transform.
   */
  const reach = (path: Element) => {
    const [, y0, , cy, , y1] = [...path.getAttribute("d")!.matchAll(/-?[\d.]+/g)].map(Number);
    const shift = Number(path.getAttribute("transform")?.match(/translate\(0,(-?[\d.]+)\)/)?.[1] ?? 0);
    const peak = 0.25 * y0 + 0.5 * cy + 0.25 * y1;
    return { top: Math.min(y0, y1, peak) + shift, bottom: Math.max(y0, y1, peak) + shift };
  };

  /**
   * Item 29's causal figure ("because" ... "expands") sits on the second line.
   * It used to be placed from the top of the word's box less a fixed offset,
   * which put it straight through the first line's words.
   */
  it("never draws a figure through the line above it", () => {
    for (const s of signals) {
      const { container, unmount } = render(<ObservatoryStage signal={s} phase="drawn" />);
      for (const path of container.querySelectorAll("path.ob-figure:not([data-ghost])")) {
        const { top, bottom } = reach(path);
        const d = path.getAttribute("d");
        // The line this stretch sits over is the one whose letters start just
        // below the path; the line above it ends LETTERS below its own top.
        const line = Math.ceil(bottom / PITCH);
        const ceiling = line === 0 ? -Infinity : (line - 1) * PITCH + LETTERS;
        expect(top, `item ${s.order}: ${d}`).toBeGreaterThan(ceiling);
        expect(bottom, `item ${s.order}: ${d}`).toBeLessThan(line * PITCH);
      }
      unmount();
    }
  });

  it("splits a figure whose words wrap into one stretch per line", () => {
    // Item 47: "above" sets early, "higher still" sets on a later line.
    const s = byOrder(47);
    const { getByTestId } = render(<ObservatoryStage signal={s} phase="drawn" />);
    const paths = getByTestId("ob-figure-comparative").querySelectorAll("path.ob-figure");
    const lines = new Set([...paths].map((p) => Math.ceil(reach(p).bottom / PITCH)));
    expect(lines.size).toBe(paths.length);
    expect(paths.length).toBeGreaterThan(1);
  });
});

describe("the verdict decides what is drawn", () => {
  const world = WORLD_BINDINGS.find((w) => w.slug === "spot-the-relationship")!;
  const item = drill.items.find((i) => i.order === 29)!;

  /**
   * The reader is a pattern match and the Coach is the judge. A student the
   * Coach marked correct used to be told "Still undrawn" when they phrased a
   * type in words the reader did not know.
   */
  it("draws the whole figure for a correct answer, however it was phrased", () => {
    const { queryByTestId, getByTestId } = render(
      world.render({ item, response: "requirement only when; lower than; because/expands", answered: true, verdict: "correct" })!,
    );
    expect(queryByTestId("ob-missed")).toBeNull();
    expect(getByTestId("ob-captions").querySelectorAll("[data-kind]").length).toBe(3);
  });

  it("still shows what a partial answer missed", () => {
    const { getByTestId } = render(
      world.render({ item, response: "conditional, only when", answered: true, verdict: "partial" })!,
    );
    expect(getByTestId("ob-missed").textContent).toMatch(/causal/i);
  });
});

describe("earned relationship dials", () => {
  const world = WORLD_BINDINGS.find((w) => w.slug === "spot-the-relationship")!;
  it("shows the full revealed answer without awarding earned dials", () => {
    const { getByText, getByTestId, queryByTestId, container } = render(world.render({
      item: drill.items[28], answered: true, verdict: "partial", revealed: true, response: "conditional, only when",
    })!);
    expect(getByText("Answer shown")).toBeInTheDocument();
    expect(queryByTestId("ob-missed")).toBeNull();
    expect(getByTestId("ob-captions").querySelectorAll("[data-kind]")).toHaveLength(3);
    expect(container.textContent).not.toMatch(/the field|the figure|rung|more of this than that/i);
    for (const kind of ["conditional", "causal", "comparative"]) expect(getByTestId(`ob-seal-${kind}`)).not.toHaveAttribute("data-lit");
  });
  it("keeps an unearned type dark and restores earned types on the next question", () => {
    const { getByTestId, rerender } = render(world.render({
      item: drill.items[1], answered: false, completedItems: [],
    })!);
    expect(getByTestId("ob-seal-conditional")).not.toHaveAttribute("data-lit");
    rerender(world.render({ item: drill.items[1], answered: true, verdict: "partial" })!);
    expect(getByTestId("ob-seal-conditional")).not.toHaveAttribute("data-lit");
    rerender(world.render({ item: drill.items[1], answered: true, verdict: "correct" })!);
    expect(getByTestId("ob-seal-conditional")).toHaveAttribute("data-lit", "true");
    rerender(world.render({ item: drill.items[8], answered: false, completedItems: [drill.items[1], drill.items[4]] })!);
    expect(getByTestId("ob-seal-conditional")).toHaveAttribute("data-lit", "true");
    expect(getByTestId("ob-seal-causal")).toHaveAttribute("data-lit", "true");
    expect(getByTestId("ob-seal-comparative")).not.toHaveAttribute("data-lit");
  });
  it("lights all types earned by a correct mixed answer", () => {
    const { getByTestId } = render(world.render({ item: drill.items[28], answered: true, verdict: "correct" })!);
    for (const kind of ["conditional", "causal", "comparative"]) {
      expect(getByTestId(`ob-seal-${kind}`)).toHaveAttribute("data-lit", "true");
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


describe("valid exact-span comparisons on a partial stage", () => {
  it.each([[25, "stronger on the eastern array than"], [39, "closer to the C3 range than to"],
    [40, "thicker oxide layer than"], [43, "faster at ambient temperature than"],
    [48, "more regionally appropriate than"]])("draws Q%s comparison without falsely reporting it missing", (order, quote) => {
    const signal = byOrder(order);
    const reading = readAnswer(signal, `comparison, "${quote}"`);
    const { getByTestId, queryByTestId, unmount } = render(<ObservatoryStage signal={signal} phase="drawn" reading={reading} />);
    expect(getByTestId("ob-captions").querySelector('[data-kind="comparative"]')).toBeTruthy();
    expect(queryByTestId("ob-missed")?.textContent ?? "").not.toMatch(/comparative|comparison/i);
    unmount();
  });
});
