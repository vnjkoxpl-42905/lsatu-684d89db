import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompletedDrillReview } from "./CompletedDrillReview";

vi.mock("@/hooks/useLrExplanation", () => ({ useLrExplanation: () => ({ data: { styles: [{ steps: [], notesByLetter: { A: "Why A works." } }] } }) }));
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

  it("opens the question with Clean, Actual and BR, marking the pick only in Actual", () => {
    render(<CompletedDrillReview title="Flaw" qids={["q-1"]} attempts={attempts} openIndex={0} onOpen={() => {}} />);
    expect(screen.getByRole("tab", { name: "Clean" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "BR –" })).toBeDisabled();
    const choiceC = () => screen.getByText("choice c").closest("li")!;
    expect(choiceC()).not.toHaveAttribute("data-picked");
    fireEvent.click(screen.getByRole("tab", { name: "Actual" }));
    expect(choiceC()).toHaveAttribute("data-picked");
    expect(screen.getByText("choice a").closest("li")).not.toHaveAttribute("data-correct");
    fireEvent.click(screen.getByRole("switch", { name: "Show correct" }));
    expect(screen.getByText("choice a").closest("li")).toHaveAttribute("data-correct");
    fireEvent.click(screen.getByRole("button", { name: "Explanation for A" }));
    expect(screen.getByText("Why A works.")).toBeInTheDocument();
  });
});
