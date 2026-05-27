import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConclusionTypeSwitchboard } from "./ConclusionTypeSwitchboard";

describe("ConclusionTypeSwitchboard", () => {
  it("reveals the matching type and weakness after the student classifies the claim", () => {
    render(<ConclusionTypeSwitchboard />);

    fireEvent.click(screen.getByRole("button", { name: /show next example/i }));
    fireEvent.click(screen.getByRole("radio", { name: /causal hypothesis/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the type/i }));

    expect(screen.getByText(/the author is trying to explain why something happened/i)).toBeInTheDocument();
    expect(screen.getByText(/what else could explain it/i)).toBeInTheDocument();
  });

  it("corrects a wrong classification and points the student toward the right type", () => {
    render(<ConclusionTypeSwitchboard />);

    fireEvent.click(screen.getByRole("radio", { name: /prediction/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the type/i }));

    expect(screen.getByText(/not this one/i)).toBeInTheDocument();
    expect(screen.getByText(/this claim is a recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/it is telling us what should be done/i)).toBeInTheDocument();
  });
});
