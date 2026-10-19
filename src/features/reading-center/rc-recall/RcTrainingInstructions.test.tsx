import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RcTrainingInstructions from "./RcTrainingInstructions";

describe("RC Training instructions", () => {
  it("opens the written steps directly and returns focus when the same link is used again", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<MemoryRouter initialEntries={["/reading-center/rc-recall/instructions#rc-instructions-steps"]}><RcTrainingInstructions /></MemoryRouter>);
    const steps = screen.getByRole("heading", { name: "Work through one paragraph at a time" });
    expect(steps).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    screen.getByRole("link", { name: "Back to RC Training" }).focus();
    fireEvent.click(screen.getByRole("link", { name: "Read the written steps" }));
    expect(steps).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });
  it("explains the paragraph routine and returns to passage choices", () => {
    const { container } = render(<MemoryRouter><RcTrainingInstructions /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "How to practise RC Training" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose a passage" })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-start");
    expect(screen.getByRole("link", { name: "Back to RC Training" })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-start");
    expect(container.textContent).toContain("Hide paragraph");
    expect(container.textContent).toContain("Check recall");
    expect(container.textContent).toContain("Recall only the new paragraph");
    expect(container.textContent).toContain("whole-passage recall at the end is optional");
    expect(container.textContent).toContain("Only your hidden recall speech is graded");
    expect(container.textContent).toContain("Silent recalls and unusable recordings are not graded");
    expect(container.textContent).toContain("Your microphone stays on while you read, recall and check");
    expect(container.textContent).toContain("There is no time limit");
    expect(container.textContent).toContain("No clock selected");
    expect(container.textContent).toContain("Show elapsed time");
    expect(container.textContent).toContain("Time pauses when you leave practice and resume later");
    expect(container.textContent).toContain("Complete practice and save your result, then choose Get feedback");
    expect(container.textContent).not.toContain("Open Timer");
    expect(screen.getByRole("heading", { name: "Watch the paragraph routine" })).toBeInTheDocument();
    expect(screen.getByLabelText("RC Training demonstration")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Decaf|Cappuccino|retell paragraphs 1 and 2|countdown/i);
  });
});
