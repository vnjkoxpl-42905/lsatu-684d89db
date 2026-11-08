import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompletedDrillReview } from "./CompletedDrillReview";

// The walk itself is the drill's exam screen and has its own tests; here we
// only prove the review hands the open question to it rather than drawing one.
vi.mock("@/components/drill/SectionReviewWalk", () => ({
  default: ({ session, initialIndex, backLabel, onBack, variant }: any) => (
    <div data-testid="exam-walk" data-start={initialIndex} data-variant={variant} data-pick={session.attempts.get(session.questionQueue[initialIndex])?.selectedAnswer}>
      <button type="button" onClick={onBack}>{backLabel}</button>
    </div>
  ),
}));
const marks = vi.hoisted(() => ({
  notes: new Map(), ready: true, error: null,
  note: () => null, hasNote: (qid: string) => qid === "q-1", isBookmarked: () => false, hasDrawing: () => false, classId: "c-1",
  saveNote: vi.fn(), toggleBookmark: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/hooks/useQuestionStudyMarks", () => ({ useQuestionStudyMarks: () => marks, noteHasContent: () => true }));
vi.mock("@/hooks/useAnswerPopularity", () => ({ useAnswerPopularity: () => ({ data: { "q-1": { A: 9, B: 2, C: 80, D: 4, E: 5 } } }) }));
vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => ({
  pt: 106, section: 2, qnum: 18, difficulty: 3, qtype: "Flaw", questionFeatures: [], stimulus: "Dobson: stones.", questionStem: "Which is an error?",
  answerChoices: { A: "choice a", B: "choice b", C: "choice c", D: "choice d", E: "choice e" }, correctAnswer: "A",
}) } }));

const attempts = [{ qid: "q-1", selected_answer: "C", correct: false, time_ms: 65000 }];

describe("completed drill review", () => {
  it("lists questions as a table with result and timing, not a details stack", () => {
    const { container } = render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={null} onOpen={() => {}} />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByRole("table")).toHaveTextContent("PT106.S2.Q18");
    expect(screen.getByRole("table")).toHaveTextContent("01:05");
    expect(screen.getAllByLabelText("Incorrect").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("A 9%, B 2%, C 80%, D 4%, E 5%")).toBeInTheDocument();
    expect(screen.getByLabelText("Drill results")).toHaveTextContent("0/1 correct");
  });

  it("filters the table by result", () => {
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={null} onOpen={() => {}} />);
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "correct" } });
    expect(screen.getByRole("table")).toHaveTextContent("No questions match these filters.");
  });

  it("opens the question in the drill's own exam screen, full screen, with Clean and Actual", () => {
    const onOpen = vi.fn();
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={0} onOpen={onOpen} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("fixed");
    expect(screen.getByTestId("exam-walk")).toHaveAttribute("data-start", "0");
    expect(screen.getByTestId("exam-walk")).toHaveAttribute("data-pick", "C");
    expect(screen.getByTestId("exam-walk")).toHaveAttribute("data-variant", "drill");
    fireEvent.click(screen.getByText("All questions"));
    expect(onOpen).toHaveBeenCalledWith(null);
  });
  it("bookmarks a question from its row and opens its journal and details", () => {
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={null} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Bookmark PT106.S2.Q18" }));
    expect(marks.toggleBookmark).toHaveBeenCalledWith("q-1");
    fireEvent.click(screen.getByRole("button", { name: "Open your note on PT106.S2.Q18" }));
    expect(screen.getByRole("dialog", { name: "Journal" })).toHaveTextContent("PT106.S2.Q18");
    fireEvent.click(screen.getByRole("button", { name: "Close journal" }));
    fireEvent.click(screen.getByRole("button", { name: "Details for PT106.S2.Q18" }));
    expect(screen.getByRole("dialog", { name: "PT106.S2.Q18 details" })).toHaveTextContent("Difficulty");
  });

  it("filters to questions with notes and to bookmarked questions", () => {
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={null} onOpen={() => {}} />);
    fireEvent.click(screen.getByLabelText("Has notes"));
    expect(screen.getByRole("table")).toHaveTextContent("PT106.S2.Q18");
    fireEvent.click(screen.getByLabelText("Bookmarked"));
    expect(screen.getByRole("table")).toHaveTextContent("No questions match these filters.");
  });
});
