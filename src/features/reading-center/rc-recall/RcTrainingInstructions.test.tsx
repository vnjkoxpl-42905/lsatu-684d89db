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
    screen.getByRole("link", { name: "Enter RC Training" }).focus();
    fireEvent.click(screen.getByRole("link", { name: "Read the written steps" }));
    expect(steps).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });
  it("introduces practice before one clear entry link without clock setup", () => {
    const { container } = render(<MemoryRouter><RcTrainingInstructions /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "RC Training" })).toBeInTheDocument();
    const entry = screen.getByRole("link", { name: "Enter RC Training" });
    expect(entry).toHaveAttribute("href", "/reading-center/rc-recall/passages");
    expect(screen.getAllByRole("link", { name: "Enter RC Training" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Watch the one-minute demo" })).toBeInTheDocument();
    expect(entry.compareDocumentPosition(screen.getByLabelText("RC Training demonstration")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain("in your head");
    expect(container.textContent).toContain("feedback starts automatically");
    expect(container.textContent).toContain("Recall paragraph");
    expect(container.textContent).not.toMatch(/Check recall|Hide paragraph|whole-passage recall/);
    expect(container.textContent).not.toMatch(/No clock|Show elapsed time|Decaf|Cappuccino/);
  });
});
