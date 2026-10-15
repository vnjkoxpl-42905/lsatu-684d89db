import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachFeedback } from "./CoachFeedback";
import content from "../content/spot-the-relationship.json";
import type { ActivityItem } from "../api/types";

const item = (n: number) => content.items.find((i) => i.order === n) as unknown as ActivityItem;

describe("Spot the Relationship explanation boundaries", () => {
  it("first retry shows the hint only: no explanation, no credited answer, no key", () => {
    const { container } = render(<CoachFeedback verdict="partial" feedback="Look again." revealed={false} resolved={false} item={item(29)} />);
    expect(container.textContent).not.toMatch(/trapped water|Credited answer|->/);
  });
  it("an instant or AI correct answer shows the full authored explanation without the reveal", () => {
    const { container } = render(<CoachFeedback verdict="correct" feedback="" revealed={false} resolved item={item(29)} />);
    for (const w of ["Only when", "Lower than", "Expands", "because", "trapped water"]) expect(container.textContent).toContain(w);
    expect(screen.queryByText("Credited answer")).toBeNull();
    expect(container.textContent).not.toContain("->"); // key connections stay private
  });
  it("after the attempt cap the credited answer and explanation both show", () => {
    const { container } = render(<CoachFeedback verdict="incorrect" feedback="x" revealed resolved item={item(36)} />);
    expect(screen.getByText("Credited answer")).toBeTruthy();
    expect(container.textContent).toMatch(/Longer is another valid comparison/);
  });
});
