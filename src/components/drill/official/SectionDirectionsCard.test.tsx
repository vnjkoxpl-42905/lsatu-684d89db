import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SectionDirectionsView } from "./SectionDirectionsCard";
import { SECTION_DIRECTIONS } from "@/lib/sectionDirections";

const base = {
  sectionNumber: 2,
  minutes: 35,
  questionCount: 26,
  directions: SECTION_DIRECTIONS.lr,
};

describe("SectionDirectionsView", () => {
  it("shows the section card with the running clock, padded like the toolbar", () => {
    render(<SectionDirectionsView {...base} timerLabel="9:22" onBackToQuestions={() => {}} />);
    expect(screen.getByRole("heading", { name: "Section 2" })).toBeInTheDocument();
    expect(screen.getByText("Total Section Time - 35 minutes")).toBeInTheDocument();
    expect(screen.getByText("26 Questions")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("09:22");
  });

  it("returns to the questions from either button", () => {
    const back = vi.fn();
    render(<SectionDirectionsView {...base} timerLabel="29:22" onBackToQuestions={back} />);
    fireEvent.click(screen.getByRole("button", { name: "Questions" }));
    fireEvent.click(screen.getByRole("button", { name: "GO TO QUESTIONS" }));
    expect(back).toHaveBeenCalledTimes(2);
  });

  it("has no clock on an untimed section", () => {
    render(
      <SectionDirectionsView {...base} minutes={null} timerLabel="" onBackToQuestions={() => {}} />,
    );
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByText("Untimed section")).toBeInTheDocument();
  });
});
