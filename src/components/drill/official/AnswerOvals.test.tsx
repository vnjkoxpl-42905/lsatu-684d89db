import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnswerOvals from "./AnswerOvals";

const queue = ["q1", "q2", "q3", "q4"];

const base = {
  questionQueue: queue,
  currentIndex: 1,
  attemptedQids: new Set(["q1", "q2"]),
  jumpEnabled: true,
  onJumpTo: vi.fn(),
};

describe("AnswerOvals", () => {
  it("uses printed numbers across a removed position in an official section", () => {
    render(
      <AnswerOvals
        {...base}
        questionQueue={["PT118-S1-Q4", "PT118-S1-Q6", "PT118-S1-Q7"]}
        useOfficialQuestionNumbers
      />,
    );

    expect(screen.getByRole("button", { name: "Question 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 6, current" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 7" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Question 5" })).not.toBeInTheDocument();
  });
  it("names every question, and says which are answered and which is current", () => {
    render(<AnswerOvals {...base} onJumpTo={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Question 1, answered" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Question 2, answered, current" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 4" })).toBeInTheDocument();
  });

  it("jumps to any question that is not the one already open", () => {
    const onJumpTo = vi.fn();
    render(<AnswerOvals {...base} onJumpTo={onJumpTo} />);

    // Forwards to an unanswered question, and backwards to an answered one:
    // a fixed queue walks in both directions, not just onward.
    fireEvent.click(screen.getByRole("button", { name: "Question 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Question 1, answered" }));

    expect(onJumpTo).toHaveBeenNthCalledWith(1, 3);
    expect(onJumpTo).toHaveBeenNthCalledWith(2, 0);
  });

  it("does not offer the current question as somewhere to jump", () => {
    const onJumpTo = vi.fn();
    render(<AnswerOvals {...base} onJumpTo={onJumpTo} />);

    fireEvent.click(screen.getByRole("button", { name: "Question 2, answered, current" }));

    expect(onJumpTo).not.toHaveBeenCalled();
  });

  it("explains itself when jumping is off rather than going quietly dead", () => {
    const onJumpTo = vi.fn();
    render(
      <AnswerOvals
        {...base}
        jumpEnabled={false}
        jumpDisabledReason="Paused — resume to navigate"
        onJumpTo={onJumpTo}
      />,
    );

    const oval = screen.getByRole("button", {
      name: "Question 4, Paused — resume to navigate",
    });
    fireEvent.click(oval);

    expect(onJumpTo).not.toHaveBeenCalled();
    expect(oval).toHaveAttribute("title", "Paused — resume to navigate");
  });

  it("says nothing about whether an answer was right, because an oval is a question", () => {
    // The strip is navigation. A built set reveals answers, so the data is there,
    // and it still must not leak into the ovals: no correct/incorrect wording.
    render(<AnswerOvals {...base} onJumpTo={vi.fn()} />);

    for (const oval of screen.getAllByRole("button")) {
      const label = oval.getAttribute("aria-label") ?? "";
      expect(label).not.toMatch(/correct|incorrect|right|wrong/i);
    }
  });

  it("renders nothing at all for an empty queue", () => {
    const { container } = render(
      <AnswerOvals {...base} questionQueue={[]} onJumpTo={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
