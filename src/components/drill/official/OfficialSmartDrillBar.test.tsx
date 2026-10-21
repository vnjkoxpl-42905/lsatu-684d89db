import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfficialSmartDrillBar from "./OfficialSmartDrillBar";

const base = {
  primaryAction: "submit" as const,
  onSubmit: vi.fn(),
  onNext: vi.fn(),
  onEnd: vi.fn(),
};

describe("OfficialSmartDrillBar", () => {
  it("walks a fixed queue both ways instead of only skipping forward", () => {
    const onPrev = vi.fn();
    const onAdvance = vi.fn();
    render(<OfficialSmartDrillBar {...base} onPrev={onPrev} onAdvance={onAdvance} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
  });

  it("disables Previous on the first question of the set", () => {
    render(
      <OfficialSmartDrillBar {...base} onPrev={vi.fn()} prevDisabled onAdvance={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("drops the primary pill once the question is answered, leaving Next to carry on", () => {
    render(
      <OfficialSmartDrillBar
        {...base}
        primaryAction="next"
        primaryVisible={false}
        onPrev={vi.fn()}
        onAdvance={vi.fn()}
      />,
    );

    // Exactly one Next: the navigation pill. The primary slot is empty, so the
    // student is never offered the same move twice.
    expect(screen.getAllByRole("button", { name: "Next" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("keeps Skip for the adaptive queue, which has no earlier question", () => {
    const onSkip = vi.fn();
    render(<OfficialSmartDrillBar {...base} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });
});
