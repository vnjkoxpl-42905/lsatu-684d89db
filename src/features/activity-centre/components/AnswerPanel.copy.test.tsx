import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTIVITIES } from "../content";

/**
 * The Activities a student types an answer into. The captured sections are
 * spoken end to end and never reach this panel -- ActivityRunner hands a
 * spoken-recall Activity to a different player entirely (ADR 0009) -- so
 * asking them for an answer label would be asking for copy nothing renders.
 */
const TYPED = SEED_ACTIVITIES.filter((a) => a.item_format !== "spoken-recall");
import { AnswerPanel } from "./AnswerPanel";

// The answer box used to be hardcoded to "Your negation", so Conditional
// Rephrase asked the student for a negation — a different skill from the one
// the drill teaches. The copy is authored per Activity now; these pin that.

function renderPanel(props: Partial<React.ComponentProps<typeof AnswerPanel>>) {
  render(
    <AnswerPanel
      item={SEED_ACTIVITIES[0].items[0]}
      value=""
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      onRetry={vi.fn()}
      onShowAnswer={vi.fn()}
      onNext={vi.fn()}
      judging={false}
      attempts={0}
      result={null}
      revealed={false}
      resolved={false}
      isLast={false}
      {...props}
    />,
  );
}

describe("AnswerPanel answer copy", () => {
  it("uses the Activity's own label and placeholder", () => {
    renderPanel({ answerLabel: "Your rephrase", answerPlaceholder: "Write it as If…" });
    expect(screen.getByText("Your rephrase")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write it as If…")).toBeInTheDocument();
  });

  it("falls back to neutral copy, never to negation, when none is authored", () => {
    renderPanel({});
    expect(screen.getByText("Your answer")).toBeInTheDocument();
    expect(screen.queryByText(/negation/i)).not.toBeInTheDocument();
  });

  it("every seeded Activity authors its own, and none asks for a negation", () => {
    for (const activity of TYPED) {
      expect(activity.instructions.answer_label, activity.slug).toBeTruthy();
      expect(activity.instructions.answer_placeholder, activity.slug).toBeTruthy();
      expect(activity.instructions.answer_label, activity.slug).not.toMatch(/negation/i);
      expect(activity.instructions.answer_placeholder, activity.slug).not.toMatch(/negation|contradicts the original/i);
    }
  });

  it("renders that authored copy for every seeded Activity", () => {
    for (const activity of TYPED) {
      const { unmount } = render(
        <AnswerPanel
          item={activity.items[0]}
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onRetry={vi.fn()}
          onShowAnswer={vi.fn()}
          onNext={vi.fn()}
          judging={false}
          attempts={0}
          result={null}
          revealed={false}
          resolved={false}
          isLast={false}
          answerLabel={activity.instructions.answer_label}
          answerPlaceholder={activity.instructions.answer_placeholder}
        />,
      );
      expect(screen.getByText(activity.instructions.answer_label!), activity.slug).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(activity.instructions.answer_placeholder!),
        activity.slug,
      ).toBeInTheDocument();
      unmount();
    }
  });
});
