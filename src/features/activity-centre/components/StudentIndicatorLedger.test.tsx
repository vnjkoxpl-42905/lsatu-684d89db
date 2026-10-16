import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndicatorLedgerReport } from "./StudentIndicatorLedger";
import { buildIndicatorLedger, familiesAcrossRuns, type AssignmentLedger } from "../ledger";
import type { ActivityItem, Verdict } from "../api/types";

vi.mock("@/lib/time", () => ({ formatRelativeShort: () => "3d ago" }));

function item(order: number, category: string): ActivityItem {
  return { order, prompt: `p${order}`, credited_answers: ["a"], explanation: "", category };
}

const ITEMS = [
  item(1, "Negative requirement: unless"),
  item(2, "Same rule, new seat: unless"),
  item(3, "Trigger word: if"),
];

function runFor(verdicts: Record<number, Verdict | null>, id = "a1"): AssignmentLedger {
  const ledger = buildIndicatorLedger("Conditional Rephrase", ITEMS, verdicts)!;
  return {
    assignmentId: id,
    title: "Conditional Rephrase",
    status: "completed",
    startedAt: "2026-08-20T00:00:00.000Z",
    completedAt: "2026-08-21T00:00:00.000Z",
    resolved: Object.keys(verdicts).length,
    total: ITEMS.length,
    ledger,
  };
}

describe("the dossier's indicator ledger", () => {
  it("leads with the family costing the student the most", () => {
    const runs = [runFor({ 1: "incorrect", 2: "incorrect", 3: "correct" })];
    render(<IndicatorLedgerReport runs={runs} families={familiesAcrossRuns(runs)} />);
    const rows = screen.getAllByTestId(/^student-ledger-/);
    expect(rows[0]).toHaveAttribute("data-testid", "student-ledger-negative-requirement");
    expect(rows[0].textContent).toContain("unless ×2");
    expect(rows[0].textContent).toContain("2");
  });

  it("lists only the families that cost marks, never the clean ones", () => {
    const runs = [runFor({ 1: "incorrect", 3: "correct" })];
    render(<IndicatorLedgerReport runs={runs} families={familiesAcrossRuns(runs)} />);
    expect(screen.queryByTestId("student-ledger-trigger")).not.toBeInTheDocument();
  });

  it("says so plainly when a student missed nothing", () => {
    const runs = [runFor({ 1: "correct", 3: "correct" })];
    render(<IndicatorLedgerReport runs={runs} families={familiesAcrossRuns(runs)} />);
    expect(screen.getByText("Nothing missed across their run.")).toBeInTheDocument();
  });

  it("names the runs the numbers were read from, so a count is checkable", () => {
    const runs = [runFor({ 1: "incorrect", 3: "correct" })];
    render(<IndicatorLedgerReport runs={runs} families={familiesAcrossRuns(runs)} />);
    expect(screen.getByText("Conditional Rephrase")).toBeInTheDocument();
    expect(screen.getByText("1 missed of 2 checked")).toBeInTheDocument();
  });

  it("says how far an unfinished run got, and stays quiet on a finished one", () => {
    const partial = [runFor({ 1: "incorrect" })];
    const { unmount } = render(
      <IndicatorLedgerReport runs={partial} families={familiesAcrossRuns(partial)} />,
    );
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
    unmount();

    const whole = [runFor({ 1: "incorrect", 2: "correct", 3: "correct" })];
    render(<IndicatorLedgerReport runs={whole} families={familiesAcrossRuns(whole)} />);
    expect(screen.queryByText(/of 3 answered/)).not.toBeInTheDocument();
  });

  it("counts across runs while still listing each run separately", () => {
    const runs = [
      runFor({ 1: "incorrect", 3: "correct" }, "a1"),
      runFor({ 1: "incorrect", 3: "correct" }, "a2"),
    ];
    render(<IndicatorLedgerReport runs={runs} families={familiesAcrossRuns(runs)} />);
    // Merged: two misses on the same word.
    expect(screen.getByTestId("student-ledger-negative-requirement").textContent).toContain(
      "unless ×2",
    );
    // Unmerged: both runs still named underneath.
    expect(screen.getAllByText("Conditional Rephrase")).toHaveLength(2);
  });
});
