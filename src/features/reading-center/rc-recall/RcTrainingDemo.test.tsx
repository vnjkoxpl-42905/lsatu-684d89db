import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RcTrainingDemo from "./RcTrainingDemo";

const P1 = /A museum moved its evening lectures from Fridays to Wednesdays/;
const P2 = /In the same month, the museum made the lectures/;
const go = (tab: RegExp) => fireEvent.click(screen.getByRole("button", { name: tab }));

describe("RC Training demonstration", () => {
  it("starts with paragraph 1 and does not mention paragraph 2 yet", () => {
    render(<RcTrainingDemo />);
    expect(screen.getByText(P1)).toBeVisible();
    expect(screen.queryByText(P2)).not.toBeInTheDocument();
  });

  it("hides the text for recall and gives no answer while the learner is being tested", () => {
    render(<RcTrainingDemo />);
    go(/2 Recall 1/);
    expect(screen.queryByText(P1)).not.toBeInTheDocument();
    expect(document.querySelector("blockquote")).toBeNull();
    expect(screen.getByText("Your turn")).toBeVisible();
  });

  it("labels the instructor's example and shows an omitted qualification being repaired", () => {
    render(<RcTrainingDemo />);
    go(/3 Check 1/);
    expect(screen.getByText("Instructor modelling")).toBeVisible();
    expect(screen.getByText(/so the new schedule worked/)).toBeVisible();
    expect(screen.getByText("may not be the cause")).toBeVisible();
    expect(screen.getByText(/What was lost: the director's qualification/)).toBeVisible();
    const repair = screen.getByText(/What was lost: the director's qualification/);
    expect(repair).toHaveTextContent(/evening lectures from Fridays to Wednesdays/);
    expect(repair).toHaveTextContent(/Attendance rose by a third/);
    expect(repair).toHaveTextContent(/director warned.*might not explain/i);
  });

  it("recalls paragraph 2 alone, then confirms both paragraphs", () => {
    render(<RcTrainingDemo />);
    go(/4 Read 2/);
    expect(screen.getByText(P2)).toBeVisible();
    go(/5 Recall 2/);
    expect(screen.getByText(/Recall paragraph 2 only/)).toBeVisible();
    expect(screen.queryByText(P2)).not.toBeInTheDocument();
    go(/6 Check both/);
    expect(screen.getByText(P1)).toBeVisible();
    expect(screen.getByText(P2)).toBeVisible();
  });

  it("ends with an optional passage recall, not another paragraph, and can restart", () => {
    render(<RcTrainingDemo />);
    go(/7 Passage end/);
    expect(screen.getByText(/It is optional/)).toBeVisible();
    expect(screen.getByText(/never graded/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /watch again/i }));
    expect(screen.getByText(P1)).toBeVisible();
  });

  it("uses no em dashes in its teaching copy", () => {
    const { container } = render(<RcTrainingDemo />);
    for (let i = 1; i <= 7; i++) {
      fireEvent.click(container.querySelectorAll<HTMLButtonElement>(".rct-demo-tabs button")[i - 1]);
      expect(container.textContent).not.toContain("—");
    }
  });
});
