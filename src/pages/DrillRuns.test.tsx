import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DrillRuns from "./DrillRuns";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/hooks/useClassId", () => ({ useClassId: () => ({ classId: "c-1", loading: false, error: null }) }));
vi.mock("@/hooks/useQuestionStudyMarks", () => ({ useQuestionStudyMarks: () => ({ notes: new Map(), note: () => null, hasNote: () => false, isBookmarked: () => false, hasDrawing: () => false, classId: "c-1", saveNote: vi.fn(), toggleBookmark: vi.fn() }), noteHasContent: () => false }));
vi.mock("@/hooks/useAnswerPopularity", () => ({ useAnswerPopularity: () => ({ data: {} }) }));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => null } }));
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/drillRunLedger", () => ({ loadStandaloneDrillRun: load }));

describe("completed drill details", () => {
  it('shows saved feedback settings in About this drill', async () => {
    load.mockResolvedValue({ id: 'manual-1', source_key: 'drill::type-drill::set-x', mode: 'type-drill', label: 'Manual set',
      updated_at: '2026-10-02T12:00:00Z', session: { status: 'completed', question_queue: ['q-1'], attempts: [] },
      provenance: { feedback: 'manual_answer_and_explanation' },
    });
    render(<MemoryRouter initialEntries={['/practice/drills/runs/manual-1']}><Routes><Route path='/practice/drills/runs/:runId' element={<DrillRuns />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Training · Answers and explanations appear when you choose to reveal them.')).toBeInTheDocument();
  });
  it('discloses missing historical settings without making a Test or Training claim', async () => {
    load.mockResolvedValue({ id: 'legacy-1', source_key: 'drill::type-drill::old', mode: 'type-drill', label: 'Old set',
      updated_at: '2026-10-02T12:00:00Z', session: { status: 'completed', question_queue: ['q-1'], attempts: [] },
    });
    render(<MemoryRouter initialEntries={['/practice/drills/runs/legacy-1']}><Routes><Route path='/practice/drills/runs/:runId' element={<DrillRuns />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Feedback settings were not saved for this older sitting.')).toBeInTheDocument();
    expect(screen.queryByText(/^Training/)).not.toBeInTheDocument();
  });
  it("keeps an assigned guided sitting on its own results page", async () => {
    load.mockResolvedValue({
      id: "guided-1", user_id: "student-1", source_key: "guided::assignment-1", mode: "type-drill", label: "Spot the Relationship",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1", "q-2", "q-3"], attempts: [{ qid: "q-1", selected_answer: "B", correct: true }] },
    });
    render(<MemoryRouter initialEntries={["/practice/drills/runs/guided-1?view=results"]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Spot the Relationship" })).toBeInTheDocument());
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("1/1 correct");
    expect(screen.getByRole("table")).toHaveTextContent("q-1");
    expect(screen.getByRole("table")).not.toHaveTextContent("q-2");
    expect(screen.getByRole("table")).not.toHaveTextContent("q-3");
  });
  it("shows saved results and a truthful unavailable-question review", async () => {
    load.mockResolvedValue({
      id: "run-1", user_id: "student-1", source_key: "set-1", mode: "type-drill", label: "Flaw set",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1"], attempts: [{ qid: "q-1", selected_answer: "B", correct: false }] },
    });
    render(<MemoryRouter initialEntries={["/practice/drills/runs/run-1?view=review"]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Flaw set" })).toBeInTheDocument());
    expect(screen.getByRole("table")).toHaveTextContent("Incorrect");
    expect(screen.getByRole("table")).toHaveTextContent("q-1");
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
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("0/1 correct");
    expect(screen.getByRole("table")).toHaveTextContent("q-2");
    expect(screen.getByRole("table")).not.toHaveTextContent("q-1");
    expect(screen.getByRole("table")).not.toHaveTextContent("q-3");
  });
});
