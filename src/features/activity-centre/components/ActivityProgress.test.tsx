import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityProgress } from "./ActivityProgress";

describe("ActivityProgress", () => {
  it("starts empty and reaches completion only when all questions are resolved", () => {
    const { rerender } = render(<ActivityProgress completed={0} total={62} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0% complete")).toBeInTheDocument();
    rerender(<ActivityProgress completed={61} total={62} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "98");
    rerender(<ActivityProgress completed={62} total={62} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100% complete")).toBeInTheDocument();
  });
});
