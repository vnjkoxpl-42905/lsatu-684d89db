import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SmartLRTrainingCard from "@/components/mainhub/SmartLRTrainingCard";
import type { SmartLRSearchQuestion } from "@/components/mainhub/smartLRQuestionSearch";

const { mockNavigate, mockQuestions } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockQuestions: [
    {
      qid: "PT151-S2-Q8",
      pt: 151,
      section: 2,
      qnum: 8,
      qtype: "Strengthen",
      difficulty: 3,
      stimulus:
        "The recent ads for Ebsen's campaign were sent to too few households to serve this purpose effectively.",
      questionStem: "Which one of the following most strengthens the argument?",
    },
    {
      qid: "PT152-S1-Q12",
      pt: 152,
      section: 1,
      qnum: 12,
      qtype: "Flaw",
      difficulty: 4,
      stimulus: "The report compared two studies about neighborhood traffic.",
      questionStem: "The argument is most vulnerable to criticism on which one of the following grounds?",
    },
  ] satisfies SmartLRSearchQuestion[],
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/contexts/QuestionBankContext", () => ({
  useQuestionBank: () => ({
    manifest: { totalQuestions: mockQuestions.length },
    isLoading: false,
  }),
}));

vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
    getAllQuestions: () => mockQuestions,
  },
}));

describe("SmartLRTrainingCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("shows typed question matches and opens the top match from the search field on Enter", () => {
    render(<SmartLRTrainingCard />);

    const search = screen.getByLabelText("Search question text");
    fireEvent.change(search, {
      target: { value: "ebsen" },
    });

    expect(screen.getByText("PT 151 · S2 · Q8")).toBeInTheDocument();
    expect(screen.getByText("Ebsen")).toBeInTheDocument();

    fireEvent.keyDown(search, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/drill?mode=type-drill&qids=PT151-S2-Q8&present=smart&returnTo=%2Fmainhub",
    );
  });

  it("opens a typed result with one click", () => {
    render(<SmartLRTrainingCard />);

    fireEvent.change(screen.getByLabelText("Search question text"), {
      target: { value: "ebsen" },
    });
    fireEvent.click(screen.getByRole("button", { name: /PT 151 · S2 · Q8/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/drill?mode=type-drill&qids=PT151-S2-Q8&present=smart&returnTo=%2Fmainhub",
    );
  });

  it("starts adaptive Smart LR when no finder filter is active", () => {
    render(<SmartLRTrainingCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start Smart LR Drill" }));

    expect(mockNavigate).toHaveBeenCalledWith("/drill", {
      state: { mode: "adaptive", returnTo: "/mainhub" },
    });
  });
});
