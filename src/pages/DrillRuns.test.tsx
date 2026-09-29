import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DrillRuns from "./DrillRuns";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => null } }));
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/drillRunLedger", () => ({ loadStandaloneDrillRun: load }));

describe("completed drill details", () => {
  it("keeps an assigned guided sitting on its own Results and Review route", async () => {
    load.mockResolvedValue({
      id: "guided-1", user_id: "student-1", source_key: "guided::assignment-1", mode: "type-drill", label: "Spot the Relationship",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1", "q-2", "q-3"], attempts: [{ qid: "q-1", selected_answer: "B", correct: true }] },
    });
    render(<MemoryRouter initialEntries={["/practice/drills/runs/guided-1?view=results"]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Spot the Relationship" })).toBeInTheDocument());
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("1 / 1");
    fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByLabelText("Answer review")).toHaveTextContent("q-1");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-2");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-3");
  });
  it("shows saved results and a truthful unavailable-question review", async () => {
    load.mockResolvedValue({
      id: "run-1", user_id: "student-1", source_key: "set-1", mode: "type-drill", label: "Flaw set",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1"], attempts: [{ qid: "q-1", selected_answer: "B", correct: false }] },
    });
    render(<MemoryRouter initialEntries={["/practice/drills/runs/run-1?view=review"]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Flaw set" })).toBeInTheDocument());
    expect(screen.getByLabelText("Answer review")).toHaveTextContent("Incorrect");
    expect(screen.getByLabelText("Answer review")).toHaveTextContent("q-1");
  });

  it("reviews only answered Smart Drill questions, not its eligible bank", async () => {
    load.mockResolvedValue({
      id: "smart-1", user_id: "student-1", source_key: "drill::adaptive", mode: "adaptive", label: "Smart Drill",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1", "q-2", "q-3"], attempts: [
        { qid: "q-2", selected_answer: "B", correct: false },
      ] },
    });
    render(<MemoryRouter initialEntries={["/practice/drills/runs/smart-1?view=results"]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Smart Drill" })).toBeInTheDocument());
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("0 / 1");
    fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByLabelText("Answer review")).toHaveTextContent("q-2");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-1");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-3");
  });
});
