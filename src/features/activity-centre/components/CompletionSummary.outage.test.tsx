import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CompletionSummary } from "./CompletionSummary";
import { scoreFor } from "../progress";
import type { ActivityItem, Verdict } from "../api/types";

// What the summary is allowed to claim. A Coach outage used to arrive here as a
// red "Not yet" on the item and a percentage computed as though the student had
// got it wrong, with nothing on the screen admitting either.

const items: ActivityItem[] = Array.from({ length: 4 }, (_, i) => ({
  order: i + 1,
  prompt: `Statement ${i + 1}.`,
  credited_answers: [`If a${i}, then b${i}.`],
  explanation: `"trigger" (sufficient).`,
}));

const verdicts = (v: (Verdict | null)[]) =>
  Object.fromEntries(v.map((verdict, i) => [i + 1, verdict])) as Record<number, Verdict | null>;

function show(v: (Verdict | null)[]) {
  const map = verdicts(v);
  render(
    <MemoryRouter>
      <CompletionSummary
        title="Conditional Rephrase"
        items={items}
        verdicts={map}
        responses={{}}
        score={scoreFor(map, items.length)}
      />
    </MemoryRouter>,
  );
}

describe("what the summary says when the Coach could not be reached", () => {
  it("scores over what was checked, not over what was attempted", () => {
    show(["correct", "correct", "correct", null]);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("names the denominator it used", () => {
    show(["correct", "correct", "correct", null]);
    expect(screen.getByText(/3 of 4 checked/)).toBeInTheDocument();
  });

  it("says the unchecked answer counts neither way", () => {
    show(["correct", "correct", "correct", null]);
    expect(screen.getByText(/could not be checked/)).toBeInTheDocument();
    expect(screen.getByText(/not counted for or against you/)).toBeInTheDocument();
  });

  it("calls the unjudged item not checked, not skipped", () => {
    show(["correct", "correct", "correct", null]);
    expect(screen.getByText("Not checked")).toBeInTheDocument();
    expect(screen.queryByText("Skipped")).not.toBeInTheDocument();
  });

  it("shows no percentage at all when nothing was checked", () => {
    show([null, null, null, null]);
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("says nothing about outages on a run where every item was judged", () => {
    show(["correct", "correct", "partial", "incorrect"]);
    expect(screen.getByText(/4 items/)).toBeInTheDocument();
    expect(screen.queryByText(/could not be checked/)).not.toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
  });
});
