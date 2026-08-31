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

function renderPane(questionOverride = question) {
  return render(
    <OfficialQuestionPane
      question={questionOverride}
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

  it("renders multi-word speaker labels as separate dialogue turns", () => {
    const { container } = renderPane({
      ...question,
      stimulus:
        "Figorian Wildlife Commission: First speaker text.\n\nFigorian Development Commission: Second speaker text.",
    });

    expect(screen.getByText("Figorian Wildlife Commission:")).toHaveClass("font-bold");
    expect(screen.getByText("Figorian Development Commission:")).toHaveClass("font-bold");
    expect(container.querySelector(".space-y-4")?.children).toHaveLength(2);
  });

  it("does not treat a mid-argument clause ending in a colon as a speaker", () => {
    // Even if a stray break lands before a sentence clause, the renderer must not
    // bold it as a turn (regression: PT118 S3 Q7-8 showed three bold speakers).
    const { container } = renderPane({
      ...question,
      stimulus:
        "Figorian Wildlife Commission: First speaker text.\n\nTo protect wildlife we must regulate such development in Figoria: more text.\n\nFigorian Development Commission: Second speaker text.",
    });

    expect(
      screen.queryByText(
        "To protect wildlife we must regulate such development in Figoria:",
      ),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".space-y-4")).not.toBeInTheDocument();
  });
});

describe("OfficialQuestionPane — revealing an answer", () => {
  function renderRevealed(props: Record<string, unknown> = {}) {
    return render(
      <OfficialQuestionPane
        question={question}
        displayNumber={26}
        selectedAnswer="B"
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
        {...props}
      />,
    );
  }

  it("marks the choice they actually took, not only the one that was right", () => {
    renderRevealed();

    // B was chosen and is wrong; saying "A is correct" without saying "and you
    // took B" is only half of what a reveal is for.
    expect(
      screen.getByRole("button", {
        name: /There has been an increase in ratings/i,
      }),
    ).toHaveClass("text-red-900");
  });

  it("does not leave the verdict to colour alone", () => {
    // ADR 0001: feedback must always carry an icon and a label, so a student who
    // cannot separate the green from the red still gets the answer.
    renderRevealed();

    expect(screen.getByLabelText("Correct answer")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer, incorrect")).toBeInTheDocument();
  });

  it("shows the answer without unfolding every explanation", () => {
    // Answer and Explanation are separate asks. Revealing with no inline notes
    // passed must colour the choices and add nothing else.
    renderRevealed({ inlineNotes: null });

    expect(screen.getByLabelText("Correct answer")).toBeInTheDocument();
    expect(screen.queryByText(/why this is/i)).not.toBeInTheDocument();
  });

  it("unfolds them when the notes are handed over, which is Explanation's job", () => {
    // The other half of the pair: without this, the assertion above would pass
    // just as happily if the inline layer had been deleted outright.
    renderRevealed({
      inlineNotes: {
        A: { tag: null, studentPercent: null, note: "A is the only choice that explains it." },
        B: { tag: null, studentPercent: null, note: "B changes the subject." },
      },
    });

    expect(screen.getByText(/why this is correct/i)).toBeInTheDocument();
    expect(screen.getByText(/why this is wrong/i)).toBeInTheDocument();
  });

  it("leaves an untaken wrong choice alone", () => {
    // Only the choice they committed to turns red. The other wrong answers are
    // not accusations.
    renderRevealed({ selectedAnswer: "A" });

    expect(
      screen.getByRole("button", {
        name: /There has been an increase in ratings/i,
      }),
    ).not.toHaveClass("text-red-900");
    expect(screen.queryByLabelText("Your answer, incorrect")).not.toBeInTheDocument();
  });
});
