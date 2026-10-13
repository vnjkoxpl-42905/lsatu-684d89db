import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AnswerChoiceDrill from "./AnswerChoiceDrill";
import { ANSWER_CHOICE_ITEMS } from "../../data/answerChoiceDrill";
import { isUngradedAttempt, sourceExerciseIds } from "../../lib/grading-status";
import { loadSourceSession, sourceSessionKey } from "../../lib/source-exercise-session";

const actions = vi.hoisted(() => ({ markTranslatorComplete: vi.fn(), markDrillComplete: vi.fn(), markModuleDrillComplete: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as { id: string } | null, owner: null as string | null }));
const savedWork = vi.hoisted(() => ({ drillAttempts: [] as { drillId: string; trapTag?: string }[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/cloudMirror", () => ({ mirroredSetItem: vi.fn() }));
vi.mock("../../store/AppContext", () => ({ useApp: () => ({ loading: false, progressOwnerId: auth.owner, bootcampState: savedWork, setCurrentView: vi.fn(), ...actions }) }));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); auth.user = null; auth.owner = null; savedWork.drillAttempts = [];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  for (const action of Object.values(actions)) action.mockResolvedValue({ ok: true });
});
async function revealAndNext(last = false) {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Show breakdown" })); });
  if (last) expect(screen.getByRole("heading", { name: "Check the whole description" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: last ? "Finish the exercise" : "Next answer choice" })).toBeEnabled());
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: last ? "Finish the exercise" : "Next answer choice" })); });
}
function writeBoth() {
  fireEvent.change(screen.getByLabelText("What must be present for this answer choice to be correct?"), { target: { value: "My requirements" } });
  fireEvent.change(screen.getByLabelText("Write your own example argument. Identify the statement this answer choice describes."), { target: { value: "My example and described statement" } });
}
it("reveals exact original HTML without requiring typing", async () => {
  render(<AnswerChoiceDrill onDone={vi.fn()} />);
  expect(screen.getByLabelText("Answer choice").textContent).toBe(ANSWER_CHOICE_ITEMS[0].stemText);
  expect(screen.getByLabelText("Answer choice").querySelectorAll("button")).toHaveLength(0);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Show breakdown" })); });
  const expected = document.createElement("div"); expected.innerHTML = ANSWER_CHOICE_ITEMS[0].breakdownHtml;
  expect(screen.getByTestId("source-breakdown").innerHTML).toBe(expected.innerHTML);
  await waitFor(() => expect(actions.markDrillComplete).toHaveBeenCalledWith("choice_1", "translation", false, undefined, undefined, "source_breakdown_reviewed"));
});
it("reviews all 15, retains review-only completion after remount, and never saves empty practice", async () => {
  const onDone = vi.fn(); const view = render(<AnswerChoiceDrill onDone={onDone} />);
  for (let index = 0; index < 15; index++) {
    await waitFor(() => expect(screen.getByText(`Answer choice ${index + 1} of 15`)).toBeInTheDocument());
    await revealAndNext(index === 14);
  }
  await waitFor(() => expect(screen.getByText("15 of 15 breakdowns reviewed.")).toBeInTheDocument());
  expect(screen.getByText("Answer-choice recap")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Continue to the next module" })).not.toBeInTheDocument();
  expect(screen.getByText("0 of 15 written exercises saved.")).toBeInTheDocument();
  expect(onDone).not.toHaveBeenCalled(); expect(actions.markTranslatorComplete).not.toHaveBeenCalled(); expect(actions.markModuleDrillComplete).not.toHaveBeenCalled();
  expect(actions.markDrillComplete).toHaveBeenCalledTimes(15);
  view.unmount(); render(<AnswerChoiceDrill onDone={onDone} />);
  expect(screen.getByText("15 of 15 breakdowns reviewed.")).toBeInTheDocument();
  expect(screen.getByText("0 of 15 written exercises saved.")).toBeInTheDocument();
});
it("saves written work separately from review", async () => {
  render(<AnswerChoiceDrill onDone={vi.fn()} />); writeBoth(); await revealAndNext();
  await waitFor(() => expect(screen.getByText("Answer choice 2 of 15")).toBeInTheDocument());
  expect(actions.markTranslatorComplete).toHaveBeenCalledWith(1, [], "What must be present:\nMy requirements\n\nMy example argument and described statement:\nMy example and described statement");
  expect(actions.markDrillComplete).toHaveBeenCalledWith("choice_1", "translation", false, undefined, undefined, "source_exercise_ungraded");
  expect(loadSourceSession(sourceSessionKey())?.practicedIds).toEqual(["choice_1"]);
});
it("retains unfinished typing and last revealed page after remount", async () => {
  const view = render(<AnswerChoiceDrill onDone={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("What must be present for this answer choice to be correct?"), { target: { value: "My unfinished thought" } });
  fireEvent.click(screen.getByRole("button", { name: "Show breakdown" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Next answer choice" })).toBeEnabled());
  view.unmount(); render(<AnswerChoiceDrill onDone={vi.fn()} />);
  expect(screen.getByLabelText("What must be present for this answer choice to be correct?")).toHaveValue("My unfinished thought");
  expect(screen.getByTestId("source-breakdown")).toBeInTheDocument();
  expect(screen.getByText("1 reviewed / 0 written")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("Write your own example argument. Identify the statement this answer choice describes.")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Write your own example argument. Identify the statement this answer choice describes."), { target: { value: "I can finish my draft after review" } });
  expect(loadSourceSession(sourceSessionKey())?.drafts.choice_1.example).toBe("I can finish my draft after review");
});
it("does not advance or add written completion when saving fails", async () => {
  actions.markTranslatorComplete.mockResolvedValue({ ok: false });
  render(<AnswerChoiceDrill onDone={vi.fn()} />); writeBoth(); await revealAndNext();
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your written work could not be saved"));
  expect(screen.getByText("Answer choice 1 of 15")).toBeInTheDocument();
  expect(loadSourceSession(sourceSessionKey())?.practicedIds).toHaveLength(0);
});
it("keeps failed account reviews retryable after remount", async () => {
  auth.user = { id: "a" }; auth.owner = "a"; actions.markDrillComplete.mockResolvedValue({ ok: false });
  const view = render(<AnswerChoiceDrill onDone={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Show breakdown" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be saved to your account"));
  view.unmount(); actions.markDrillComplete.mockResolvedValue({ ok: true }); render(<AnswerChoiceDrill onDone={vi.fn()} />);
  await waitFor(() => expect(actions.markDrillComplete).toHaveBeenCalledTimes(2));
});
it("waits for the new account's hydration and never inherits the old account's attempts", () => {
  auth.user = { id: "a" }; auth.owner = "a"; savedWork.drillAttempts = [{ drillId: "choice_1", trapTag: "source_breakdown_reviewed" }];
  const view = render(<AnswerChoiceDrill onDone={vi.fn()} />); expect(screen.getByText("Answer choice 2 of 15")).toBeInTheDocument();
  auth.user = { id: "b" }; view.rerender(<AnswerChoiceDrill onDone={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  auth.owner = "b"; savedWork.drillAttempts = []; view.rerender(<AnswerChoiceDrill onDone={vi.fn()} />);
  expect(screen.getByText("Answer choice 1 of 15")).toBeInTheDocument();
  expect(screen.getByText("0 reviewed / 0 written")).toBeInTheDocument();
});
it("does not finish an old account's pending write in the new account's view", async () => {
  auth.user = { id: "a" }; auth.owner = "a";
  let resolve: (value: { ok: boolean }) => void;
  actions.markTranslatorComplete.mockReturnValue(new Promise((done) => { resolve = done; }));
  const view = render(<AnswerChoiceDrill onDone={vi.fn()} />); writeBoth(); await revealAndNext();
  await waitFor(() => expect(actions.markTranslatorComplete).toHaveBeenCalledOnce());
  auth.user = { id: "b" }; auth.owner = "b"; view.rerender(<AnswerChoiceDrill onDone={vi.fn()} />);
  await act(async () => { resolve!({ ok: true }); });
  expect(screen.getByText("Answer choice 1 of 15")).toBeInTheDocument();
  expect(actions.markDrillComplete.mock.calls.filter((call) => call[5] === "source_exercise_ungraded")).toHaveLength(0);
});
it("review attempts cannot erase or substitute for written evidence", () => {
  expect(isUngradedAttempt("source_breakdown_reviewed")).toBe(true);
  expect(sourceExerciseIds([{ drillId: "choice_1", trapTag: "source_exercise_ungraded" }, { drillId: "choice_1", trapTag: "source_breakdown_reviewed" }, { drillId: "choice_2", trapTag: "source_breakdown_reviewed" }])).toEqual(new Set(["choice_1"]));
});
it("ignores legacy coach work when resuming the source exercise", () => {
  savedWork.drillAttempts = [{ drillId: "choice_1", trapTag: "coach_got_it" }];
  render(<AnswerChoiceDrill onDone={vi.fn()} />); expect(screen.getByText("Answer choice 1 of 15")).toBeInTheDocument();
});
