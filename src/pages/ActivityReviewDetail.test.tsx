import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityAssignment } from "@/features/activity-centre/api/types";
import ActivityReviewDetail from "./ActivityReviewDetail";

const fixture = vi.hoisted(() => ({ assignment: null as ActivityAssignment | null, actor: "11111111-1111-4111-8111-111111111111" }));
const getStudentAssignment = vi.hoisted(() => vi.fn());
const listResponsesForAssignment = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: fixture.actor } }) }));
vi.mock("@/features/activity-centre/api/activitiesClient", () => ({ getStudentAssignment, listResponsesForAssignment }));

const assignment = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  student_id: "11111111-1111-4111-8111-111111111111",
  title: "Name the relationship",
  status: "completed",
  completed_at: "2026-09-28T11:00:00Z",
  mode: "stimulus",
  item_format: "free-text",
  items: [{ order: 2, prompt: "What is the relationship?", credited_answers: ["The evidence supports the conclusion."], explanation: "The first sentence provides evidence for the second." }],
} as ActivityAssignment;

function Path() {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}{location.search}</span>;
}

function detailTree() {
  return <MemoryRouter initialEntries={["/review/activity/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/2?returnTo=%2Freview%2Fto-review%3Freason%3Dmissed%26q%3Drelationship"]}>
    <Routes>
      <Route path="/review/activity/:assignmentId/:itemOrder" element={<ActivityReviewDetail />} />
      <Route path="/review/to-review" element={<Path />} />
    </Routes>
  </MemoryRouter>;
}

function renderDetail() { return render(detailTree()); }

beforeEach(() => {
  fixture.actor = assignment.student_id;
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

it.each([null, "", "not-a-date"])("hides credited answers without a valid completion timestamp (%s)", async (completed_at) => {
  fixture.assignment = { ...assignment, completed_at };
  renderDetail();
  expect(await screen.findByText(/not available for review/)).toBeInTheDocument();
  expect(screen.queryByText("The evidence supports the conclusion.")).not.toBeInTheDocument();
});

it("rejects a returned assignment owned by another student", async () => {
  fixture.assignment = { ...assignment, student_id: "someone-else" };
  renderDetail();
  expect(await screen.findByText(/not available for review/)).toBeInTheDocument();
  expect(screen.queryByText("What is the relationship?")).not.toBeInTheDocument();
});

it("excludes foreign assignment and malformed response attempts", async () => {
  const valid = { id: "one", assignment_id: assignment.id, student_id: assignment.student_id, item_order: 2, attempt_no: 1, verdict: "partial", response_text: "Owned response", created_at: "2026-09-28T10:00:00Z" };
  listResponsesForAssignment.mockResolvedValue([valid,
    { ...valid, id: "foreign", assignment_id: "other", response_text: "Foreign response" },
    { ...valid, id: "student", student_id: "other", response_text: "Other student" },
    { ...valid, id: "malformed", attempt_no: NaN, response_text: "Malformed response" },
  ]);
  renderDetail();
  expect(await screen.findByText("Owned response")).toBeInTheDocument();
  expect(screen.queryByText("Foreign response")).not.toBeInTheDocument();
  expect(screen.queryByText("Other student")).not.toBeInTheDocument();
  expect(screen.queryByText("Malformed response")).not.toBeInTheDocument();
});

it("retries a failed load without exposing previous data", async () => {
  getStudentAssignment.mockRejectedValueOnce(new Error("Account load failed"));
  renderDetail();
  expect(await screen.findByRole("alert")).toHaveTextContent("Account load failed");
  fireEvent.click(screen.getByRole("button", { name: "Retry Activity review" }));
  expect(await screen.findByText("What is the relationship?")).toBeInTheDocument();
  expect(getStudentAssignment).toHaveBeenCalledTimes(2);
});

it("ignores an obsolete pending request after unmount", async () => {
  let finish!: (value: ActivityAssignment) => void;
  getStudentAssignment.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = renderDetail();
  view.unmount();
  fixture.actor = "new-student";
  getStudentAssignment.mockResolvedValue(null);
  renderDetail();
  finish(assignment);
  expect(await screen.findByText(/not available for review/)).toBeInTheDocument();
  expect(screen.queryByText("The evidence supports the conclusion.")).not.toBeInTheDocument();
});

it("clears visible credited answers on an actor change before the new request resolves", async () => {
  const view = renderDetail();
  expect(await screen.findByText("The evidence supports the conclusion.")).toBeInTheDocument();
  let finish!: (value: ActivityAssignment | null) => void;
  getStudentAssignment.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fixture.actor = "new-student";
  view.rerender(detailTree());
  expect(screen.queryByText("The evidence supports the conclusion.")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading Activity review");
  finish(null);
  expect(await screen.findByText(/not available for review/)).toBeInTheDocument();
});
