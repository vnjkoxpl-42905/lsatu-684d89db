import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InlineChoiceExplanation, { ChoiceNoteToggle, hasChoiceNoteProse } from "./InlineChoiceExplanation";

describe("InlineChoiceExplanation (Choice Note)", () => {
  it("closed renders the header and no prose", () => {
    render(
      <InlineChoiceExplanation
        letter="B"
        isCorrect
        isSelected={false}
        content={{ tag: "Correct", studentPercent: 58, note: "This adds plausibility." }}
        open={false}
      />,
    );
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("58% of students")).toBeInTheDocument();
    expect(screen.queryByText(/adds plausibility/)).not.toBeInTheDocument();
  });

  it("open renders the prose with the right heading", () => {
    render(
      <InlineChoiceExplanation
        letter="A"
        isCorrect={false}
        isSelected
        content={{ tag: "Out of Scope", note: "It compares programming, not TV." }}
        open
      />,
    );
    expect(screen.getByText("Why this is wrong")).toBeInTheDocument();
    expect(screen.getByText(/compares programming/)).toBeInTheDocument();
    expect(screen.getByText("Your answer")).toBeInTheDocument();
  });

  it("a whitespace note is not prose", () => {
    expect(hasChoiceNoteProse({ note: "   \n" })).toBe(false);
    expect(hasChoiceNoteProse({ note: null })).toBe(false);
    expect(hasChoiceNoteProse({ note: "x" })).toBe(true);
    render(
      <InlineChoiceExplanation letter="C" isCorrect={false} isSelected={false} content={{ tag: "Premise", note: "  " }} open />,
    );
    expect(screen.getByText("Premise")).toBeInTheDocument();
    expect(screen.queryByText("Why this is wrong")).not.toBeInTheDocument();
  });

  it("renders nothing for a letter with no content and no selection", () => {
    const { container } = render(
      <InlineChoiceExplanation letter="D" isCorrect={false} isSelected={false} content={{}} open />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChoiceNoteToggle", () => {
  it("labels itself, reports aria-expanded, and does not bubble the click", () => {
    const onToggle = vi.fn();
    const onOuter = vi.fn();
    render(
      <div onClick={onOuter}>
        <ChoiceNoteToggle letter="B" open={false} onToggle={onToggle} />
      </div>,
    );
    const button = screen.getByRole("button", { name: "Show explanation for B" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
  });
});
