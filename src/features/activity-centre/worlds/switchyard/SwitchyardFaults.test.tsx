import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { SwitchyardStage, type Milepost } from "./SwitchyardStage";
import { derivedFlip, diagnose, flipIsDerivable, parseRouting, type Routing } from "./routing";

// The fault choreography is the yard's error-specific feedback: each named
// partial gets its own visible failure. What matters is that the yard shows the
// student's own arrangement being corrected rather than jumping to the answer,
// and that it makes no claim at all when it cannot name the error.

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
const item = conditional.items[0];
const credited = parseRouting(item.credited_answers[0])!;

// Mirrors the registry: an item only gets a derivation if it passed the gate.
const derived = flipIsDerivable(item.credited_answers) ? derivedFlip(credited) : null;

function stage(studentRouting: Routing | null, phase: "routed" | "flipped" = "routed") {
  return render(
    <SwitchyardStage
      statement={item.prompt}
      routing={credited}
      contrapositive={item.credited_answers[1] ?? ""}
      derived={derived}
      phase={phase}
      studentRouting={studentRouting}
      fault={diagnose(credited, studentRouting)}
    />,
  );
}

/** The clause a capsule carries, with the polarity token read separately. */
function capsuleTexts(container: HTMLElement) {
  return [...container.querySelectorAll('[data-testid="sy-capsule"]')].map((c) => {
    const clone = c.cloneNode(true) as HTMLElement;
    clone.querySelector('[data-testid="sy-polarity"]')?.remove();
    return clone.textContent?.trim();
  });
}

const reversed: Routing = { ifClause: credited.thenClause, thenClause: credited.ifClause };

describe("the reversal", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("starts by standing the student's own arrangement up, not the credited one", () => {
    const { container } = stage(reversed);
    expect(capsuleTexts(container)).toEqual([
      credited.thenClause.text,
      credited.ifClause.text,
    ]);
  });

  it("drops the crossing gate before the capsules move", () => {
    const { container } = stage(reversed);
    expect(container.querySelector('[data-testid="sy-gate"]')?.getAttribute("data-dropped")).toBe(
      "false",
    );
    act(() => void vi.advanceTimersByTime(800));
    expect(container.querySelector('[data-testid="sy-gate"]')?.getAttribute("data-dropped")).toBe(
      "true",
    );
  });

  it("finishes on the credited arrangement, with the gate lifted", () => {
    const { container } = stage(reversed);
    act(() => void vi.advanceTimersByTime(2100));
    expect(capsuleTexts(container)).toEqual([credited.ifClause.text, credited.thenClause.text]);
    expect(container.querySelector('[data-testid="sy-gate"]')?.getAttribute("data-dropped")).toBe(
      "false",
    );
  });

  it("names the fault in a live region so it is announced, not only drawn", () => {
    const { container } = stage(reversed);
    const caption = container.querySelector('[data-testid="sy-fault"]')!;
    expect(caption.getAttribute("data-kind")).toBe("reversal");
    expect(caption.getAttribute("role")).toBe("status");
  });
});

describe("the dropped negation", () => {
  const negatedItem = conditional.items.find((i) => parseRouting(i.credited_answers[0])?.ifClause.negated)!;
  const negatedCredited = parseRouting(negatedItem.credited_answers[0])!;
  const lostPolarity: Routing = {
    ...negatedCredited,
    ifClause: { ...negatedCredited.ifClause, negated: false },
  };

  function negationStage() {
    return render(
      <SwitchyardStage
        statement={negatedItem.prompt}
        routing={negatedCredited}
        contrapositive={negatedItem.credited_answers[1] ?? ""}
        phase="routed"
        studentRouting={lostPolarity}
        fault={diagnose(negatedCredited, lostPolarity)}
      />,
    );
  }

  it("blinks the lamp on the affected capsule and no other", () => {
    const { container } = negationStage();
    const lamps = [...container.querySelectorAll('[data-testid="sy-lamp"]')] as HTMLElement[];
    expect(lamps.map((l) => l.dataset.blinking)).toEqual(["true", undefined]);
  });

  it("stops blinking once the student acknowledges it", () => {
    const { container, getByTestId } = negationStage();
    fireEvent.click(getByTestId("sy-ack"));
    const lamps = [...container.querySelectorAll('[data-testid="sy-lamp"]')] as HTMLElement[];
    expect(lamps.map((l) => l.dataset.blinking)).toEqual([undefined, undefined]);
    expect(container.querySelector('[data-testid="sy-ack"]')).toBeNull();
  });
});

describe("the trimmed condition", () => {
  const full = parseRouting(
    "If the charts are accepted rather than merely submitted for review, then the audit closes.",
  )!;
  const trimmed: Routing = {
    ...full,
    ifClause: { text: "the charts are accepted", negated: false },
  };

  it("marks the capsule incomplete and docks the full form alongside it", () => {
    const { container } = render(
      <SwitchyardStage
        statement="The charts are accepted rather than merely submitted for review."
        routing={full}
        contrapositive=""
        phase="routed"
        studentRouting={trimmed}
        fault={diagnose(full, trimmed)}
      />,
    );
    expect(container.querySelector('[data-trimmed="true"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="sy-fullform"]')?.textContent).toContain(
      full.ifClause.text,
    );
  });
});

describe("the yard's restraint", () => {
  it("plays no fault at all on a clean answer", () => {
    const { container } = stage(credited);
    expect(container.querySelector('[data-testid="sy-fault"]')).toBeNull();
    expect(container.querySelector('[data-testid="sy-your-routing"]')).toBeNull();
  });

  it("drops the fault display once the junction turns, so nothing fights the flip", () => {
    const { container } = stage(reversed, "flipped");
    expect(container.querySelector('[data-testid="sy-fault"]')).toBeNull();
  });

  it("shows the student's own routing alongside only when it differed", () => {
    const { container } = stage(reversed);
    const yours = container.querySelector('[data-testid="sy-your-routing"]')!;
    expect(yours.textContent).toContain(credited.thenClause.text);
  });
});

describe("mileposts", () => {
  const mileposts: Milepost[] = [
    { order: 1, outcome: "correct" },
    { order: 2, outcome: "partial" },
    { order: 3, outcome: null },
    { order: 4, outcome: null },
  ];

  it("marks only the items the student actually answered", () => {
    const { container } = render(
      <SwitchyardStage
        statement={item.prompt}
        routing={credited}
        contrapositive=""
        phase="routed"
        mileposts={mileposts}
        currentOrder={3}
      />,
    );
    const marks = [...container.querySelectorAll(".sy-milepost")] as HTMLElement[];
    expect(marks.map((m) => m.dataset.outcome)).toEqual([
      "correct",
      "partial",
      "ahead",
      "ahead",
    ]);
    expect(marks[2].dataset.current).toBe("true");
    expect(container.querySelector('[data-testid="sy-mileposts"]')?.textContent).toContain(
      "2 of 4 down the line",
    );
  });

  it("renders none at all rather than inventing a position", () => {
    const { container } = render(
      <SwitchyardStage
        statement={item.prompt}
        routing={credited}
        contrapositive=""
        phase="routed"
      />,
    );
    expect(container.querySelector('[data-testid="sy-mileposts"]')).toBeNull();
  });
});
