import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConclusionTypeSwitchboard } from "./ConclusionTypeSwitchboard";

describe("ConclusionTypeSwitchboard", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reveals the matching type and weak spot after the student classifies the claim", () => {
    render(<ConclusionTypeSwitchboard />);

    // Advance to the causal example (claim 2): classify claim 1, then Next claim.
    fireEvent.click(screen.getByRole("radio", { name: /recommendation/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the type/i }));
    fireEvent.click(screen.getByRole("button", { name: /next claim/i }));

    fireEvent.click(screen.getByRole("radio", { name: /causal hypothesis/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the type/i }));

    expect(screen.getByText(/that conclusion is a causal hypothesis/i)).toBeInTheDocument();
    expect(screen.getByText(/it claims to know why something happened/i)).toBeInTheDocument();
    expect(screen.getByText(/what else could explain it/i)).toBeInTheDocument();
  });

  it("corrects a wrong classification and points the student toward the right type", () => {
    render(<ConclusionTypeSwitchboard />);

    // Claim 1 is a recommendation; picking Prediction is wrong.
    fireEvent.click(screen.getByRole("radio", { name: /prediction/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the type/i }));

    expect(screen.getByText(/not this one/i)).toBeInTheDocument();
    expect(screen.getByText(/the right label here is recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/it tells us what should happen/i)).toBeInTheDocument();
  });
});
