import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArgumentBreakdown from "./ArgumentBreakdown";
import type { LrExplanationData } from "@/hooks/useLrExplanation";

const data: LrExplanationData = {
  questionId: "x",
  preptest: 23,
  section: 2,
  questionNumber: 18,
  questionType: "Strengthen",
  correctChoice: "B",
  choices: [],
  styles: [
    {
      style: "standard",
      label: "Standard",
      steps: [
        { position: 1, label: "Conclusion", body: "TV helps explain the rise in urban homicide." },
        { position: 2, label: "Evidence", body: "TV reached cities five years earlier." },
      ],
      notesByLetter: {},
    },
    { style: "brief", label: "Brief", steps: [], notesByLetter: {} },
  ],
  hasAuthored: true,
};

function renderBreakdown(open: boolean, onToggle = vi.fn(), overrides: Partial<React.ComponentProps<typeof ArgumentBreakdown>> = {}) {
  render(
    <ArgumentBreakdown
      data={data}
      activeStyle={null}
      onStyleChange={vi.fn()}
      open={open}
      onToggle={onToggle}
      {...overrides}
    />,
  );
  return onToggle;
}

describe("ArgumentBreakdown", () => {
  it("closed shows only the chevron on the rule", () => {
    const onToggle = renderBreakdown(false);
    const chevron = screen.getByRole("button", { name: "Show argument breakdown" });
    expect(chevron).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Conclusion")).not.toBeInTheDocument();
    fireEvent.click(chevron);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("open shows the steps, label on its own line, and the style pills", () => {
    renderBreakdown(true);
    expect(screen.getByRole("button", { name: "Hide argument breakdown" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Conclusion")).toBeInTheDocument();
    expect(screen.getByText(/TV reached cities/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Brief" })).toBeInTheDocument();
  });

  it("borrows Standard's steps for a style with none and says so", () => {
    renderBreakdown(true, vi.fn(), { activeStyle: "brief" });
    expect(screen.getByText("same as Standard")).toBeInTheDocument();
    expect(screen.getByText("Conclusion")).toBeInTheDocument();
  });

  it("is honest about loading, errors and missing prose", () => {
    const { unmount } = render(
      <ArgumentBreakdown data={null} isLoading activeStyle={null} onStyleChange={vi.fn()} open onToggle={vi.fn()} />,
    );
    expect(screen.getByText("Loading explanation…")).toBeInTheDocument();
    unmount();
    render(
      <ArgumentBreakdown
        data={{ ...data, hasAuthored: false, styles: [] }}
        activeStyle={null}
        onStyleChange={vi.fn()}
        open
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("No written explanation was published for this question.")).toBeInTheDocument();
  });
});
