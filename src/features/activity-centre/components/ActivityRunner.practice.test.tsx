import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRunner } from "./ActivityRunner";
import { readCachedRuns, createPracticeRun, cachePracticeRun } from "../conditionals/practiceStore";
import { getGeneralPhase } from "../conditionals/generalPhases";
import { buildPaperDiagramChoices, buildLegacyPaperDiagramChoices } from "../worlds/switchyard/diagramChoices";

// The re-drill. The practice path has existed since the beginning and has always
// written nothing, but it could only ever re-run the WHOLE activity, because
// `items` came straight off the assignment snapshot with nowhere to say
// "these ones". These pin the narrowing, and pin that narrowing a run never
// reaches the database.

vi.mock("../worlds/registry", () => ({ worldForTitle: () => null }));
let cacheFails = false;
const sync = vi.fn().mockResolvedValue(undefined);
vi.mock("../conditionals/practiceStore", async () => {
  const actual = await vi.importActual<typeof import("../conditionals/practiceStore")>("../conditionals/practiceStore");
  return { ...actual, cachePracticeRun: (run: Parameters<typeof actual.cachePracticeRun>[0]) => { if (cacheFails) throw new Error("Device storage could not save this change."); actual.cachePracticeRun(run); }, syncPracticeRun: (...args: unknown[]) => sync(...args), loadPracticeRuns: vi.fn().mockResolvedValue([]) };
});
const activityState = { assignment: null as unknown, loading: false, error: null as string | null };

vi.mock("../hooks/useStudentActivities", () => ({
  useStudentActivity: () => activityState,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "s@example.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const completeAssignment = vi.fn().mockResolvedValue(undefined);
const listItemResponses = vi.fn().mockResolvedValue([]);
const markAssignmentStarted = vi.fn().mockResolvedValue(undefined);
const recordItemResponse = vi.fn().mockResolvedValue(undefined);

vi.mock("../api/activitiesClient", () => ({
  assignmentBelongsToAnotherAccount: vi.fn().mockResolvedValue(false),
  completeAssignment: (...a: unknown[]) => completeAssignment(...a),
  listItemResponses: (...a: unknown[]) => listItemResponses(...a),
  markAssignmentStarted: (...a: unknown[]) => markAssignmentStarted(...a),
  recordItemResponse: (...a: unknown[]) => recordItemResponse(...a),
}));

vi.mock("@/lib/classroomItems", () => ({
  syncClassroomItemStatusBySource: vi.fn().mockResolvedValue(undefined),
}));


const item = { order: 1, prompt: "When it rains, the garden is wet.", credited_answers: ["If it rains, then the garden is wet."], explanation: "Rain is sufficient.", category: "Trigger word: if" };
const assignment = { id: "assign-1", student_id: "user-1", title: "Conditional Rephrase", items: [item], instructions: { task: "Diagram.", rules: [] }, status: "completed", item_format: "free-text", score: 100 };
function mount(id: string) {
  return render(<MemoryRouter initialEntries={[`/activities/assign-1?practiceRun=${id}`]}><Routes><Route path="/activities/:assignmentId" element={<ActivityRunner />} /></Routes></MemoryRouter>);
}
function run() { return createPracticeRun("user-1", "general", [], { sourceUrl: "/activities/assign-1", items: [item] }); }
describe("saved General sessions", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); cacheFails = false; listItemResponses.mockResolvedValue([]); activityState.assignment = assignment; sync.mockResolvedValue(undefined); });
  it("restores paper stage, selected choices, feedback and completed state without touching assignment scores", async () => {
    const saved = run();
    let page = mount(saved.id);
    fireEvent.click(await screen.findByRole("button", { name: /diagrammed it/ }));
    const choices = buildPaperDiagramChoices(item.credited_answers, item.order);
    const wrong = choices.findIndex(choice => choice.verdict !== "correct");
    fireEvent.click(screen.getAllByRole("radio")[wrong]);
    page.unmount(); page = mount(saved.id);
    expect((await screen.findAllByRole("radio"))[wrong]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));
    await screen.findByRole("button", { name: "Try again" });
    page.unmount(); page = mount(saved.id);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    const correct = choices.findIndex(choice => choice.verdict === "correct");
    fireEvent.click(screen.getAllByRole("radio")[correct]);
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finish" }));
    await waitFor(() => expect(readCachedRuns("user-1")[0].stage).toBe("done"));
    expect(readCachedRuns("user-1")[0].answers).toHaveLength(2);
    expect(readCachedRuns("user-1")[0].answers.every(answer => !answer.revealed)).toBe(true);
    expect(completeAssignment).not.toHaveBeenCalled();
    expect(recordItemResponse).not.toHaveBeenCalled();
  });
  it("replaces an obsolete unsubmitted selection with four unselected paired choices", async () => {
    const saved = run();
    cachePracticeRun({ ...saved, stage: "choices", selection: "both-directions" });
    mount(saved.id);
    const options = await screen.findAllByRole("radio");
    expect(options).toHaveLength(4);
    expect(options.every(option => option.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.getByRole("button", { name: "Check my diagram" })).toBeDisabled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.queryByText(/Question 1 of 1/)).not.toBeInTheDocument();
  });
  it("keeps a historical answer and its score unchanged while showing the new paired choices", async () => {
    const saved = run();
    const old = buildLegacyPaperDiagramChoices(item.credited_answers, item.order).find(choice => choice.id === "both-directions")!;
    const answer = { id: "old-answer", questionId: "1", choiceId: old.id, text: old.responseText, verdict: old.verdict, attempt: 2, revealed: false, at: saved.createdAt };
    cachePracticeRun({ ...saved, stage: "feedback", selection: old.id, answers: [answer] });
    mount(saved.id);
    expect(await screen.findByRole("region", { name: "Previously saved answer" })).toHaveTextContent(old.responseText);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(readCachedRuns("user-1")[0].answers).toEqual([answer]);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(recordItemResponse).not.toHaveBeenCalled();
  });
  it("keeps the local answer when account sync fails and says so", async () => {
    const saved = run(); sync.mockRejectedValue(new Error("offline"));
    mount(saved.id);
    fireEvent.click(await screen.findByRole("button", { name: /diagrammed it/ }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));
    await waitFor(() => expect(readCachedRuns("user-1")[0].answers).toHaveLength(1));
    expect(await screen.findByText(/device copies have been kept/i)).toBeInTheDocument();
  });
  it("does not advance when the device cannot save the paper stage", async () => {
    const saved = run(); mount(saved.id);
    const button = await screen.findByRole("button", { name: /diagrammed it/ });
    cacheFails = true;
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    cacheFails = false;
  });
  it("restores the first assigned run's deadline without creating a practice session", async () => {
    activityState.assignment = { ...assignment, status: "in_progress", items: Array.from({ length: 62 }, (_, i) => ({ ...item, order: i + 1 })) };
    listItemResponses.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, assignment_id: "assign-1", student_id: "user-1", item_order: i + 1, attempt_no: 1, response_text: "answer", verdict: "correct", created_at: new Date().toISOString() })));
    const open = () => render(<MemoryRouter initialEntries={["/activities/assign-1"]}><Routes><Route path="/activities/:assignmentId" element={<ActivityRunner />} /></Routes></MemoryRouter>);
    let page = open();
    await screen.findByText(item.prompt);
    const key = "lsatu:general-paper:v1:user-1:assign-1:12";
    await waitFor(() => expect(localStorage.getItem(key)).toBeTruthy());
    const deadline = JSON.parse(localStorage.getItem(key)!).deadline;
    page.unmount(); page = open();
    await screen.findByText(item.prompt);
    expect(JSON.parse(localStorage.getItem(key)!).deadline).toBe(deadline);
    expect(readCachedRuns("user-1")).toEqual([]);
    expect(completeAssignment).not.toHaveBeenCalled();
    page.unmount();
  });
  it("uses the session ordinal for the three phase boundaries", () => {
    expect([0, 11, 12, 36, 37, 61].map(position => getGeneralPhase(position).seconds)).toEqual([null, null, 45, 45, 30, 30]);
  });
  it("persists the timed question deadline and hides the statement when it expires", async () => {
    const saved = createPracticeRun("user-1", "general", [], { sourceUrl: "/activities/assign-1", items: Array.from({ length: 62 }, (_, i) => ({ ...item, order: i + 1 })) });
    cachePracticeRun({ ...saved, position: 12 });
    let page = mount(saved.id);
    await screen.findByText(item.prompt);
    await waitFor(() => expect(readCachedRuns("user-1")[0].paperDeadline).toBeTruthy());
    const deadline = readCachedRuns("user-1")[0].paperDeadline!;
    page.unmount(); page = mount(saved.id);
    await screen.findByText(item.prompt);
    expect(readCachedRuns("user-1")[0].paperDeadline).toBe(deadline);
    page.unmount();
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse(deadline) - 1000);
    await act(async () => { page = mount(saved.id); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse(deadline) + 2000);
    await screen.findByRole("radiogroup");
    expect(screen.queryByText(item.prompt)).not.toBeInTheDocument();
    expect(readCachedRuns("user-1")[0].stage).toBe("choices");
    page.unmount(); mount(saved.id);
    await screen.findByRole("radiogroup");
    expect(screen.queryByText(item.prompt)).not.toBeInTheDocument();
    const correct = buildPaperDiagramChoices(item.credited_answers, 13).findIndex(choice => choice.verdict === "correct");
    fireEvent.click(screen.getAllByRole("radio")[correct]);
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    await waitFor(() => expect(readCachedRuns("user-1")[0].position).toBe(13));
    await waitFor(() => expect(readCachedRuns("user-1")[0].paperDeadline).not.toBe(deadline));
    expect(readCachedRuns("user-1")[0].stage).toBe("paper");
    vi.useRealTimers();
  });
  it("does not replace a missing saved run", async () => {
    mount("missing");
    expect(await screen.findByRole("alert")).toHaveTextContent("Saved session not found");
    expect(readCachedRuns("user-1")).toEqual([]);
  });
  it("does not save while viewing another student's assignment", async () => {
    const saved = run(); activityState.assignment = { ...assignment, student_id: "someone-else" };
    mount(saved.id);
    expect(await screen.findByRole("alert")).toHaveTextContent("not available");
    expect(sync).not.toHaveBeenCalled();
  });
  it("keeps the snapshotted question when the activity changes", async () => {
    const saved = run(); activityState.assignment = { ...assignment, items: [{ ...item, prompt: "Changed later" }] };
    mount(saved.id);
    expect(await screen.findByText(item.prompt)).toBeInTheDocument();
    expect(screen.queryByText("Changed later")).not.toBeInTheDocument();
  });
});
