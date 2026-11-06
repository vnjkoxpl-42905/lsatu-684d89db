import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PracticeRailGroups } from "./PracticeRailGroups";

const navClass = (active: boolean) => (active ? "nav active" : "nav");

describe("PracticeRailGroups", () => {
  it("sends the Practice Exams row to the landing the layout chose", () => {
    const go = vi.fn();
    render(
      <PracticeRailGroups
        pathname="/home"
        locked={false}
        examsLanding="/practice/exams/attempts"
        go={go}
        navClass={navClass}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Practice Exams" }));
    expect(go).toHaveBeenCalledWith("/practice/exams/attempts");
    fireEvent.click(screen.getByRole("button", { name: "Drilling" }));
    expect(go).toHaveBeenLastCalledWith("/practice/drills");
  });

  it("defaults the Practice Exams row to the overview", () => {
    const go = vi.fn();
    render(<PracticeRailGroups pathname="/home" locked={false} go={go} navClass={navClass} />);
    fireEvent.click(screen.getByRole("button", { name: "Practice Exams" }));
    expect(go).toHaveBeenCalledWith("/practice/exams");
  });
});
