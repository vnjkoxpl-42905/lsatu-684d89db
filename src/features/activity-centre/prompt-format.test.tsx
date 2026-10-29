import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "./content";
import { PROMPT_SCALE_CLASS, promptScale, renderPrompt } from "./prompt-format";

// Two Activities author structure into the prompt text: Spot the Callback marks
// its callback phrase and runs to two paragraphs, Vocab Rehab marks its target
// word. Rendering the prompt as a bare string showed the asterisks and
// collapsed the paragraph break, so these pin the formatter.

describe("renderPrompt", () => {
  it("renders **strong** as emphasis rather than asterisks", () => {
    render(<div>{renderPrompt('He calls it **"that fenestral overreach"** in the report.')}</div>);
    expect(screen.getByText('"that fenestral overreach"').tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("renders *emphasis* as emphasis rather than asterisks", () => {
    render(<div>{renderPrompt("Investors were wary of its *capricious* swings.")}</div>);
    expect(screen.getByText("capricious").tagName).toBe("EM");
    expect(screen.queryByText(/\*/)).toBeNull();
  });

  it("keeps a blank line as a real paragraph break", () => {
    const { container } = render(<div>{renderPrompt("First para.\n\nSecond para.")}</div>);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("leaves an ordinary one-line statement as a single paragraph", () => {
    const { container } = render(<div>{renderPrompt("A lantern lights only if its wick is dry.")}</div>);
    const paras = container.querySelectorAll("p");
    expect(paras).toHaveLength(1);
    expect(paras[0].textContent).toBe("A lantern lights only if its wick is dry.");
  });

  it("does not eat an asterisk that is not a complete pair", () => {
    const { container } = render(<div>{renderPrompt("A lone * survives.")}</div>);
    expect(container.textContent).toBe("A lone * survives.");
  });
});

describe("promptScale", () => {
  it("steps down as the prompt grows, so a passage is not set at display size", () => {
    expect(promptScale("A lantern lights only if its wick is dry.")).toBe("display");
    expect(promptScale("x".repeat(300))).toBe("statement");
    expect(promptScale("x".repeat(600))).toBe("passage");
  });

  it("gives every seeded item a defined scale class", () => {
    for (const activity of SEED_ACTIVITIES) {
      for (const item of activity.items) {
        expect(PROMPT_SCALE_CLASS[promptScale(item.prompt)], `${activity.slug} ${item.order}`).toBeTruthy();
      }
    }
  });

  it("never sets a Callback passage at display size", () => {
    const callback = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-callback")!;
    expect(callback.items.every((i) => promptScale(i.prompt) !== "display")).toBe(true);
  });

  it("never sets a single-sentence statement at passage size", () => {
    // Spot the Relationship is one sentence per item throughout, though the
    // rung-4 items run long enough to step off display type, which is intended.
    const relationship = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
    expect(relationship.items.every((i) => promptScale(i.prompt) !== "passage")).toBe(true);
  });
});

describe("every seeded prompt survives rendering", () => {
  it.each(SEED_ACTIVITIES.map((a) => [a.slug, a] as const))(
    "%s renders with no stray asterisks and no lost text",
    (_slug, activity) => {
      for (const item of activity.items) {
        const { container, unmount } = render(<div>{renderPrompt(item.prompt)}</div>);
        const text = container.textContent ?? "";
        expect(text, `item ${item.order}`).not.toContain("*");
        // Nothing but the markers should have been removed.
        expect(text.length, `item ${item.order}`).toBe(
          item.prompt.replace(/\*/g, "").replace(/\n{2,}/g, "").length,
        );
        unmount();
      }
    },
  );
});
