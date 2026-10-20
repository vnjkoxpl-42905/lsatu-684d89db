import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CompletionSummary } from "./CompletionSummary";
import type { ActivityItem, Verdict } from "../api/types";
import type { RunScore } from "../progress";

// The completion screen used to end at a score and sixty-two rows of "Not yet".
// The ledger is the same data said as a diagnosis. These pin what it claims,
// because every claim on it is a count and a wrong count is a lie about the
// student's own work.

function item(order: number, category: string): ActivityItem {
  return {
    order,
    prompt: `Statement number ${order}.`,
    credited_answers: [`Answer ${order}.`],
    explanation: "",
    category,
  };
}

const ITEMS: ActivityItem[] = [
  item(1, "Negative requirement: unless"),
  item(2, "Same rule, new seat: unless"),
  item(3, "Negative requirement: without"),
  item(4, "Trigger word: if"),
  item(5, "Trigger word: when"),
  item(6, "Requirement word: only if"),
];

const VERDICTS: Record<number, Verdict | null> = {
  1: "incorrect",
  2: "incorrect",
  3: "partial",
  4: "correct",
  5: "correct",
  6: "correct",
};

const SCORE: RunScore = { numerator: 3.5, judged: 6, total: 6, percent: 58 };

function renderSummary(props: Partial<Parameters<typeof CompletionSummary>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CompletionSummary
        title="Conditional Rephrase"
        items={ITEMS}
        verdicts={VERDICTS}
        responses={{}}
        score={SCORE}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("the ledger on the completion screen", () => {
  it("names the word that cost the most", () => {
    renderSummary();
    expect(screen.getByText("unless cost you 2 questions.")).toBeInTheDocument();
  });

  it("groups the misses into families instead of listing every category", () => {
    const { container } = renderSummary();
    const ledger = container.querySelector('[data-testid="indicator-ledger"]') as HTMLElement;
    expect(ledger.textContent).toContain("Negative requirements");
    expect(ledger.textContent).toContain("3 of 3 missed");
    // The word, once, with its count -- not the two category labels behind it.
    expect(ledger.textContent).toContain("unless");
    expect(ledger.textContent).not.toContain("Same rule, new seat");
  });

  it("says which families were clean", () => {
    const { container } = renderSummary();
    const ledger = container.querySelector('[data-testid="indicator-ledger"]') as HTMLElement;
    expect(ledger.textContent).toContain("Clean: Trigger words, Requirement words.");
  });

  it("offers the misses as a re-drill, counted", () => {
    const onRedrill = vi.fn();
    renderSummary({ onRedrill });
    const button = screen.getByRole("button", { name: "Re-drill the 3 you missed" });
    fireEvent.click(button);
    expect(onRedrill).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("hides the re-drill when nobody can run it", () => {
    renderSummary();
    expect(screen.queryByTestId("ledger-redrill")).not.toBeInTheDocument();
  });

  it("has a different sentence for a clean run, and no re-drill", () => {
    renderSummary({
      verdicts: { 1: "correct", 2: "correct", 3: "correct" },
      onRedrill: vi.fn(),
    });
    expect(screen.getByText(/Nothing missed/)).toBeInTheDocument();
    expect(screen.queryByTestId("ledger-redrill")).not.toBeInTheDocument();
  });

  it("stays off an Activity nobody has grouped, rather than inventing families", () => {
    renderSummary({ title: "Vocab Rehab" });
    expect(screen.queryByTestId("indicator-ledger")).not.toBeInTheDocument();
  });

  it("stays off a run where nothing was judged, which is not the same as a clean one", () => {
    renderSummary({ verdicts: { 1: null, 2: null } });
    expect(screen.queryByTestId("indicator-ledger")).not.toBeInTheDocument();
  });

  it("still lists every item underneath, so the ledger adds a view and removes none", () => {
    renderSummary();
    expect(screen.getByText("Statement number 4.")).toBeInTheDocument();
    expect(screen.getByText("Statement number 6.")).toBeInTheDocument();
  });
});
