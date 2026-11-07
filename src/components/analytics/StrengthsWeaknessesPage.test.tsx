import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyTypes } from "@/lib/strengthsWeaknesses";
import type { StrengthsResult } from "@/hooks/useStrengthsWeaknesses";

const hook = vi.hoisted(() => ({ value: null as unknown as StrengthsResult }));
const nav = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useStrengthsWeaknesses", () => ({ useStrengthsWeaknesses: () => hook.value }));
vi.mock("@/components/review/ReviewProgressSnapshotBoundary", () => ({ useReviewProgressSnapshot: () => null }));
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => nav }));

import StrengthsWeaknessesPage from "./StrengthsWeaknessesPage";

const row = (topic: string, correct: number, denominator: number) => ({
  topic, correct, denominator, percent: null, evidenceAttemptIds: [],
});
const ready = (rows: ReturnType<typeof row>[], withheld = false): StrengthsResult => {
  const denominator = rows.reduce((n, r) => n + r.denominator, 0);
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  return {
    status: "ready", summary: classifyTypes(rows, withheld), asOf: "2026-11-06T00:00:00.000Z", refresh: vi.fn(),
    overall: { correct, denominator, percent: denominator >= 3 ? Math.round((100 * correct) / denominator) : null },
  };
};
const renderPage = () => render(<MemoryRouter><StrengthsWeaknessesPage /></MemoryRouter>);

describe("StrengthsWeaknessesPage", () => {
  beforeEach(() => { nav.mockClear(); });

  it("labels strengths, weaknesses and what is still building", () => {
    hook.value = ready([row("Main Conclusion", 9, 10), row("Flaw", 2, 10), row("Role", 1, 2)]);
    renderPage();
    expect(screen.getByRole("region", { name: "Strengths" })).toHaveTextContent("Main Conclusion");
    expect(screen.getByRole("region", { name: "Weaknesses" })).toHaveTextContent("Flaw");
    expect(screen.getByRole("region", { name: "Still building" })).toHaveTextContent("Role");
    expect(screen.getByRole("region", { name: "Strengths" })).not.toHaveTextContent("Role");
  });

  it("opens the questions behind a type and starts practice on the weakest", () => {
    hook.value = ready([row("Flaw", 2, 10)]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Flaw, 20 percent/ }));
    expect(nav).toHaveBeenCalledWith("/review/progress?mode=types&progressType=Flaw");
    fireEvent.click(screen.getByRole("button", { name: /Practise 6 Flaw questions/ }));
    expect(String(nav.mock.calls.at(-1)![0]).startsWith("/drill?")).toBe(true);
  });

  it("explains an empty record instead of showing empty lists", () => {
    hook.value = ready([]);
    renderPage();
    expect(screen.getByText(/You have no saved first answers yet/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Strengths" })).toBeNull();
  });

  it("sorts nothing when a source is missing", () => {
    hook.value = ready([row("Flaw", 2, 10)], true);
    renderPage();
    expect(screen.getByText(/nothing is sorted right now/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Weaknesses" })).toBeNull();
  });
});
