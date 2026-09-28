import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DrillRuns from "./DrillRuns";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => null } }));
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/drillRunLedger", () => ({ loadStandaloneDrillRun: load }));

describe("completed drill details", () => {
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
});
