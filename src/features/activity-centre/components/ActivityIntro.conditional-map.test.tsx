import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import conditionalRephrase from "../content/conditional-rephrase.json";
import { ActivityIntro } from "./ActivityIntro";

describe("Conditional Rephrase intro", () => {
  it("replaces the ten-step wall with one five-part conditional map", () => {
    const { container } = render(
      <ActivityIntro
        title={conditionalRephrase.title}
        subtitle={conditionalRephrase.subtitle}
        instructions={conditionalRephrase.instructions}
        itemCount={conditionalRephrase.items.length}
        maxAttempts={2}
        format="mcq"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "The conditional map" })).toBeInTheDocument();
    expect(
      screen.getByText("Five rules: Left, Right, If not, No A's are B, and Required things."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Left Sufficient triggers/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Right Necessary triggers/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^Rule [1-5]$/)).toHaveLength(5);
    expect(container.querySelectorAll(".act-conditional-side")).toHaveLength(2);
    expect(container.querySelectorAll(".act-conditional-special")).toHaveLength(3);
    expect(container.querySelector(".act-steps")).not.toBeInTheDocument();
    expect(screen.queryByText(/62 questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contrapositive: negate both sides/i)).not.toBeInTheDocument();
  });
});
