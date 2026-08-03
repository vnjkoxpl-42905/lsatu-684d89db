import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../content";
import { StatementPanel } from "./StatementPanel";

function itemFrom(slug: string, order: number) {
  const activity = SEED_ACTIVITIES.find((a) => a.slug === slug)!;
  return activity.items.find((i) => i.order === order)!;
}

describe("StatementPanel renders authored prompt structure", () => {
  it("shows a Callback passage as two paragraphs with the phrase emphasised", () => {
    const item = itemFrom("spot-the-callback", 4); // the arcade item
    const { container } = render(<StatementPanel item={item} showQuestionType />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(screen.getByText('"that fenestral overreach"').tagName).toBe("STRONG");
    expect(container.textContent).not.toContain("*");
  });

  it("emphasises the Vocab Rehab target word inside its paragraph", () => {
    const item = itemFrom("vocab-rehab", 16); // capricious
    const { container } = render(<StatementPanel item={item} showQuestionType />);

    expect(screen.getByText("capricious").tagName).toBe("EM");
    expect(container.textContent).not.toContain("*");
  });

  it("sets a two-paragraph passage in body type and a short statement in display type", () => {
    const passage = itemFrom("spot-the-callback", 1); // shortest passage in the bank
    const statement = itemFrom("spot-the-relationship", 1);

    const { container: a } = render(<StatementPanel item={passage} showQuestionType={false} />);
    const { container: b } = render(<StatementPanel item={statement} showQuestionType={false} />);

    expect(a.querySelector(".ac-display")?.className).toContain("text-lg");
    expect(b.querySelector(".ac-display")?.className).toContain("text-2xl");
  });

  it("shows the difficulty band as the question type chip", () => {
    const item = itemFrom("spot-the-relationship", 48);
    const { container } = render(<StatementPanel item={item} showQuestionType />);
    const chip = container.querySelector("span")!;
    expect(within(chip as HTMLElement).getByText(/Rung 4/)).toBeTruthy();
  });

  it("renders every seeded item without throwing or leaking a marker", () => {
    for (const activity of SEED_ACTIVITIES) {
      for (const item of activity.items) {
        const { container, unmount } = render(<StatementPanel item={item} showQuestionType />);
        const body = container.querySelector(".ac-display")!;
        expect(body.textContent?.trim().length, `${activity.slug} ${item.order}`).toBeGreaterThan(0);
        expect(body.textContent, `${activity.slug} ${item.order}`).not.toContain("*");
        unmount();
      }
    }
  });
});
