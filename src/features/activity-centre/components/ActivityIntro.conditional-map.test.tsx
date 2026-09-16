import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import conditionalRephrase from "../content/conditional-rephrase.json";
import { ActivityIntro } from "./ActivityIntro";

describe("Conditional Rephrase intro", () => {
  it("uses the four-group map and overrides stale stored copy", () => {
    const { container } = render(
      <ActivityIntro
        title={conditionalRephrase.title}
        subtitle="Diagram it on paper, then record the route"
        instructions={{
          ...conditionalRephrase.instructions,
          task: "Diagram the statement on paper first. Then choose the route that matches what you wrote.",
        }}
        itemCount={conditionalRephrase.items.length}
        maxAttempts={2}
        format="mcq"
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "The conditional map" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Conditional Rephrase\. Diagram it on paper, then choose the matching answer\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Diagram the statement on paper first. Then choose the diagram that matches what you wrote. The original conditional and its contrapositive are both correct because they mean the same thing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Find the indicator. Then use the group it belongs to.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Left Sufficient triggers/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Right Necessary triggers/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^Group [1-4]$/)).toHaveLength(4);
    expect(container.querySelectorAll(".act-conditional-side")).toHaveLength(2);
    expect(container.querySelectorAll(".act-conditional-special")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Required means right" })).toBeInTheDocument();
    expect(screen.queryByText(/^Rule [1-5]$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Five rules/i)).not.toBeInTheDocument();
    expect(container.querySelector(".act-steps")).not.toBeInTheDocument();
    expect(screen.queryByText(/62 questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contrapositive: negate both sides/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/route/i)).not.toBeInTheDocument();
  });
});
