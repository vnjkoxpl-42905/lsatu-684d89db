import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { LoomStage } from "./LoomStage";
import { LoomEntrance } from "./LoomEntrance";
import { parseCallback, readThrow } from "./loom";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-callback")!;
const callbacks = drill.items.map((i) => parseCallback(i)!);

const c = callbacks[0];

describe("the sheets", () => {
  it("hangs both sheets with the passage on them", () => {
    const { getByTestId } = render(<LoomStage callback={c} phase="call" />);
    expect(getByTestId("lo-sheet-source").textContent).toContain(c.source.slice(0, 30));
    expect(getByTestId("lo-sheet-caller").textContent).toContain(c.phrase);
  });

  it("brackets the phrase and pulses it while the call is out", () => {
    const { getByTestId } = render(<LoomStage callback={c} phase="call" />);
    const phrase = getByTestId("lo-phrase");
    expect(phrase.textContent).toBe(c.phrase);
    expect(phrase.getAttribute("data-calling")).toBe("true");
  });

  it("lifts the source sheet on the call, inviting the eye up", () => {
    const { getByTestId, rerender } = render(<LoomStage callback={c} phase="call" />);
    expect(getByTestId("lo-sheet-source").getAttribute("data-lifted")).toBe("true");
    rerender(<LoomStage callback={c} phase="thrown" />);
    expect(getByTestId("lo-sheet-source").getAttribute("data-lifted")).toBe("false");
  });

  it("never shows the markup to the student", () => {
    for (const cb of callbacks) {
      const { unmount, getByTestId } = render(<LoomStage callback={cb} phase="call" />);
      expect(getByTestId("loom").textContent, `item ${cb.order}`).not.toContain("**");
      unmount();
    }
  });

  it("does not highlight the landing before the throw", () => {
    const { getByTestId } = render(<LoomStage callback={c} phase="call" />);
    expect(getByTestId("lo-landing").className).not.toContain("lo-landed");
  });
});

describe("the throw", () => {
  it("says nothing before the student answers", () => {
    const { queryByTestId } = render(<LoomStage callback={c} phase="call" />);
    expect(queryByTestId("lo-reading")).toBeNull();
  });

  it("weaves and highlights the landing on a credited answer", () => {
    const result = readThrow(c, c.credited);
    const { getByTestId } = render(
      <LoomStage callback={c} phase="thrown" result={result} />,
    );
    expect(getByTestId("lo-reading").getAttribute("data-kind")).toBe("thread");
    expect(getByTestId("lo-landing").className).toContain("lo-landed");
  });

  /** The locked two-part standard, in the world's own material. */
  it("hangs the thread colourless for a location with no content", () => {
    const result = readThrow(c, "the thing in the first paragraph about the plaza");
    const { getByTestId } = render(
      <LoomStage callback={c} phase="thrown" result={result} />,
    );
    const reading = getByTestId("lo-reading");
    expect(reading.getAttribute("data-kind")).toBe("taut");
    expect(reading.textContent).toContain("did not say what it is");
  });

  /**
   * A slack thread that also used locational language must not be told it
   * pointed at the right place. That is two opposite things at once.
   */
  it("does not claim a slack thread pointed at the right place", () => {
    const result = readThrow(c, "the thing in the first paragraph about it");
    expect(result.kind).toBe("slack");
    const { getByTestId } = render(
      <LoomStage callback={c} phase="thrown" result={result} />,
    );
    const reading = getByTestId("lo-reading");
    expect(reading.textContent).toContain("nowhere to land");
    expect(reading.textContent).not.toContain("pointed at the right place");
  });

  it("names the wrong side when the student took the near-miss", () => {
    const planted = callbacks.find((x) => x.nearMiss)!;
    const result = readThrow(planted, planted.nearMiss!);
    const { getByTestId } = render(
      <LoomStage callback={planted} phase="thrown" result={result} />,
    );
    expect(getByTestId("lo-reading").textContent).toContain("other side");
  });

  it("gives the credited translation on anything short of a clean throw", () => {
    const result = readThrow(c, "no idea");
    const { getByTestId } = render(
      <LoomStage callback={c} phase="thrown" result={result} />,
    );
    expect(getByTestId("lo-reading").textContent).toContain(c.credited);
  });

  it("does not give the translation away on a clean throw", () => {
    const result = readThrow(c, c.credited);
    const { getByTestId } = render(
      <LoomStage callback={c} phase="thrown" result={result} />,
    );
    expect(getByTestId("lo-reading").textContent).toContain("stays for the rest of the run");
  });
});

describe("the spools and the margin", () => {
  it("shows no spools rather than faking a run", () => {
    const { queryByTestId } = render(<LoomStage callback={c} phase="call" />);
    expect(queryByTestId("lo-spools")).toBeNull();
  });

  it("counts only the threads that actually wove", () => {
    const woven = [
      { order: 1, phrase: "a", kind: "thread" as const },
      { order: 2, phrase: "b", kind: "taut" as const },
      { order: 3, phrase: "c", kind: "slack" as const },
    ];
    const { getByTestId } = render(<LoomStage callback={c} phase="call" woven={woven} />);
    expect(getByTestId("lo-spools").textContent).toContain("1 of 3 woven");
  });

  it("pins margin decodes when there are any", () => {
    const { getByTestId } = render(
      <LoomStage
        callback={c}
        phase="thrown"
        result={readThrow(c, c.credited)}
        decodes={[{ term: "CARTOGRAPHIC", meaning: "MAPMAKING" }]}
      />,
    );
    expect(getByTestId("lo-decodes").textContent).toContain("CARTOGRAPHIC = MAPMAKING");
  });
});

describe("every callback can be staged", () => {
  it("renders all 20 in both phases without throwing", () => {
    for (const cb of callbacks) {
      const { unmount, getByTestId } = render(
        <LoomStage callback={cb} phase="thrown" result={readThrow(cb, cb.credited)} />,
      );
      expect(getByTestId("loom"), `item ${cb.order}`).toBeTruthy();
      unmount();
    }
  });

  it("keeps the passage readable on the harder rungs too", () => {
    const q5 = callbacks.filter((x) => x.rung === 5);
    expect(q5.length).toBe(4);
    for (const cb of q5) {
      const { unmount, getByTestId } = render(<LoomStage callback={cb} phase="call" />);
      expect(getByTestId("lo-sheet-caller").textContent).toContain(cb.phrase);
      unmount();
    }
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the archive over after the sheets unroll", () => {
    const onDone = vi.fn();
    render(<LoomEntrance onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<LoomEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("loom-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("unrolls blank paper rather than pretending to show a passage", () => {
    const { getAllByTestId } = render(<LoomEntrance onDone={vi.fn()} />);
    const sheets = getAllByTestId("lo-entrance-sheet");
    expect(sheets.length).toBe(2);
    for (const s of sheets) expect(s.textContent).toBe("");
  });
});
