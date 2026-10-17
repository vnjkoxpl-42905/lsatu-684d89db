import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";

const api = vi.hoisted(() => ({ complete: vi.fn(), list: vi.fn(), record: vi.fn(), sync: vi.fn() }));
const assignment = { id: "assign-1", student_id: "user-1", title: "No World", item_format: "free-text", status: "in_progress", completed_at: null, instructions: {}, items: [{ order: 1, prompt: "First", credited_answers: ["Answer"], explanation: "" }] };
vi.mock("../hooks/useStudentActivities", () => ({ useStudentActivity: () => ({ assignment, loading: false, error: null }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../api/activitiesClient", () => ({ listItemResponses: api.list, recordItemResponse: api.record, completeAssignment: api.complete, markAssignmentStarted: vi.fn(), assignmentBelongsToAnotherAccount: vi.fn() }));
vi.mock("@/lib/classroomItems", () => ({ syncClassroomItemStatusBySource: api.sync }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("./ActivityQuestionStack", () => ({ ActivityQuestionStack: ({ onRecord, onResolved, onNext }: { onRecord: (args: unknown) => Promise<void>; onResolved: (order: number, verdict: string) => void; onNext: () => Promise<void> }) => <>
  <button onClick={() => { void onRecord({ itemOrder: 1, responseText: "Saved answer", verdict: "correct", attemptNo: 1 }); onResolved(1, "correct"); }}>Answer</button>
  <button onClick={() => { void onNext(); }}>Finish</button>
</> }));
vi.mock("./CompletionSummary", () => ({ CompletionSummary: ({ responses }: { responses: Record<number, string> }) => <p>Complete: {responses[1]}</p> }));

const saved = [{ id: "response-1", assignment_id: "assign-1", student_id: "user-1", item_order: 1, attempt_no: 1, verdict: "correct", response_text: "Saved answer", created_at: "2026-09-30T10:00:00Z" }];
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.list.mockReset().mockResolvedValue([]);
  api.complete.mockReset().mockResolvedValue(undefined);
  api.record.mockReset().mockResolvedValue(undefined);
  api.sync.mockResolvedValue(undefined);
});

async function answerAndFinish() {
  render(<MemoryRouter><ActivityRunner assignmentId="assign-1" /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
}

it("does not complete while a local answer has not reached the account, then retries without reanswering", async () => {
  let resolveRecord: () => void;
  api.record.mockImplementationOnce(() => new Promise<void>(resolve => { resolveRecord = resolve; }));
  await answerAndFinish();
  expect(await screen.findByRole("button", { name: "Retry completion" })).toBeInTheDocument();
  expect(api.complete).not.toHaveBeenCalled();
  expect(api.sync).not.toHaveBeenCalled();
  resolveRecord!();
  api.list.mockResolvedValue(saved);
  fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));
  expect(await screen.findByText("Complete: Saved answer")).toBeInTheDocument();
  expect(api.complete).toHaveBeenCalledWith("assign-1", { numerator: 1, judged: 1, total: 1, percent: 100 });
});

it("normal Finish waits for acknowledgment and retries a failed completion without publishing classroom status", async () => {
  api.list.mockResolvedValueOnce([]).mockResolvedValue(saved);
  let rejectCompletion: (reason: Error) => void;
  api.complete.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectCompletion = reject; }));
  await answerAndFinish();
  await waitFor(() => expect(api.complete).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Complete: Saved answer")).not.toBeInTheDocument();
  expect(api.sync).not.toHaveBeenCalled();
  rejectCompletion!(new Error("offline"));
  fireEvent.click(await screen.findByRole("button", { name: "Retry completion" }));
  expect(await screen.findByText("Complete: Saved answer")).toBeInTheDocument();
  expect(api.record).toHaveBeenCalledTimes(1);
  expect(api.complete).toHaveBeenCalledTimes(2);
  expect(api.sync).toHaveBeenCalledTimes(1);
});
