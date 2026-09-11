import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfficialQuestionPane from "./OfficialQuestionPane";
import { choiceSection, type Highlight } from "@/lib/highlightUtils";

/** The element that carries a choice's colour classes: the text block itself. */
function choiceText(name: RegExp): HTMLElement {
  const el = screen.getByText(name).closest("[id^='choice-']");
  if (!(el instanceof HTMLElement)) throw new Error(`no choice block for ${name}`);
  return el;
}

/** Fake a live selection of `text` so the pane sees a drag, not a click. */
function selectText(text: string) {
  const node = screen.getByText(text).firstChild as Text;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, text.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
});

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

    // The choice text is not a button any more (a button cannot be
    // drag-selected, so it could not be highlighted); find it by its text.
    const correctAnswerText = choiceText(/Almost all of the people who believe that Walker is guilty/i);
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
    expect(choiceText(/There has been an increase in ratings/i)).toHaveClass("text-red-900");
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

    expect(choiceText(/There has been an increase in ratings/i)).not.toHaveClass("text-red-900");
    expect(screen.queryByLabelText("Your answer, incorrect")).not.toBeInTheDocument();
  });
});

describe("OfficialQuestionPane answer choices as highlight surfaces", () => {
  const stemRegionCount = 2; // stimulus + stem

  function renderLive(props: Partial<React.ComponentProps<typeof OfficialQuestionPane>> = {}) {
    const onAnswerSelect = vi.fn();
    const onTextSelection = vi.fn();
    render(
      <OfficialQuestionPane
        question={question}
        displayNumber={26}
        selectedAnswer=""
        eliminatedAnswers={new Set()}
        isFlagged={false}
        highlights={[]}
        highlightMode="none"
        onAnswerSelect={onAnswerSelect}
        onEliminate={vi.fn()}
        onToggleFlag={vi.fn()}
        onTextSelection={onTextSelection}
        onHighlightClick={vi.fn()}
        {...props}
      />,
    );
    return { onAnswerSelect, onTextSelection };
  }

  it("hands every block to the selection handler, choices included", () => {
    const { onTextSelection } = renderLive();
    fireEvent.mouseUp(screen.getByText(question.answerChoices.B));
    const regions = onTextSelection.mock.calls[0][0];
    expect(regions.map((r: { section: string }) => r.section)).toEqual([
      "stimulus",
      "stem",
      choiceSection("A"),
      choiceSection("B"),
    ]);
    expect(regions).toHaveLength(stemRegionCount + 2);
    // Each region's source is the text the offsets will be measured against.
    expect(regions[3].source).toBe(question.answerChoices.B);
    expect(regions[3].container).toBe(choiceText(/There has been an increase/));
  });

  it("still picks the choice on a plain click", () => {
    const { onAnswerSelect } = renderLive();
    const text = screen.getByText(question.answerChoices.B);
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onAnswerSelect).toHaveBeenCalledWith("B");
  });

  it("does not pick the choice when the mouse-up ends a drag", () => {
    const { onAnswerSelect } = renderLive({ highlightMode: "yellow" });
    const text = screen.getByText(question.answerChoices.B);
    selectText(question.answerChoices.B);
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onAnswerSelect).not.toHaveBeenCalled();
  });

  it("does not pick the choice when the handler consumed the selection", () => {
    // The handler clears the selection once it has made a highlight, so by
    // click time the selection is collapsed; the handler's return value is
    // what tells the click apart from a plain click.
    const { onAnswerSelect } = renderLive({
      highlightMode: "yellow",
      onTextSelection: () => {
        window.getSelection()?.removeAllRanges();
        return true;
      },
    });
    const text = screen.getByText(question.answerChoices.B);
    selectText(question.answerChoices.B);
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onAnswerSelect).not.toHaveBeenCalled();
  });

  it("in eraser mode a click on a highlight erases and does not pick; a click beside it still picks", () => {
    const highlights: Highlight[] = [
      { id: "h1", start: 0, end: 5, text: "There", color: "yellow", section: choiceSection("B") },
    ];
    const { onAnswerSelect } = renderLive({ highlightMode: "erase", highlights });
    const mark = document.querySelector("[data-highlight-id='h1']") as HTMLElement;
    fireEvent.mouseUp(mark);
    fireEvent.click(mark);
    expect(onAnswerSelect).not.toHaveBeenCalled();

    const rest = screen.getByText(/has been an increase in ratings/);
    fireEvent.mouseUp(rest);
    fireEvent.click(rest);
    expect(onAnswerSelect).toHaveBeenCalledWith("B");
  });

  it("under a marker a plain click still picks, after a beat", () => {
    vi.useFakeTimers();
    try {
      const { onAnswerSelect } = renderLive({ highlightMode: "yellow" });
      const text = screen.getByText(question.answerChoices.B);
      fireEvent.mouseUp(text);
      fireEvent.click(text);
      expect(onAnswerSelect).not.toHaveBeenCalled();
      vi.advanceTimersByTime(350);
      expect(onAnswerSelect).toHaveBeenCalledWith("B");
    } finally {
      vi.useRealTimers();
    }
  });

  it("under a marker a double-click on a word marks it and never picks", () => {
    // Browser order: down, up, click (caret only), down (word selected), up,
    // click, dblclick. The first click used to pick before the word existed.
    vi.useFakeTimers();
    try {
      const { onAnswerSelect } = renderLive({
        highlightMode: "yellow",
        onTextSelection: () => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) return false;
          selection.removeAllRanges();
          return true;
        },
      });
      const text = screen.getByText(question.answerChoices.B);
      fireEvent.mouseDown(text);
      fireEvent.mouseUp(text);
      fireEvent.click(text, { detail: 1 });
      fireEvent.mouseDown(text, { detail: 2 });
      selectText(question.answerChoices.B);
      fireEvent.mouseUp(text, { detail: 2 });
      fireEvent.click(text, { detail: 2 });
      fireEvent.doubleClick(text);
      vi.advanceTimersByTime(500);
      expect(onAnswerSelect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders a choice's highlight inside that choice only", () => {
    const highlights: Highlight[] = [
      { id: "h1", start: 0, end: 5, text: "There", color: "yellow", section: choiceSection("B") },
      { id: "h2", start: 0, end: 6, text: "Almost", color: "pink", section: choiceSection("A") },
    ];
    renderLive({ highlights });
    // Highlight spans split the text, so find the blocks by id.
    const b = document.getElementById(`choice-${question.qid}-B`)!;
    const a = document.getElementById(`choice-${question.qid}-A`)!;
    expect(b.querySelector("[data-highlight-id='h1']")).toHaveTextContent("There");
    expect(b.querySelector("[data-highlight-id='h2']")).toBeNull();
    expect(a.querySelector("[data-highlight-id='h2']")).toHaveTextContent("Almost");
  });

  it("keeps the letter badge as the keyboard control, described by its text", () => {
    const { onAnswerSelect } = renderLive();
    const badge = screen.getByRole("button", { name: "B" });
    expect(badge).toHaveAttribute("aria-describedby", `choice-${question.qid}-B`);
    fireEvent.click(badge);
    expect(onAnswerSelect).toHaveBeenCalledWith("B");
  });
});
