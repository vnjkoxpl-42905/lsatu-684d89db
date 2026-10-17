import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RcTrainingDemo from "./RcTrainingDemo";

describe("RC Training demonstration", () => {
  it("shows a complete paragraph, hides its source for recall, then restores text for checking", () => {
    render(<RcTrainingDemo />);
    const opening = /A museum moved its evening lectures from Fridays to Wednesdays/;
    expect(screen.getByText(opening)).not.toBeVisible();
    fireEvent.click(screen.getByText(/Previously: the museum/));
    expect(screen.getByText(opening)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "2 Recall" }));
    expect(screen.queryByText(opening)).not.toBeInTheDocument();
    expect(screen.getByText(/The museum also made the lectures free for students/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "3 Check" }));
    expect(screen.getByText(opening)).toBeVisible();
    expect(screen.getByText("free for students")).toBeVisible();
  });
});
