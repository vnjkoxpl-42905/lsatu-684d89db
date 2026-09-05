import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfficialSessionStrip from "./OfficialSessionStrip";

describe("OfficialSessionStrip", () => {
  it("defaults the complete action to Complete Section", () => {
    render(
      <OfficialSessionStrip
        breadcrumbs={[{ label: "Library" }, { label: "Question 1" }]}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Complete Section" })).toBeInTheDocument();
  });

  it("allows the complete action label to be customized", () => {
    render(
      <OfficialSessionStrip
        breadcrumbs={[{ label: "Bootcamp" }, { label: "Question 1" }]}
        completeLabel="End Drill"
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "End Drill" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Section" })).not.toBeInTheDocument();
  });

  it("flips Answer and Explanation to their undo state while the reveal is up", () => {
    render(
      <OfficialSessionStrip
        breadcrumbs={[{ label: "Set" }, { label: "Question 21" }]}
        showAnswerVisible
        onShowAnswer={vi.fn()}
        showAnswerActive
        onExplanation={vi.fn()}
        explanationActive
      />,
    );

    expect(screen.getByRole("button", { name: "Hide Answer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Hide Explanation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("lets Explanation open the breakdown before anything is revealed", () => {
    const onExplanation = vi.fn();
    render(
      <OfficialSessionStrip
        breadcrumbs={[{ label: "Set" }, { label: "Question 21" }]}
        onExplanation={onExplanation}
      />,
    );

    const pill = screen.getByRole("button", { name: "Explanation" });
    expect(pill).toBeEnabled();
    fireEvent.click(pill);
    expect(onExplanation).toHaveBeenCalledTimes(1);
  });
});
