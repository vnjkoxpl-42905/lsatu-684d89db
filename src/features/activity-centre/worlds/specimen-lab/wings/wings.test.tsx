import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { BoundaryRoom } from "./BoundaryRoom";
import { ChargeRound } from "./ChargeRound";
import { buildBoundaryRound, buildChargeRound } from "./rounds";

const vocab = SEED_ACTIVITIES.find((a) => a.slug === "vocab-rehab")!;
const boundary = buildBoundaryRound(vocab.items);
const charge = buildChargeRound(vocab.items);

describe("building the rounds", () => {
  it("pairs every authored trap with a credited candidate, so the call is even", () => {
    expect(boundary.length).toBe(10);
    const accepts = boundary.filter((c) => c.verdict === "accept").length;
    expect(accepts).toBe(boundary.length - accepts);
  });

  it("does not put the same verdict in a run a student could ride", () => {
    const verdicts = boundary.map((c) => c.verdict);
    // Alternating lead means no three in a row anywhere.
    for (let i = 0; i + 2 < verdicts.length; i += 1) {
      expect(new Set(verdicts.slice(i, i + 3)).size, `at ${i}`).toBeGreaterThan(1);
    }
  });

  it("takes both sides of every call from the bank's own words", () => {
    for (const c of boundary) {
      expect(c.proposal.length).toBeGreaterThan(1);
      expect(c.why.length).toBeGreaterThan(10);
    }
  });

  it("only charges the items whose own text fixes one", () => {
    expect(charge.map((c) => c.order)).toEqual([16, 35, 48, 50]);
  });
});

describe("the Boundary Room", () => {
  it("holds the boundary when the near-miss is rejected", () => {
    const reject = boundary.find((c) => c.verdict === "reject")!;
    const { getByTestId } = render(<BoundaryRoom round={[reject]} />);
    fireEvent.click(getByTestId("sl-reject"));
    expect(getByTestId("sl-boundary-verdict").textContent).toContain("Boundary held");
  });

  it("calls it crossed when a near-miss is let through", () => {
    const reject = boundary.find((c) => c.verdict === "reject")!;
    const { getByTestId } = render(<BoundaryRoom round={[reject]} />);
    fireEvent.click(getByTestId("sl-accept"));
    expect(getByTestId("sl-boundary-verdict").textContent).toContain("Boundary crossed");
  });

  it("credits accepting a candidate that is inside the line", () => {
    const accept = boundary.find((c) => c.verdict === "accept")!;
    const { getByTestId } = render(<BoundaryRoom round={[accept]} />);
    fireEvent.click(getByTestId("sl-accept"));
    expect(getByTestId("sl-boundary-verdict").textContent).toContain("Boundary held");
  });

  it("never shows the authored asterisks to a student", () => {
    const { container } = render(<BoundaryRoom round={boundary} />);
    expect(container.textContent).not.toContain("*");
  });

  it("counts the room honestly", () => {
    const round = boundary.slice(0, 2);
    const { getByTestId, container } = render(<BoundaryRoom round={round} />);
    for (const c of round) {
      // Answer every one wrong on purpose.
      fireEvent.click(getByTestId(c.verdict === "accept" ? "sl-reject" : "sl-accept"));
      fireEvent.click(getByTestId("sl-boundary-next"));
    }
    expect(container.textContent).toContain(`0 of ${round.length} boundaries held`);
  });

  it("says so plainly when no item names a near-miss", () => {
    const { container } = render(<BoundaryRoom round={[]} />);
    expect(container.textContent).toContain("None in this set do");
  });
});

describe("the Charge Round", () => {
  it("scores a call against the charge the item itself fixed", () => {
    const { getByTestId } = render(<ChargeRound round={charge.slice(0, 1)} />);
    fireEvent.click(getByTestId(`sl-charge-${charge[0].charge}`));
    expect(getByTestId("sl-charge-verdict").textContent).toContain("Called right");
  });

  it("takes the one-phrase justification without scoring it", () => {
    const { getByTestId } = render(<ChargeRound round={charge.slice(0, 1)} />);
    fireEvent.change(getByTestId("sl-charge-because"), { target: { value: "the wariness" } });
    expect((getByTestId("sl-charge-because") as HTMLInputElement).value).toBe("the wariness");
  });

  it("renders an honest empty state rather than scoring against a valence nobody authored", () => {
    const { getByTestId } = render(<ChargeRound round={[]} />);
    expect(getByTestId("charge-round-empty").textContent).toContain("None in this set do");
  });
});
