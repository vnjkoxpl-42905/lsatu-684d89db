import { render, screen } from "@testing-library/react";
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
});
