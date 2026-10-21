import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityAssignment } from "@/features/activity-centre/api/types";
import ActivityReviewDetail from "./ActivityReviewDetail";

const fixture = vi.hoisted(() => ({ assignment: null as ActivityAssignment | null }));
const getStudentAssignment = vi.hoisted(() => vi.fn());
const listResponsesForAssignment = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }) }));
vi.mock("@/features/activity-centre/api/activitiesClient", () => ({ getStudentAssignment, listResponsesForAssignment }));

const assignment = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  student_id: "11111111-1111-4111-8111-111111111111",
  title: "Name the relationship",
  status: "completed",
  mode: "stimulus",
  item_format: "free-text",
  items: [{ order: 2, prompt: "What is the relationship?", credited_answers: ["The evidence supports the conclusion."], explanation: "The first sentence provides evidence for the second." }],
} as ActivityAssignment;

function Path() {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}{location.search}</span>;
}

function renderDetail() {
  render(<MemoryRouter initialEntries={["/review/activity/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/2?returnTo=%2Freview%2Fto-review%3Freason%3Dmissed%26q%3Drelationship"]}>
    <Routes>
      <Route path="/review/activity/:assignmentId/:itemOrder" element={<ActivityReviewDetail />} />
      <Route path="/review/to-review" element={<Path />} />
    </Routes>
  </MemoryRouter>);
}

beforeEach(() => {
  fixture.assignment = assignment;
  getStudentAssignment.mockReset().mockImplementation(async () => fixture.assignment);
  listResponsesForAssignment.mockReset().mockResolvedValue([
    { id: "one", assignment_id: assignment.id, student_id: assignment.student_id, item_order: 2, attempt_no: 1, verdict: "partial", response_text: "They are related.", created_at: "2026-09-28T10:00:00Z" },
    { id: "two", assignment_id: assignment.id, student_id: assignment.student_id, item_order: 2, attempt_no: 2, verdict: "correct", response_text: "The first supports the second.", created_at: "2026-09-28T10:05:00Z" },
  ]);
});

describe("Activity Review detail", () => {
  it("shows the owned completed item's exact prompt, attempts, and authored reasoning", async () => {
    renderDetail();
    expect(await screen.findByText("What is the relationship?")).toBeInTheDocument();
    expect(screen.getByText("They are related.")).toBeInTheDocument();
    expect(screen.getByText("The first supports the second.")).toBeInTheDocument();
    expect(screen.getByText("The evidence supports the conclusion.")).toBeInTheDocument();
    expect(getStudentAssignment).toHaveBeenCalledWith(assignment.id, assignment.student_id);
    fireEvent.click(screen.getByRole("button", { name: "Back to Review" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/review/to-review?reason=missed&q=relationship");
  });

  it("does not reveal the credited answer for unfinished work", async () => {
    fixture.assignment = { ...assignment, status: "in_progress" };
    renderDetail();
    await waitFor(() => expect(screen.getByText(/not available for review/)).toBeInTheDocument());
    expect(screen.queryByText("The evidence supports the conclusion.")).not.toBeInTheDocument();
  });
});
