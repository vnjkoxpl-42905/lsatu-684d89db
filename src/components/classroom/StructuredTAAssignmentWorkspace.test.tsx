import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentTAAssignment } from "@/hooks/useStudentAssignments";
import StructuredTAAssignmentWorkspace from "./StructuredTAAssignmentWorkspace";
import { hasStructuredWorkspace } from "./structured-assignment-model";

const saveMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/hooks/useStudentAssignments", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useStudentAssignments")>(
    "@/hooks/useStudentAssignments",
  );
  return {
    ...actual,
    saveTAAssignmentResponses: (...args: unknown[]) => saveMock(...args),
    submitTAAssignmentResponses: (...args: unknown[]) => submitMock(...args),
  };
});

function assignment(overrides: Partial<StudentTAAssignment> = {}): StudentTAAssignment {
  return {
    id: "assignment-1",
    student_id: "student-1",
    interaction_id: null,
    title: "RC Hero Session 3 Homework",
    content_html: "<p>Map each passage before answering the questions.</p>",
    asset_ids: [],
    pdf_url: null,
    status: "assigned",
    assigned_by: "admin-1",
    assigned_at: "2026-07-28T12:00:00.000Z",
    viewed_at: null,
    completed_at: null,
    created_at: "2026-07-28T12:00:00.000Z",
    response_schema: {
      version: 1,
      sections: [
        {
          id: "passage-1",
          title: "Passage 1",
          fields: [
            { id: "p1", label: "P1", kind: "long", required: true },
            { id: "questions", label: "Questions and answers", kind: "long" },
          ],
        },
      ],
    },
    response_data: {},
    response_saved_at: null,
    answer_key_html: "<h3>Answer key</h3><p>P1: V</p>",
    ...overrides,
  };
}

describe("StructuredTAAssignmentWorkspace", () => {
  beforeEach(() => {
    saveMock.mockReset();
    submitMock.mockReset();
  });

  it("recognizes only assignments with a populated structured schema", () => {
    expect(hasStructuredWorkspace(assignment())).toBe(true);
    expect(hasStructuredWorkspace(assignment({ response_schema: undefined }))).toBe(false);
  });

  it("provides passage-map and question space while keeping the key locked", () => {
    render(<StructuredTAAssignmentWorkspace assignment={assignment()} refresh={vi.fn()} />);

    expect(screen.getByLabelText(/P1/)).toBeEnabled();
    expect(screen.getByLabelText("Questions and answers")).toBeEnabled();
    expect(screen.getByText("The answer key is attached. It opens after you submit your homework."))
      .toBeInTheDocument();
    expect(screen.queryByText("P1: V")).not.toBeInTheDocument();
  });

  it("reveals the sanitized answer key and locks responses after submission", () => {
    render(
      <StructuredTAAssignmentWorkspace
        assignment={assignment({
          status: "completed",
          response_data: { p1: "V: introduces the first viewpoint" },
          answer_key_html: '<p>P1: V</p><script>alert("no")</script>',
        })}
        refresh={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/P1/)).toBeDisabled();
    expect(screen.getByText("P1: V")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("requires a second click before final submission", async () => {
    render(
      <StructuredTAAssignmentWorkspace
        assignment={assignment({ response_data: { p1: "V" } })}
        refresh={vi.fn()}
      />,
    );

    const submit = screen.getByRole("button", { name: "Submit and open answer key" });
    fireEvent.click(submit);
    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm submission" })).toBeInTheDocument();
  });
});
