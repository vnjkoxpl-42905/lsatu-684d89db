import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompletedDrillReview } from "./CompletedDrillReview";

// The walk itself is the drill's exam screen and has its own tests; here we
// only prove the review hands the open question to it rather than drawing one.
vi.mock("@/components/drill/SectionReviewWalk", () => ({
  default: ({ session, initialIndex, backLabel, onBack }: any) => (
    <div data-testid="exam-walk" data-start={initialIndex} data-pick={session.attempts.get(session.questionQueue[initialIndex])?.selectedAnswer}>
      <button type="button" onClick={onBack}>{backLabel}</button>
    </div>
  ),
}));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => ({
  pt: 106, section: 2, qnum: 18, qtype: "Flaw", questionFeatures: [], stimulus: "Dobson: stones.", questionStem: "Which is an error?",
  answerChoices: { A: "choice a", B: "choice b", C: "choice c", D: "choice d", E: "choice e" }, correctAnswer: "A",
}) } }));

const attempts = [{ qid: "q-1", selected_answer: "C", correct: false, time_ms: 65000 }];

describe("completed drill review", () => {
  it("lists questions as a table with result and timing, not a details stack", () => {
    const { container } = render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={null} onOpen={() => {}} />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByRole("table")).toHaveTextContent("PT106.S2.Q18");
    expect(screen.getByRole("table")).toHaveTextContent("01:05");
    expect(screen.getByLabelText("Incorrect")).toBeInTheDocument();
  });

  it("opens the question in the drill's own exam screen, full screen, with Clean and Actual", () => {
    const onOpen = vi.fn();
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={0} onOpen={onOpen} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("fixed");
    expect(screen.getByTestId("exam-walk")).toHaveAttribute("data-start", "0");
    expect(screen.getByTestId("exam-walk")).toHaveAttribute("data-pick", "C");
    fireEvent.click(screen.getByText("All questions"));
    expect(onOpen).toHaveBeenCalledWith(null);
  });
});
