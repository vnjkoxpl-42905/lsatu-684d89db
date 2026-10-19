import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RcTrainingInstructions from "./RcTrainingInstructions";

describe("RC Training instructions", () => {
  it("explains the paragraph routine and returns to passage choices", () => {
    const { container } = render(<MemoryRouter><RcTrainingInstructions /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "How to practise RC Training" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose a passage" })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-start");
    expect(screen.getByRole("link", { name: "Back to RC Training" })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-start");
    expect(container.textContent).toContain("Hide the text and recall paragraph 1");
    expect(container.textContent).toContain("Check my recall");
    expect(container.textContent).toContain("Recall only the new paragraph");
    expect(container.textContent).toContain("optional passage recall");
    expect(container.textContent).toContain("The app doesn't grade your recall");
    expect(container.textContent).toContain("There is no time limit");
    expect(container.textContent).not.toMatch(/Decaf|Cappuccino|retell paragraphs 1 and 2|countdown/i);
  });
});
