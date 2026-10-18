import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachFeedback } from "./CoachFeedback";
import { SEED_ACTIVITIES } from "../content";
import { relationshipExplanation } from "../relationshipPresentation";
import type { ActivityItem } from "../api/types";

// Two things a student could not see before. The authored explanation names the
// indicator word and the discrimination the item teaches, and it was gated
// behind the reveal -- so the students who answered correctly, and only them,
// never read a word of the drill's own teaching. And the contrapositive, which
// the task asks for by name, was labelled as optional extra credit.

const item: ActivityItem = {
  order: 1,
  prompt: "Whenever the greenhouse fans run overnight, the orchids bloom by morning.",
  credited_answers: [
    "If the fans run overnight, then the orchids bloom by morning.",
    "If the orchids did not bloom by morning, then the fans did not run overnight.",
  ],
  explanation: '"Whenever" (sufficient). "Whenever," like "every" and "all," marks the sufficient side.',
};

const EXPLANATION = /marks the sufficient side/;

function show(props: Partial<React.ComponentProps<typeof CoachFeedback>> = {}) {
  render(
    <CoachFeedback
      verdict="correct"
      feedback=""
      revealed={false}
      resolved={false}
      item={item}
      {...props}
    />,
  );
}

describe("the teaching a resolved item shows", () => {
  it("shows the authored explanation on a correct answer, with no reveal", () => {
    show({ verdict: "correct", resolved: true, revealed: false });
    expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
    // The credited answer is still earned, not given away.
    expect(screen.queryByText("Credited answer")).not.toBeInTheDocument();
    expect(screen.queryByText(item.credited_answers[0])).not.toBeInTheDocument();
  });

  it("shows it once, not twice, when the answer was also revealed", () => {
    show({ verdict: "incorrect", resolved: true, revealed: true });
    expect(screen.getAllByText(EXPLANATION)).toHaveLength(1);
    expect(screen.getByText("Credited answer")).toBeInTheDocument();
  });

  it("withholds it while the student still has an attempt left", () => {
    show({ verdict: "partial", resolved: false, revealed: false, feedback: "Close." });
    expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
    expect(screen.getByText("Close.")).toBeInTheDocument();
  });

  it("renders nothing extra for an item that authored no explanation", () => {
    show({ resolved: true, item: { ...item, explanation: "" } });
    expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
  });
});

describe("what the credited answers after the first are called", () => {
  it("uses the Activity's own label when it authored one", () => {
    show({ resolved: true, revealed: true, secondaryLabel: "Contrapositive" });
    expect(screen.getByText(/^Contrapositive:/)).toBeInTheDocument();
  });

  it("keeps today's wording for an Activity that authored none", () => {
    show({ resolved: true, revealed: true });
    expect(screen.getByText(/^Also accepted:/)).toBeInTheDocument();
  });

  it("says nothing at all when there is only one credited answer", () => {
    show({ resolved: true, revealed: true, item: { ...item, credited_answers: [item.credited_answers[0]] } });
    expect(screen.queryByText(/Also accepted:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contrapositive:/)).not.toBeInTheDocument();
  });
});

describe("emphasis in the explanation", () => {
  /**
   * Explanations are authored with *emphasis* the same way prompts are. The
   * panel printed them raw, so a student read "the closing *makes* the rise
   * happen", asterisks and all.
   */
  it("renders *emphasis* as emphasis rather than asterisks", () => {
    show({
      resolved: true,
      item: { ...item, explanation: "Same facts, and now it claims the closing *makes* the rise happen." },
    });
    const em = screen.getByText("makes");
    expect(em.tagName).toBe("EM");
    expect(screen.queryByText(/\*makes\*/)).not.toBeInTheDocument();
  });
});

const first = SEED_ACTIVITIES.find((activity) => activity.slug === "spot-the-relationship")!.items[0];

describe("Spot feedback disclosure", () => {
  it("shows only the hint before resolution", () => {
    render(<CoachFeedback activitySlug="spot-the-relationship" item={first} verdict="partial" feedback="Read the second clause again." revealed={false} resolved={false} />);
    expect(screen.getByText("Read the second clause again.")).toBeVisible();
    expect(screen.queryByText("Credited answer")).toBeNull();
    expect(screen.queryByText(relationshipExplanation(first, "spot-the-relationship"))).toBeNull();
  });

  it("uses corrected presentation for a stale first-item explanation after success", () => {
    const { container } = render(<CoachFeedback activitySlug="spot-the-relationship" item={{ ...first, explanation: "2 relationships in this sentence. Stale explanation." }} verdict="correct" feedback="" revealed={false} resolved />);
    expect(container.textContent).toContain(relationshipExplanation(first, "spot-the-relationship").replace(/\*/g, ""));
    expect(container.textContent).not.toContain("Stale explanation.");
    expect(screen.queryByText("Credited answer")).toBeNull();
  });

  it("reveals the credited answer only when requested", () => {
    render(<CoachFeedback activitySlug="spot-the-relationship" item={first} verdict="incorrect" feedback="" revealed resolved />);
    expect(screen.getByText("Credited answer")).toBeVisible();
    expect(screen.getByText(first.credited_answers[0])).toBeVisible();
  });
});


it("does not apply Spot presentation to another activity with the same prompt and key", () => {
  const saved = { ...first, explanation: "1 relationship in this sentence. Another activity's note." };
  const { container } = render(<CoachFeedback activitySlug="another-activity" item={saved} verdict="correct" feedback="Independent feedback." revealed={false} resolved />);
  expect(container.textContent).toContain(saved.explanation);
  expect(container.textContent).toContain("Independent feedback.");
});
