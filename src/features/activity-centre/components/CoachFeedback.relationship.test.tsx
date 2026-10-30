import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachFeedback } from "./CoachFeedback";
import content from "../content/spot-the-relationship.json";
import type { ActivityItem } from "../api/types";

const item = (n: number) => content.items.find((i) => i.order === n) as unknown as ActivityItem;

describe("Spot the Relationship explanation boundaries", () => {
  it("shows alternative quotations as or, with one quotation required per type", () => {
    render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback="" revealed resolved item={item(27)} />);
    expect(screen.getByText('“because” or “accelerates”')).toBeVisible();
    expect(screen.getByText('One quotation for each relationship type is enough.')).toBeVisible();
    expect(screen.getByText('Conditional', { selector: 'dt' })).toBeVisible();
    expect(screen.getByText('Causal', { selector: 'dt' })).toBeVisible();
  });
  it("uses the historical item's own indicators and leaves unkeyed snapshots readable", () => {
    const historical = { ...item(27), answer_key: { relationships: [{ type: 'causal', indicators: ['changed'], connects: 'a -> b', why: 'old key' }], traps: [], context_benchmark: null } };
    const { rerender } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback="" revealed resolved item={historical} />);
    expect(screen.getByText('“changed”')).toBeVisible();
    expect(screen.queryByText('“because” or “accelerates”')).toBeNull();
    rerender(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback="" revealed resolved item={{ ...historical, answer_key: undefined, credited_answers: ['Historical answer'] }} />);
    expect(screen.getByText('Historical answer')).toBeVisible();
  });
  it("keeps non-Spot revealed answers unchanged", () => {
    render(<CoachFeedback activitySlug="another-activity" verdict="correct" feedback="" revealed resolved item={item(27)} />);
    expect(screen.getByText(item(27).credited_answers[0])).toBeVisible();
    expect(screen.queryByText('One quotation for each relationship type is enough.')).toBeNull();
  });
  it("falls back to the saved credited text for a malformed historical key", () => {
    const malformed = { ...item(27), answer_key: {} } as ActivityItem;
    render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback="" revealed resolved item={malformed} />);
    expect(screen.getByText(item(27).credited_answers[0])).toBeVisible();
  });
  const legacyHint = "Check each relationship you name against the exact words in the sentence that create it. Then reread the sentence for anything you have not yet named.";
  it("updates a legacy fallback hint without revealing the answer", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback={legacyHint} revealed={false} resolved={false} item={item(2)} />);
    expect(container.textContent).toContain("Check that each relationship type matches the words you quoted.");
    expect(container.textContent).not.toMatch(/create it|Credited answer|sufficient/);
  });
  it("replaces retry advice with the authored explanation after revealing", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback={legacyHint} revealed resolved item={item(2)} />);
    expect(container.textContent).toMatch(/Credited answer/);
    expect(container.textContent).toContain("makes missing the tide sufficient");
    expect(container.textContent).not.toMatch(/Check that|create it/);
  });
  it("first retry shows the hint only: no explanation, no credited answer, no key", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="partial" feedback="Look again." revealed={false} resolved={false} item={item(29)} />);
    expect(container.textContent).not.toMatch(/trapped water|Credited answer|->/);
  });
  it("an instant or AI correct answer shows the full authored explanation without the reveal", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="correct" feedback="" revealed={false} resolved item={item(29)} />);
    for (const w of ["Only when", "Lower than", "Expands", "because", "trapped water"]) expect(container.textContent).toContain(w);
    expect(screen.queryByText("Credited answer")).toBeNull();
    expect(container.textContent).not.toContain("->"); // key connections stay private
  });
  it("after the attempt cap the credited answer and explanation both show", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" verdict="incorrect" feedback="x" revealed resolved item={item(36)} />);
    expect(screen.getByText("Credited answer")).toBeTruthy();
    expect(container.textContent).toMatch(/Longer is another valid comparison/);
  });
});
