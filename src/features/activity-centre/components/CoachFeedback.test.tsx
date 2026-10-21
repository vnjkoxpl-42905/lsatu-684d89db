import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachFeedback } from "./CoachFeedback";
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
