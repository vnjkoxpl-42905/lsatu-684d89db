import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { PressStage } from "./PressStage";
import { PressEntrance } from "./PressEntrance";
import { parsePress, readStroke } from "./press";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "dumb-it-down")!;
const press = parsePress(drill.items[0])!;

describe("the bed", () => {
  it("stands the paragraph as the monolith before any stroke", () => {
    const { getByTestId, queryByTestId } = render(<PressStage press={press} phase="arrival" />);
    expect(getByTestId("press-monolith").textContent).toContain(press.monolith.slice(0, 40));
    expect(getByTestId("press-monolith").getAttribute("data-ghosted")).toBe("false");
    expect(queryByTestId("press-slugs")).toBeNull();
  });

  it("prints the credited slug beside the student's on a good stroke", () => {
    const stroke = readStroke(press.slug, press);
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={press.slug} stroke={stroke} />,
    );
    expect(getByTestId("press-slug-credited").textContent).toContain(press.slug);
    expect(getByTestId("press-slug-student").textContent).toContain(press.slug);
    expect(getByTestId("press-monolith").getAttribute("data-ghosted")).toBe("true");
  });

  it("stages the too-narrow trap as its own slug with the authored caption", () => {
    const narrow = press.traps.narrow!;
    const stroke = readStroke(narrow, press);
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={narrow} stroke={stroke} />,
    );
    expect(getByTestId("press-slug-narrow")).toBeTruthy();
    expect(getByTestId("press-caption").textContent).toContain("too small");
  });

  it("stops the stroke at one sentence when the student wrote two", () => {
    const sprawl = `${press.slug} It also matters for other reasons.`;
    const stroke = readStroke(sprawl, press);
    expect(stroke.trap).toBe("sprawl");
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={sprawl} stroke={stroke} />,
    );
    expect(getByTestId("press-caption").textContent).toContain("One sentence");
  });

  it("leaves the monolith standing when the platen refuses", () => {
    const { getByTestId, queryByTestId } = render(<PressStage press={press} phase="refused" />);
    expect(getByTestId("press-monolith").getAttribute("data-ghosted")).toBe("false");
    expect(getByTestId("press-platen").getAttribute("data-down")).toBe("false");
    expect(queryByTestId("press-refusal")).toBeTruthy();
  });
});

describe("the checklist", () => {
  it("renders unticked when nobody has judged coverage", () => {
    const stroke = readStroke(press.slug, press);
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={press.slug} stroke={stroke} />,
    );
    const list = getByTestId("press-checklist");
    expect(list.getAttribute("data-judged")).toBe("false");
    expect(list.textContent).toContain("What had to survive");
    expect(list.querySelectorAll('[data-state="unjudged"]').length).toBe(press.ideas.length);
    // The important half: an unjudged idea is never shown as lost.
    expect(list.querySelectorAll('[data-state="lost"]').length).toBe(0);
  });

  it("ticks exactly the ideas the Coach says survived", () => {
    const covered = [press.ideas[0].n];
    const stroke = readStroke(press.slug, press, covered);
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={press.slug} stroke={stroke} />,
    );
    const list = getByTestId("press-checklist");
    expect(list.getAttribute("data-judged")).toBe("true");
    expect(list.textContent).toContain("What survived");
    expect(list.querySelectorAll('[data-state="kept"]').length).toBe(1);
    expect(list.querySelectorAll('[data-state="lost"]').length).toBe(press.ideas.length - 1);
  });

  it("distinguishes a judged none from an unjudged nothing", () => {
    const stroke = readStroke(press.slug, press, []);
    const { getByTestId } = render(
      <PressStage press={press} phase="struck" response={press.slug} stroke={stroke} />,
    );
    const list = getByTestId("press-checklist");
    expect(list.getAttribute("data-judged")).toBe("true");
    expect(list.querySelectorAll('[data-state="lost"]').length).toBe(press.ideas.length);
  });
});

describe("the gauge and the spike", () => {
  it("reads the student's length against the credited slug's own", () => {
    const short = "Keepers polished lenses.";
    const { getByTestId } = render(
      <PressStage press={press} phase="arrival" response={short} stroke={readStroke(short, press)} />,
    );
    expect(getByTestId("press-gauge").getAttribute("data-state")).toBe("short");
  });

  it("prints nothing on the spike rather than faking a run", () => {
    const { queryByTestId } = render(<PressStage press={press} phase="arrival" />);
    expect(queryByTestId("press-spike")).toBeNull();
  });

  it("shows finished lines on the spike when there are real ones", () => {
    const spike = [{ order: 1, slug: press.slug }];
    const { getByTestId } = render(
      <PressStage press={press} phase="arrival" spike={spike} />,
    );
    expect(getByTestId("press-spike").textContent).toContain("1 line");
  });
});

describe("the entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hands the room over once the monolith has landed", () => {
    const onDone = vi.fn();
    render(<PressEntrance onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1800));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<PressEntrance onDone={onDone} />);
    fireEvent.click(getByTestId("press-entrance-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows the mass without pretending to show the paragraph's words", () => {
    const { getByTestId } = render(<PressEntrance onDone={vi.fn()} />);
    expect(getByTestId("press-entrance-monolith").textContent).toBe("");
  });
});
