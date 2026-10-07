import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionHistoryRow } from "@/lib/sectionHistory";
import SectionReviewDetail from "./SectionReviewDetail";

const fetchOwnedSectionHistoryItem = vi.hoisted(() => vi.fn());
const getQuestion = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/lib/sectionHistory", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sectionHistory")>(),
  fetchOwnedSectionHistoryItem,
}));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion } }));
vi.mock("@/hooks/useLrExplanation", () => ({
  useLrExplanation: () => ({ data: { styles: [{ notesByLetter: { C: "Database note for C." } }] } }),
}));

const row = {
  id: "section-1", practiceTestRunId: null, pt: 80, section: 2, mode: "full-section",
  completedAt: "2026-09-28T10:00:00Z",
  questions: [{ qid: "PT80-S2-Q14", qnum: 14, qtype: "Flaw", initialAnswer: "—", everVisited: true, correctAnswer: "C" }],
} as SectionHistoryRow;

function renderDetail() {
  render(<MemoryRouter initialEntries={["/review/section/section-1/PT80-S2-Q14"]}>
    <Routes><Route path="/review/section/:historyId/:qid" element={<SectionReviewDetail />} /></Routes>
  </MemoryRouter>);
}

beforeEach(() => {
  fetchOwnedSectionHistoryItem.mockReset().mockResolvedValue(row);
  getQuestion.mockReset().mockReturnValue({
    stimulus: "The city council changed the rule.", questionStem: "What is the flaw?",
    answerChoices: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  });
});

describe("Section Review detail", () => {
  it("shows the exact saved opened-blank outcome with current question text", async () => {
    renderDetail();
    expect(await screen.findByText("The city council changed the rule.")).toBeInTheDocument();
    expect(screen.getByText(/You opened this question but left it blank/)).toBeInTheDocument();
    expect(screen.getByText("What is the flaw?")).toBeInTheDocument();
    expect(screen.getByText("Database note for C.")).toBeInTheDocument();
    expect(fetchOwnedSectionHistoryItem).toHaveBeenCalledWith("student-1", "section-1");
  });

  it("does not reveal the answer for a question that was never visited", async () => {
    fetchOwnedSectionHistoryItem.mockResolvedValue({ ...row, questions: [{ ...row.questions[0], everVisited: false }] });
    renderDetail();
    await waitFor(() => expect(screen.getByText(/not available for review/)).toBeInTheDocument());
    expect(screen.queryByText(/Credited answer at completion/)).not.toBeInTheDocument();
  });
});
