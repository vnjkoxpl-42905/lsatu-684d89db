import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoleLabeler, type RoleLabelerRole } from "./RoleLabeler";

const roles: RoleLabelerRole[] = [
  { id: "background", label: "Background", tone: "background" },
  { id: "opposing-view", label: "Opposing View", tone: "opposing" },
  { id: "concession", label: "Concession", tone: "concession" },
  { id: "pivot", label: "Pivot", tone: "pivot" },
  { id: "author-premise", label: "Author's Premise", tone: "premise" },
  { id: "author-conclusion", label: "Author's Conclusion", tone: "conclusion" },
];

const stimulus = [
  { id: "sentence-1", text: "The city museum has operated at a deficit for three years." },
  { id: "sentence-2", text: "Some taxpayers argue that public funding for the museum should be eliminated." },
  { id: "sentence-3", text: "They point out that only a small percentage of residents visit the museum each year." },
  { id: "sentence-4", text: "However, the museum provides free educational programs for local schools," },
  { id: "sentence-5", text: "so the city should continue funding it." },
];

const answerKey = {
  "sentence-1": "background",
  "sentence-2": "opposing-view",
  "sentence-3": "opposing-view", // Folded "Opposing Support" into Opposing Viewpoint
  "sentence-4": "author-premise",
  "sentence-5": "author-conclusion",
} as const;

function renderRoleLabeler() {
  return render(
    <RoleLabeler
      title="Example: Museum Funding"
      stimulus={stimulus}
      roles={roles}
      answerKey={answerKey}
      teachingSummary={[
        "Background: the museum deficit sets the scene.",
        "Author's Conclusion: the city should continue funding it.",
      ]}
    />,
  );
}

describe("RoleLabeler", () => {
  it("labels a sentence correctly after the student picks a role chip", () => {
    renderRoleLabeler();

    fireEvent.click(screen.getByRole("button", { name: "Background" }));
    fireEvent.click(screen.getByRole("button", { name: /the city museum has operated at a deficit/i }));

    expect(screen.getAllByText("Background").length).toBeGreaterThan(1);
    expect(screen.getByText(/locked in: that sentence is doing background work/i)).toBeInTheDocument();
  });

  it("shows corrective feedback on a wrong label without locking the sentence", () => {
    renderRoleLabeler();

    fireEvent.click(screen.getByRole("button", { name: "Author's Conclusion" }));
    fireEvent.click(screen.getByRole("button", { name: /the city museum has operated at a deficit/i }));

    expect(screen.getByText(/not quite. that sentence is background, not author's conclusion/i)).toBeInTheDocument();
    expect(screen.queryByText(/locked in: that sentence is doing background work/i)).not.toBeInTheDocument();
  });

  it("does not let a locked sentence be reassigned", () => {
    renderRoleLabeler();

    fireEvent.click(screen.getByRole("button", { name: "Background" }));
    fireEvent.click(screen.getByRole("button", { name: /the city museum has operated at a deficit/i }));
    fireEvent.click(screen.getByRole("button", { name: "Opposing View" }));
    fireEvent.click(screen.getByRole("button", { name: /the city museum has operated at a deficit/i }));

    expect(screen.getByText(/that sentence is already locked/i)).toBeInTheDocument();
  });

  it("shows completion state and supports reset after all sentences are labeled", () => {
    renderRoleLabeler();

    fireEvent.click(screen.getByRole("button", { name: "Background" }));
    fireEvent.click(screen.getByRole("button", { name: /the city museum has operated at a deficit/i }));
    fireEvent.click(screen.getByRole("button", { name: "Opposing View" }));
    fireEvent.click(screen.getByRole("button", { name: /some taxpayers argue that public funding/i }));
    fireEvent.click(screen.getByRole("button", { name: "Opposing View" }));
    fireEvent.click(screen.getByRole("button", { name: /they point out that only a small percentage/i }));
    fireEvent.click(screen.getByRole("button", { name: "Author's Premise" }));
    fireEvent.click(screen.getByRole("button", { name: /however, the museum provides free educational programs/i }));
    fireEvent.click(screen.getByRole("button", { name: "Author's Conclusion" }));
    fireEvent.click(screen.getByRole("button", { name: /so the city should continue funding it/i }));

    expect(screen.getByText(/you labeled every sentence in the stimulus/i)).toBeInTheDocument();
    expect(screen.getByText(/author's conclusion: the city should continue funding it/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.queryByText(/you labeled every sentence in the stimulus/i)).not.toBeInTheDocument();
  });

  it("supports keyboard-driven chip selection and sentence activation", () => {
    renderRoleLabeler();

    const chip = screen.getByRole("button", { name: "Background" });
    chip.focus();
    fireEvent.keyDown(chip, { key: "Enter" });

    const sentence = screen.getByRole("button", { name: /the city museum has operated at a deficit/i });
    sentence.focus();
    fireEvent.keyDown(sentence, { key: "Enter" });

    expect(screen.getByText(/locked in: that sentence is doing background work/i)).toBeInTheDocument();
  });
});
