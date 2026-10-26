import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwitchyardStage } from "./SwitchyardStage";
import { derivedFlip, parseRouting } from "./routing";

// What the yard is allowed to show. The junction had never turned in the
// shipped app, because a flipped rail would have carried the ORIGINAL clause
// text under an inverted lamp and contradicted the plate beneath it.

const routing = parseRouting("If the generator is not refueled by dusk, then the beacon goes dark.")!;
const derived = derivedFlip(routing)!;
const CONTRAPOSITIVE = "If the beacon did not go dark, the generator was refueled by dusk.";

function renderYard(props: Partial<React.ComponentProps<typeof SwitchyardStage>> = {}) {
  return render(
    <SwitchyardStage
      statement="Unless the generator is refueled by dusk, the beacon goes dark."
      routing={routing}
      contrapositive={CONTRAPOSITIVE}
      derived={derived}
      phase="routed"
      {...props}
    />,
  );
}

const rails = () => screen.getAllByTestId("sy-capsule").map((c) => c.textContent);

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const holdOut = async () => {
  await act(async () => {
    vi.advanceTimersByTime(1400);
  });
};

describe("the flip, for an item that passed the gate", () => {
  it("holds the routed arrangement before turning", () => {
    renderYard();
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "false");
    expect(rails()[0]).toContain("the generator is not refueled by dusk");
  });

  it("turns the junction once the hold is out", async () => {
    renderYard();
    await holdOut();
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "true");
  });

  // The defect: the rail used to keep the original words and only invert a lamp.
  it("carries the clauses across as text that agrees with the plate", async () => {
    renderYard();
    await holdOut();
    const [ifRail, thenRail] = rails();
    expect(ifRail).toContain("the beacon goes dark");
    expect(ifRail).toContain("NOT");
    expect(thenRail).toContain("the generator is refueled by dusk");
    expect(thenRail).not.toContain("NOT");
  });

  it("says the polarity in words, not only with a lamp", async () => {
    renderYard();
    await holdOut();
    const [ifPolarity, thenPolarity] = screen.getAllByTestId("sy-polarity");
    expect(ifPolarity).toHaveTextContent("NOT");
    expect(ifPolarity).toHaveClass("sy-polarity"); // shown, not only announced
    expect(thenPolarity).toHaveTextContent("positive");
    expect(thenPolarity).toHaveClass("sr-only"); // nothing to show on a positive clause
  });

  it("offers the flip as something the student can replay", async () => {
    renderYard();
    await holdOut();
    const replay = screen.getByTestId("sy-replay");
    act(() => replay.click());
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "false");
    expect(rails()[0]).toContain("the generator is not refueled by dusk");
  });

  it("never turns over a fault, where the student is watching their own correction", async () => {
    renderYard({ fault: { kind: "reversal", side: "both" } });
    await holdOut();
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "false");
  });

  it("waits for the routing before flipping anything", async () => {
    renderYard({ phase: "arrival" });
    await holdOut();
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "false");
  });
});

describe("the flip, for an item that failed the gate", () => {
  const plateOnly = { derived: null };

  it("leaves the junction still", async () => {
    renderYard(plateOnly);
    await holdOut();
    expect(screen.getByTestId("sy-junction").firstChild).toHaveAttribute("data-turned", "false");
  });

  it("draws no derived rails at all", async () => {
    renderYard(plateOnly);
    await holdOut();
    // The clauses stay exactly as authored, on the tracks they were routed to.
    expect(rails()[0]).toContain("the generator is not refueled by dusk");
    expect(rails()[1]).toContain("the beacon goes dark");
    // Polarity is still announced, but never shown as a token: a visible NOT
    // beside an unflipped clause would be claiming a derivation that was gated.
    for (const node of screen.getAllByTestId("sy-polarity")) {
      expect(node).toHaveClass("sr-only");
    }
  });

  it("offers no replay control for a flip it cannot perform", async () => {
    renderYard(plateOnly);
    await holdOut();
    expect(screen.queryByTestId("sy-replay")).not.toBeInTheDocument();
  });

  it("still carries the authored contrapositive on its plate", async () => {
    renderYard(plateOnly);
    await holdOut();
    expect(screen.getByText(CONTRAPOSITIVE)).toBeInTheDocument();
  });
});
