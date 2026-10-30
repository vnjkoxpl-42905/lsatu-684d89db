import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfficialQuestionPane from "./OfficialQuestionPane";
import type { InlineChoiceNotes } from "./InlineChoiceExplanation";

/**
 * The review-controls shape (LSAT Lab): Answer colours, Explanation shows
 * expanders, nothing locks, Reset Response clears the pick. All opt-in props;
 * `OfficialQuestionPane.test.tsx` covers the legacy defaults.
 */

const question = {
  qid: "PT23-S2-Q18",
  qnum: 18,
  stimulus: "Columnist: The advent of television helps to explain the rise in urban homicide.",
  questionStem: "Which one of the following, if true, most supports the columnist's argument?",
  answerChoices: {
    A: "In places where violent programming is low, homicide rates are also low.",
    B: "The portrayal of violence on television is a cause of violence in society.",
    C: "There were no violent programs in the early years of television.",
  },
};

const notes: InlineChoiceNotes = {
  A: { tag: "Out of Scope", studentPercent: 12, note: "A compares programming, not the advent of TV." },
  B: { tag: "Correct", studentPercent: 58, note: "This adds plausibility to the author's explanation." },
  C: { tag: "Premise", studentPercent: 9, note: "   " },
};

function choiceText(name: RegExp): HTMLElement {
  const el = screen.getByText(name).closest("[id^='choice-']");
  if (!(el instanceof HTMLElement)) throw new Error(`no choice block for ${name}`);
  return el;
}

function renderReview(props: Record<string, unknown> = {}) {
  const onAnswerSelect = vi.fn();
  const onEliminate = vi.fn();
  const onResetResponse = vi.fn();
  const utils = render(
    <OfficialQuestionPane
      question={question}
      displayNumber={18}
      selectedAnswer="A"
      eliminatedAnswers={new Set()}
      isFlagged={false}
      answerRevealed={false}
      correctAnswer="B"
      inlineNotes={null}
      highlights={[]}
      highlightMode="none"
      onAnswerSelect={onAnswerSelect}
      onEliminate={onEliminate}
      onToggleFlag={vi.fn()}
      onTextSelection={vi.fn()}
      onHighlightClick={vi.fn()}
      choiceNoteExpanders
      choicesStayLive
      onResetResponse={onResetResponse}
      {...props}
    />,
  );
  return { ...utils, onAnswerSelect, onEliminate, onResetResponse };
}

describe("OfficialQuestionPane — Answer and Explanation are independent", () => {
  it("off / off: no colour, no notes, no chevrons", () => {
    renderReview();
    expect(choiceText(/portrayal of violence/i)).not.toHaveClass("text-green-900");
    expect(screen.queryByRole("button", { name: /explanation for/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/adds plausibility/i)).not.toBeInTheDocument();
  });

  it("Answer only: colour and verdict icons, still no notes", () => {
    renderReview({ answerRevealed: true });
    expect(choiceText(/portrayal of violence/i)).toHaveClass("text-green-900");
    expect(choiceText(/violent programming is low/i)).toHaveClass("text-red-900");
    expect(screen.getByRole("img", { name: "Correct answer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /explanation for/i })).not.toBeInTheDocument();
  });

  it("Explanation only: chevrons on noted choices, no colour, no prose yet", () => {
    renderReview({ inlineNotes: notes });
    expect(choiceText(/portrayal of violence/i)).not.toHaveClass("text-green-900");
    expect(screen.getByRole("button", { name: "Show explanation for A" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Show explanation for B" })).toBeInTheDocument();
    // C's note is whitespace: chip, no chevron, no prose.
    expect(screen.getByText("Premise")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show explanation for C" })).not.toBeInTheDocument();
    expect(screen.queryByText(/adds plausibility/i)).not.toBeInTheDocument();
    // The Correct tag chip is green because correctness is a fact, not a state.
    expect(screen.getByText("Correct")).toHaveClass("choice-note__tag--correct");
  });

  it("both: colour and chevrons together", () => {
    renderReview({ answerRevealed: true, inlineNotes: notes });
    expect(choiceText(/portrayal of violence/i)).toHaveClass("text-green-900");
    expect(screen.getByRole("button", { name: "Show explanation for B" })).toBeInTheDocument();
  });
});

describe("OfficialQuestionPane — Choice Note expanders", () => {
  it("opens one note, closes it again, and never changes the pick", () => {
    const { onAnswerSelect } = renderReview({ inlineNotes: notes });
    const toggle = screen.getByRole("button", { name: "Show explanation for B" });
    fireEvent.click(toggle);
    expect(screen.getByText(/adds plausibility/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide explanation for B" })).toHaveAttribute("aria-expanded", "true");
    // A stays closed: one at a time.
    expect(screen.queryByText(/compares programming/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide explanation for B" }));
    expect(screen.queryByText(/adds plausibility/i)).not.toBeInTheDocument();
    expect(onAnswerSelect).not.toHaveBeenCalled();
  });

  it("closes every note when the question changes", () => {
    const { rerender } = renderReview({ inlineNotes: notes });
    fireEvent.click(screen.getByRole("button", { name: "Show explanation for B" }));
    expect(screen.getByText(/adds plausibility/i)).toBeInTheDocument();
    rerender(
      <OfficialQuestionPane
        question={{ ...question, qid: "PT23-S2-Q19" }}
        displayNumber={19}
        selectedAnswer=""
        eliminatedAnswers={new Set()}
        isFlagged={false}
        answerRevealed={false}
        correctAnswer="B"
        inlineNotes={notes}
        highlights={[]}
        highlightMode="none"
        onAnswerSelect={vi.fn()}
        onEliminate={vi.fn()}
        onToggleFlag={vi.fn()}
        onTextSelection={vi.fn()}
        onHighlightClick={vi.fn()}
        choiceNoteExpanders
        choicesStayLive
      />,
    );
    expect(screen.queryByText(/adds plausibility/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show explanation for B" })).toBeInTheDocument();
  });

  it("a selected choice with no note shows the chip and no chevron", () => {
    renderReview({ inlineNotes: { B: notes.B }, selectedAnswer: "C" });
    expect(screen.getByText("Your answer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show explanation for C" })).not.toBeInTheDocument();
  });
});

describe("OfficialQuestionPane — nothing locks", () => {
  it("choices stay clickable while the answer is revealed", () => {
    const { onAnswerSelect } = renderReview({ answerRevealed: true });
    fireEvent.click(screen.getByRole("button", { name: "C" }));
    expect(onAnswerSelect).toHaveBeenCalledWith("C");
    fireEvent.click(choiceText(/no violent programs/i));
    expect(onAnswerSelect).toHaveBeenCalledTimes(2);
  });

  it("cross-out stays live while the answer is revealed", () => {
    const { onEliminate } = renderReview({ answerRevealed: true });
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice C" }));
    expect(onEliminate).toHaveBeenCalledWith("C");
  });

  it("an eliminated correct choice keeps a working Restore beside its verdict", () => {
    const { onEliminate } = renderReview({ answerRevealed: true, eliminatedAnswers: new Set(["B"]) });
    expect(screen.getByRole("img", { name: "Correct answer" })).toBeInTheDocument();
    const restore = screen.getByRole("button", { name: "Restore choice B" });
    fireEvent.click(restore);
    expect(onEliminate).toHaveBeenCalledWith("B");
  });

  it("everything is disabled under interactionLocked", () => {
    const { onAnswerSelect, onEliminate, onResetResponse } = renderReview({
      interactionLocked: true,
      inlineNotes: notes,
    });
    expect(screen.getByRole("button", { name: "C" })).toBeDisabled();
    fireEvent.click(choiceText(/no violent programs/i));
    expect(onAnswerSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cross out choice C" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice C" }));
    expect(onEliminate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Show explanation for B" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset Response" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset Response" }));
    expect(onResetResponse).not.toHaveBeenCalled();
  });
});

describe("OfficialQuestionPane — Reset Response", () => {
  it("is disabled with no pick and clears the pick otherwise", () => {
    const { onResetResponse, rerender } = renderReview({ selectedAnswer: "" });
    expect(screen.getByRole("button", { name: "Reset Response" })).toBeDisabled();
    rerender(
      <OfficialQuestionPane
        question={question}
        displayNumber={18}
        selectedAnswer="A"
        eliminatedAnswers={new Set()}
        isFlagged={false}
        answerRevealed
        correctAnswer="B"
        highlights={[]}
        highlightMode="none"
        onAnswerSelect={vi.fn()}
        onEliminate={vi.fn()}
        onToggleFlag={vi.fn()}
        onTextSelection={vi.fn()}
        onHighlightClick={vi.fn()}
        choiceNoteExpanders
        choicesStayLive
        onResetResponse={onResetResponse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset Response" }));
    expect(onResetResponse).toHaveBeenCalledTimes(1);
    // Answer colouring is not the pane's to undo.
    expect(choiceText(/portrayal of violence/i)).toHaveClass("text-green-900");
  });

  it("is not rendered without the handler", () => {
    renderReview({ onResetResponse: undefined });
    expect(screen.queryByRole("button", { name: "Reset Response" })).not.toBeInTheDocument();
  });
});

describe("OfficialQuestionPane — belowStimulus", () => {
  it("renders the slot under the stimulus and leaves the stimulus block's classes alone", () => {
    const { container } = renderReview({ belowStimulus: <div data-testid="breakdown">breakdown</div> });
    const slot = screen.getByTestId("breakdown").parentElement;
    const stimulus = container.querySelector(".whitespace-pre-wrap");
    expect(stimulus).toBeTruthy();
    expect(stimulus).toHaveClass("subpixel-antialiased");
    expect(stimulus).not.toHaveClass("overflow-y-auto");
    expect(slot?.previousElementSibling).toBe(stimulus);
    expect(slot).toHaveClass("font-sans");
  });
});
