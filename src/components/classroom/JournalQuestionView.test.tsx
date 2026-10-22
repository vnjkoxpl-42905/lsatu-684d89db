import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { LRQuestion } from "@/lib/questionLoader";
import { JournalQuestionView } from "@/components/classroom/JournalQuestionView";

const question: LRQuestion = {
  qid: "PT80-S2-Q14",
  pt: 80,
  section: 2,
  qnum: 14,
  qtype: "Flaw",
  difficulty: 3,
  stimulus: "Stimulus text",
  questionStem: "Which one of the following?",
  answerChoices: {
    A: "(A) First answer",
    B: "(B) Second answer",
    C: "(C) Third answer",
    D: "(D) Fourth answer",
    E: "(E) Fifth answer",
  },
  correctAnswer: "C",
};

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("JournalQuestionView", () => {
  it("renders stimulus, stem, and five choices in vertical document order", () => {
    const { container } = render(
      <JournalQuestionView
        question={question}
        chosenAnswer={null}
        questionSummary=""
        wrongReasoning=""
        correctReasoning=""
        annotateActive={false}
        annotations={[]}
        onAnnotationsChange={vi.fn()}
        onChooseWrong={vi.fn()}
      />,
    );

    const stimulus = screen.getByText("Stimulus text");
    const stem = screen.getByText("Which one of the following?");
    const choices = screen.getAllByRole("button");

    expect(choices).toHaveLength(5);
    expect(
      stimulus.compareDocumentPosition(stem) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      stem.compareDocumentPosition(choices[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      container.querySelector(".classroom-journal-question-content")
        ?.parentElement,
    ).toHaveClass("classroom-journal-question-scroll");
  });

  it("marks the correct answer and keeps non-correct choices clickable", () => {
    const chooseWrong = vi.fn();
    render(
      <JournalQuestionView
        question={question}
        chosenAnswer="A"
        questionSummary=""
        wrongReasoning=""
        correctReasoning=""
        annotateActive={false}
        annotations={[]}
        onAnnotationsChange={vi.fn()}
        onChooseWrong={chooseWrong}
      />,
    );

    const correct = screen.getByRole("button", { name: /C Third answer Correct/ });
    const wrong = screen.getByRole("button", { name: /A First answer/ });

    expect(correct).toBeDisabled();
    expect(correct).toHaveClass("classroom-journal-choice-correct");
    fireEvent.click(wrong);
    expect(chooseWrong).toHaveBeenCalledWith("A");
  });

  it("keeps the content-sized annotation layer click-through when inactive", () => {
    const { container } = render(
      <JournalQuestionView
        question={question}
        chosenAnswer={null}
        questionSummary=""
        wrongReasoning=""
        correctReasoning=""
        annotateActive={false}
        annotations={[]}
        onAnnotationsChange={vi.fn()}
        onChooseWrong={vi.fn()}
      />,
    );

    const content = container.querySelector(
      ".classroom-journal-question-content",
    );
    const layer = content?.querySelector(".absolute.inset-0");

    expect(layer).toHaveStyle({ pointerEvents: "none" });
  });
});
