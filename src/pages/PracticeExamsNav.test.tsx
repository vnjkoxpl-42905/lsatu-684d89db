import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PracticeExamsNav } from "./PracticeExamsNav";

describe("Practice Exams navigation", () => {
  it.each([
    ["/practice/exams", "Practice Exams"],
    ["/practice/exams/all", "All Exams"],
    ["/practice/exams/130", "All Exams"],
    ["/practice/exams/attempts", "Attempts"],
  ])("marks %s as %s", (path, selected) => {
    render(<MemoryRouter initialEntries={[path]}><PracticeExamsNav /></MemoryRouter>);

    const links = screen.getAllByRole("link");
    expect(links.filter((link) => link.classList.contains("active")).map((link) => link.textContent)).toEqual([selected]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/practice/exams",
      "/practice/exams/all",
      "/practice/exams/attempts",
    ]);
  });
});
