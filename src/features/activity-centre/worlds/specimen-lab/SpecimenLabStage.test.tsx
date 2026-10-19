import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { SpecimenLabStage, type BenchPhase, type Slide } from "./SpecimenLabStage";
import { parseSpecimen, readExamination, type Specimen } from "./specimen";

// The bench's claim is that it shows the student their own process. These pin
// the two halves of that: nothing is given away before they commit, and after
// they commit only what they actually used is lit.

const vocab = SEED_ACTIVITIES.find((a) => a.slug === "vocab-rehab")!;
const specimenOf = (order: number) =>
  parseSpecimen(vocab.items.find((i) => i.order === order)!)!;

function bench(specimen: Specimen, phase: BenchPhase, response?: string, drawer?: Slide[]) {
  return render(
    <SpecimenLabStage
      specimen={specimen}
      phase={phase}
      reading={response ? readExamination(response, specimen) : null}
      drawer={drawer}
    />,
  );
}

const litState = (c: HTMLElement) =>
  Object.fromEntries(
    [...c.querySelectorAll("[data-instrument]")].map((el) => [
      (el as HTMLElement).dataset.instrument,
      (el as HTMLElement).dataset.lit,
    ]),
  );

describe("the bench before the student commits", () => {
  it("holds the plate blank", () => {
    const { getByTestId } = bench(specimenOf(27), "collection");
    expect(getByTestId("sl-plate").dataset.engraved).toBe("false");
    expect(getByTestId("sl-plate").textContent).toContain("unidentified");
  });

  it("leaves every instrument dark", () => {
    const { container } = bench(specimenOf(27), "collection");
    expect(litState(container)).toEqual({ charge: "false", contrast: "false", relation: "false" });
  });

  it("highlights nothing in the field note, so no evidence is given away", () => {
    const { container } = bench(specimenOf(27), "collection");
    expect(container.querySelector('[data-testid="sl-cited"]')).toBeNull();
  });

  it("still marks the collected word, which the bank authored", () => {
    const { getByTestId } = bench(specimenOf(27), "collection");
    expect(getByTestId("sl-target").textContent).toBe("truculent");
  });
});

describe("the reading", () => {
  it("engraves the credited candidates on the plate", () => {
    const { getByTestId } = bench(specimenOf(27), "read", "it means aggressive");
    const plate = getByTestId("sl-plate");
    expect(plate.dataset.engraved).toBe("true");
    expect(plate.textContent).toContain("aggressive");
    expect(plate.textContent).toContain("hostile");
  });

  it("lights only the instruments the student's own reasoning used", () => {
    const { container } = bench(
      specimenOf(27),
      "read",
      "It means aggressive, because it is set against normally accommodating.",
    );
    const state = litState(container);
    expect(state.contrast).toBe("true");
    // No explicit valence call was made, so that gauge stays dark.
    expect(state.charge).toBe("false");
  });

  it("picks out the wording the student cited", () => {
    const { container } = bench(
      specimenOf(27),
      "read",
      "because it is set against normally accommodating",
    );
    const marks = [...container.querySelectorAll('[data-testid="sl-cited"]')].map((m) =>
      m.textContent?.trim(),
    );
    expect(marks.join(" ")).toContain("normally");
  });

  it("leaves the bench dark for an answer that cited nothing", () => {
    const { container } = bench(specimenOf(27), "read", "I already knew this word");
    expect(litState(container)).toEqual({ charge: "false", contrast: "false", relation: "false" });
  });
});

describe("the precision boundary", () => {
  it("renders the near-miss outside the line on an item that authored one", () => {
    const { getByTestId } = bench(specimenOf(47), "read", "it means impartial");
    expect(getByTestId("sl-boundary").textContent).toContain("uninterested");
  });

  it("renders no boundary on an item that authored none", () => {
    const { queryByTestId } = bench(specimenOf(27), "read", "it means aggressive");
    expect(queryByTestId("sl-boundary")).toBeNull();
  });
});

describe("the specimen drawer", () => {
  it("marks only the specimens the student actually filed", () => {
    const drawer: Slide[] = [
      { order: 1, word: "imperative", outcome: "correct" },
      { order: 2, word: "authenticity", outcome: "partial" },
      { order: 27, word: "truculent", outcome: null },
    ];
    const { container, getByTestId } = bench(specimenOf(27), "collection", undefined, drawer);
    const slides = [...container.querySelectorAll(".sl-slide")] as HTMLElement[];
    expect(slides.map((s) => s.dataset.outcome)).toEqual(["correct", "partial", "empty"]);
    expect(slides[2].dataset.current).toBe("true");
    expect(getByTestId("sl-drawer").textContent).toContain("2 of 3 filed");
  });

  it("renders no drawer at all rather than an invented run", () => {
    const { queryByTestId } = bench(specimenOf(27), "collection");
    expect(queryByTestId("sl-drawer")).toBeNull();
  });
});

describe("every specimen in the bank", () => {
  it("renders on the bench in both phases without throwing or leaking a marker", () => {
    for (const item of vocab.items) {
      const s = parseSpecimen(item)!;
      for (const phase of ["collection", "read"] as const) {
        const { container, unmount } = bench(s, phase, item.credited_answers[0]);
        expect(container.textContent, `item ${s.order} ${phase}`).not.toContain("*");
        unmount();
      }
    }
  });
});
