import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DrillExplanationTab from "./DrillExplanationTab";

describe("DrillExplanationTab", () => {
  it("under review controls, tells the student to press Explanation and shows nothing else", () => {
    render(
      <DrillExplanationTab
        revealed={false}
        explanationPill
        activeStyle={null}
        onStyleChange={vi.fn()}
        data={{
          questionId: "x",
          preptest: 1,
          section: 1,
          questionNumber: 1,
          questionType: "Flaw",
          correctChoice: "A",
          choices: [],
          styles: [{ style: "single", label: "Explanation", steps: [{ position: 1, label: "Goal", body: "Find the flaw." }], notesByLetter: {} }],
          hasAuthored: true,
        }}
      />,
    );
    expect(screen.getByText("Press Explanation to open the written explanation.")).toBeInTheDocument();
    expect(screen.queryByText("Goal:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Correct answer/)).not.toBeInTheDocument();
  });

  it("keeps the legacy unlock copy without the pill", () => {
    render(<DrillExplanationTab revealed={false} activeStyle={null} onStyleChange={vi.fn()} />);
    expect(screen.getByText(/unlocks once you have answered/)).toBeInTheDocument();
  });

  it("without prose, offers the tutor only when a handler is passed", () => {
    const { rerender } = render(
      <DrillExplanationTab revealed activeStyle={null} onStyleChange={vi.fn()} data={null} />,
    );
    expect(screen.getByText("No written explanation was published for this question.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ask Joshua/ })).not.toBeInTheDocument();
    rerender(
      <DrillExplanationTab revealed activeStyle={null} onStyleChange={vi.fn()} data={null} onAskTutor={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Ask Joshua/ })).toBeInTheDocument();
  });
});
