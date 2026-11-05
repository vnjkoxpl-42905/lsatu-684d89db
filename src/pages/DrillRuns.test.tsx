import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DrillRuns from "./DrillRuns";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => null } }));
const load = vi.hoisted(() => vi.fn());
const mark = vi.hoisted(() => vi.fn());
vi.mock("@/lib/drillRunLedger", () => ({ loadStandaloneDrillRun: load, markDrillRunReviewed: mark }));

beforeEach(() => { mark.mockReset(); mark.mockResolvedValue(undefined); });

const open = (id: string, search = "") => render(
  <MemoryRouter initialEntries={[`/practice/drills/runs/${id}${search}`]}><Routes><Route path="/practice/drills/runs/:runId" element={<DrillRuns />} /></Routes></MemoryRouter>,
);

const sitting = (extra: Record<string, unknown> = {}) => ({
  id: "run-x", user_id: "student-1", source_key: "set-1", mode: "type-drill", label: "Flaw set",
  created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
  session: { status: "completed", question_queue: ["q-1", "q-2", "q-3"], attempts: [
    { qid: "q-1", selected_answer: "B", correct: true },
    { qid: "q-2", selected_answer: "C", correct: false },
  ] },
  ...extra,
});

describe("completed drill details", () => {
  it('shows saved feedback settings in Results and Review', async () => {
    load.mockResolvedValue({ id: 'manual-1', source_key: 'drill::type-drill::set-x', mode: 'type-drill', label: 'Manual set',
      updated_at: '2026-10-02T12:00:00Z', session: { status: 'completed', question_queue: ['q-1'], attempts: [] },
      provenance: { feedback: 'manual_answer_and_explanation' },
    });
    open('manual-1');
    expect(await screen.findByText('Training · Answers and explanations appear when you choose to reveal them.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See all answers' }));
    expect(screen.getByText('Training · Answers and explanations appear when you choose to reveal them.')).toBeInTheDocument();
  });
  it('discloses missing historical settings without making a Test or Training claim', async () => {
    load.mockResolvedValue({ id: 'legacy-1', source_key: 'drill::type-drill::old', mode: 'type-drill', label: 'Old set',
      updated_at: '2026-10-02T12:00:00Z', session: { status: 'completed', question_queue: ['q-1'], attempts: [] },
    });
    open('legacy-1');
    expect(await screen.findByText('Feedback settings were not saved for this older sitting.')).toBeInTheDocument();
    expect(screen.queryByText(/^Training/)).not.toBeInTheDocument();
  });
  it("keeps an assigned guided sitting on its own Results and Review route", async () => {
    load.mockResolvedValue({
      id: "guided-1", user_id: "student-1", source_key: "guided::assignment-1", mode: "type-drill", label: "Spot the Relationship",
      created_at: "2026-09-28T12:00:00Z", updated_at: "2026-09-28T12:10:00Z",
      session: { status: "completed", question_queue: ["q-1", "q-2", "q-3"], attempts: [{ qid: "q-1", selected_answer: "B", correct: true }] },
    });
    open("guided-1", "?view=results");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Spot the Relationship" })).toBeInTheDocument());
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("1 of 1 correct");
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("Nothing to review");
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
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
    open("run-1", "?view=review");
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
    open("smart-1", "?view=results");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Smart Drill" })).toBeInTheDocument());
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("0 of 1 correct");
    fireEvent.click(screen.getByRole("button", { name: "See all answers" }));
    expect(screen.getByLabelText("Answer review")).toHaveTextContent("q-2");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-1");
    expect(screen.getByLabelText("Answer review")).not.toHaveTextContent("q-3");
  });
});

describe("results and review share one saved review state", () => {
  it("offers the missed questions as the next step and shows nothing reviewed yet", async () => {
    load.mockResolvedValue(sitting());
    open("run-x");
    const results = await screen.findByLabelText("Drill results");
    expect(results).toHaveTextContent("1 of 3 correct");
    expect(results).toHaveTextContent("2 of 2 missed questions still to review");
    expect(results).toHaveTextContent("0 of 2 reviewed");
    expect(screen.getByRole("button", { name: "Review 2 missed" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Missed questions reviewed" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("opens a missed question from the question map, saves it, and shows it as reviewed", async () => {
    load.mockResolvedValue(sitting());
    open("run-x");
    fireEvent.click(await screen.findByRole("button", { name: "Question 2, incorrect, not reviewed yet" }));
    await waitFor(() => expect(mark).toHaveBeenCalledWith("student-1", "run-x", ["q-2"]));
    expect(await screen.findByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Review/ })).toHaveTextContent("1/2");
  });

  it("saves a question when the student opens it on the Review page, once", async () => {
    load.mockResolvedValue(sitting());
    open("run-x", "?view=review");
    const summary = (await screen.findByText(/2\. q-2 · Incorrect/)).closest("summary")!;
    fireEvent.click(summary);
    await waitFor(() => expect(mark).toHaveBeenCalledWith("student-1", "run-x", ["q-2"]));
    fireEvent.click(summary);
    fireEvent.click(summary);
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it("does not count a correct answer as needing review", async () => {
    load.mockResolvedValue(sitting());
    open("run-x", "?view=review");
    fireEvent.click(await screen.findByRole("button", { name: "All (3)" }));
    fireEvent.click((await screen.findByText(/1\. q-1 · Correct/)).closest("summary")!);
    expect(mark).not.toHaveBeenCalled();
  });

  it("restores saved progress and celebrates a finished review", async () => {
    load.mockResolvedValue(sitting({ reviewed_qids: ["q-2"] }));
    open("run-x");
    expect(await screen.findByText("1 of 2 reviewed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue review" })).toBeInTheDocument();
    load.mockResolvedValue(sitting({ reviewed_qids: ["q-2", "q-3"] }));
    open("run-x");
    expect(await screen.findAllByText("You reviewed everything you missed.")).not.toHaveLength(0);
  });

  it("keeps the student reviewing and says so when saving fails", async () => {
    mark.mockRejectedValue(new Error("offline"));
    load.mockResolvedValue(sitting());
    open("run-x", "?view=review");
    fireEvent.click((await screen.findByText(/2\. q-2 · Incorrect/)).closest("summary")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("review progress could not be saved");
  });
});
