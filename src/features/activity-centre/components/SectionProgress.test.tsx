import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SectionProgress } from "./SectionProgress";
import type { SectionGradeStub } from "../api/types";

function stub(over: Partial<SectionGradeStub> & { coverage: number }): SectionGradeStub {
  const { coverage, ...rest } = over;
  return {
    assignment_id: "a1",
    attempt_no: 1,
    source_section: "PT1.S3",
    graded_at: "2026-09-01T10:00:00Z",
    section: { mean_coverage: coverage } as SectionGradeStub["section"],
    ...rest,
  };
}

describe("the record of every graded run", () => {
  it("says nothing has been graded yet rather than showing an empty chart", async () => {
    render(<SectionProgress loadGrades={async () => []} />);
    expect(await screen.findByText(/No graded runs yet/i)).toBeInTheDocument();
  });

  it("lists every stored run with its score", async () => {
    render(
      <SectionProgress
        loadGrades={async () => [
          stub({ coverage: 82, assignment_id: "b", graded_at: "2026-09-05T10:00:00Z" }),
          stub({ coverage: 61, assignment_id: "a" }),
        ]}
      />,
    );
    expect(await screen.findByText("82%")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
    expect(screen.getByText(/2 graded runs/)).toBeInTheDocument();
    expect(screen.getByText(/up 21 points since your first/)).toBeInTheDocument();
  });

  it("opens the report card for the run that was pressed", async () => {
    const onOpen = vi.fn();
    render(<SectionProgress loadGrades={async () => [stub({ coverage: 70 })]} onOpen={onOpen} />);
    fireEvent.click(await screen.findByText("70%"));
    expect(onOpen).toHaveBeenCalledWith("a1");
  });

  it("says the runs are still saved when they cannot be read", async () => {
    render(
      <SectionProgress
        loadGrades={async () => {
          throw new Error("offline");
        }}
      />,
    );
    await waitFor(() => expect(screen.getByText(/They are saved/i)).toBeInTheDocument());
  });
});
