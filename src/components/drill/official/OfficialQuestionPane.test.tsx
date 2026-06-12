import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfficialQuestionPane from "./OfficialQuestionPane";

const question = {
  qid: "q-26",
  qnum: 26,
  stimulus:
    "A recent poll showed that almost half of the city's residents believe that Mayor Walker is guilty of ethics violations.",
  questionStem:
    "Which one of the following, if true, most helps to explain the surprising fact stated above?",
  answerChoices: {
    A: "Almost all of the people who believe that Walker is guilty of ethics violations had thought his performance was poor.",
    B: "There has been an increase in ratings for Walker's political opponents.",
  },
};

function renderPane() {
  return render(
    <OfficialQuestionPane
      question={question}
      displayNumber={26}
      selectedAnswer="A"
      eliminatedAnswers={new Set()}
      isFlagged={false}
      answerRevealed
      correctAnswer="A"
      highlights={[]}
      highlightMode="none"
      onAnswerSelect={vi.fn()}
      onEliminate={vi.fn()}
      onToggleFlag={vi.fn()}
      onTextSelection={vi.fn()}
      onHighlightClick={vi.fn()}
    />,
  );
}

describe("OfficialQuestionPane", () => {
  it("keeps the revealed correct answer readable on the official white surface", () => {
    const { container } = renderPane();

    const root = container.firstElementChild;
    expect(root).toHaveClass("bg-white");
    expect(root).not.toHaveClass("bg-bg-shadow");

    const correctAnswerText = screen.getByRole("button", {
      name: /Almost all of the people who believe that Walker is guilty/i,
    });
    expect(correctAnswerText).toHaveClass("text-green-900");
    expect(correctAnswerText).not.toHaveClass("text-green-50");
  });
});
