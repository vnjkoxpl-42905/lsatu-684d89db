import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCheckpoints } from "./lib/checkpoint";
import { segmentPassage } from "./lib/segment";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import type { AttemptRow } from "./lib/attempts";
import { ReadingExerciseLayout } from "../components/ReadingExerciseLayout";
const api = vi.hoisted(() => ({ prepare: vi.fn(), start: vi.fn(), stop: vi.fn(), createCapture: vi.fn(), saveCaptureWindow: vi.fn(), uploadCapture: vi.fn(), insertRecap: vi.fn(), finalizeAttempt: vi.fn(), readAttemptProgress: vi.fn(), discard: vi.fn(), offset: 0, count: 0, interruption: null as string | null }));
vi.mock("./lib/captures", () => ({ createCapture: api.createCapture, saveCaptureWindow: api.saveCaptureWindow, uploadCapture: api.uploadCapture }));
vi.mock("./lib/attempts", () => ({ newId: () => `id-${++api.count}`, insertRecap: api.insertRecap, finalizeAttempt: api.finalizeAttempt, readAttemptProgress: api.readAttemptProgress }));
vi.mock("./lib/backup", () => ({ discard: api.discard }));
vi.mock("./useRecapRecorder", () => ({ useRecapRecorder: () => ({ prepare: api.prepare, start: api.start, stop: api.stop, getOffset: () => api.offset, interruption: api.interruption }) }));
vi.mock("./LegacyRcRecallRunner", () => ({ default: () => <div>Legacy exercise</div>, formatClock: (n: number) => String(n) }));
vi.mock("./RcTrainingFeedback", () => ({ default: ({ enabled }: { enabled: boolean }) => <div data-testid="feedback" data-enabled={String(enabled)} /> }));
import Runner from "./RcRecallRunner";
const bodies = ["First paragraph.\n\nSecond paragraph."];
const attempt = { id: "a1", student_id: "s1", preptest: 140, section: 4, passage_ids: [1] } as AttemptRow;
const props = { mode: "rc_recall" as const, scope: "all_read" as const, passages: bodies.map((text) => ({ text }) as RcPassage), segmented: bodies.map(segmentPassage), attempt, studentId: "s1", onExit: vi.fn() };
const click = async (name: RegExp) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };
const space = async (repeat = false) => { await act(async () => { fireEvent.keyDown(document, { code: "Space", repeat }); }); };
beforeEach(() => {
  Object.values(api).forEach((value) => { if (typeof value === "function" && "mockReset" in value) value.mockReset(); });
  localStorage.clear(); api.interruption = null; api.offset = 0; api.count = 0;
  api.prepare.mockResolvedValue({ ok: true, stream: { getTracks: () => [] }, mimeType: "audio/webm" });
  api.start.mockResolvedValue({ ok: true, backup: { ok: true } });
  api.stop.mockResolvedValue({ blob: new Blob(["full session"]), mimeType: "audio/webm", durationMs: 10000, path: "s1/a1/capture-id-1-unique.webm" });
  api.createCapture.mockResolvedValue({ id: "id-1" });
  api.saveCaptureWindow.mockImplementation(async (input) => ({ id: input.id, recording_state: "pending" }));
  api.uploadCapture.mockResolvedValue(undefined); api.discard.mockResolvedValue(undefined);
  api.readAttemptProgress.mockResolvedValue({ attempt, recaps: [] });
  api.finalizeAttempt.mockResolvedValue({ completed: true, elapsed_seconds: 10 });
});
describe("continuous RC recording", () => {
  it("starts once before reading, stores only hidden-text windows and uploads once on leaving", async () => {
    const layout = vi.fn(); render(<ReadingExerciseLayout.Provider value={layout}><Runner {...props} /></ReadingExerciseLayout.Provider>);
    expect(layout).toHaveBeenCalledWith(true);
    expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
    await click(/Start exercise/);
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    api.offset = 1400; await space();
    expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
    api.offset = 3600; await space();
    expect(api.saveCaptureWindow).toHaveBeenCalledWith(expect.objectContaining({ startMs: 1400, endMs: 3600, captureId: "id-1", kind: "recall" }));
    expect(api.stop).not.toHaveBeenCalled();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    await click(/Next paragraph/);
    expect(screen.queryByLabelText("Exercise instructions")).not.toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
    await click(/Save my place and leave/);
    expect(api.prepare).toHaveBeenCalledOnce(); expect(api.start).toHaveBeenCalledOnce(); expect(api.stop).toHaveBeenCalledOnce();
    expect(api.uploadCapture).toHaveBeenCalledWith(expect.objectContaining({ captureId: "id-1", durationMs: 10000 }));
    expect(api.discard).toHaveBeenCalledWith("id-1");
  });
  it("keeps the first recall end marker when a save response fails and is retried", async () => {
    api.saveCaptureWindow.mockRejectedValueOnce(new Error("Connection lost"));
    render(<Runner {...props} />); await click(/Start exercise/);
    api.offset = 1000; await space(); api.offset = 2200; await space();
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    api.offset = 9000; await space();
    expect(api.saveCaptureWindow.mock.calls[0][0]).toEqual(api.saveCaptureWindow.mock.calls[1][0]);
    expect(api.saveCaptureWindow.mock.calls[1][0].endMs).toBe(2200);
  });
  it("retains backup and asks the server for eligible feedback after confirmed completion even when upload fails", async () => {
    api.uploadCapture.mockRejectedValueOnce(new Error("Upload offline"));
    render(<Runner {...props} />); await click(/Start exercise/);
    for (let i = 0; i < 2; i++) { api.offset += 1000; await space(); api.offset += 1000; await space(); await click(/Next paragraph|Finish passage/); }
    await click(/Skip optional recall/);
    expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
    expect(api.discard).not.toHaveBeenCalled();
    await click(/Try saving again/);
    expect(api.stop).toHaveBeenCalledOnce(); expect(api.uploadCapture).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
  });
  it("cancels pending permission, allows silent reading and stops late permission streams", async () => {
    let resolve!: (value: unknown) => void; const stop = vi.fn();
    api.prepare.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<Runner {...props} />); fireEvent.click(screen.getByRole("button", { name: /Start exercise/ }));
    expect(screen.getByText(/Waiting for microphone permission/)).toBeInTheDocument();
    await click(/Continue without recording/);
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getAllByText("No recording is being made. Silent recalls cannot receive automatic feedback.")).toHaveLength(1);
    expect(screen.getByLabelText("Exercise instructions")).not.toHaveTextContent("microphone records throughout");
    await act(async () => { resolve({ ok: true, stream: { getTracks: () => [{ stop }] }, mimeType: "audio/webm" }); });
    expect(stop).toHaveBeenCalledOnce(); expect(api.start).not.toHaveBeenCalled();
  });
  it("restores the app layout on unmount and stops permission streams that resolve late", async () => {
    let resolve!: (value: unknown) => void; const stop = vi.fn(); const layout = vi.fn();
    api.prepare.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const view = render(<ReadingExerciseLayout.Provider value={layout}><Runner {...props} /></ReadingExerciseLayout.Provider>);
    fireEvent.click(screen.getByRole("button", { name: /Start exercise/ })); view.unmount();
    await act(async () => { resolve({ ok: true, stream: { getTracks: () => [{ stop }] }, mimeType: "audio/webm" }); });
    expect(layout).toHaveBeenLastCalledWith(false); expect(stop).toHaveBeenCalledOnce(); expect(api.start).not.toHaveBeenCalled();
  });
  it("does not consume repeated Space or Space focused on interactive controls", async () => {
    render(<Runner {...props} />); await click(/Start exercise/); await space(true);
    fireEvent.keyDown(screen.getByRole("button", { name: /Hide paragraph/ }), { code: "Space" });
    expect(screen.getByText("First paragraph.")).toBeInTheDocument(); expect(api.saveCaptureWindow).not.toHaveBeenCalled();
  });
});

it("refreshes a prior capture's pending status from the server before allowing feedback", async () => {
  const resume = { version: 1, captureWorkflow: true, studentId: "s1", attemptId: "a1", attempt, contentKey: "test", scope: "all_read", stepIndex: 2, stepId: "p1:confirm:0", recaps: [{ key: "p1:recall:0", voice: "spoken", state: "pending", rowId: "old", label: "Paragraph" }], sectionMs: 0, passageMs: 0, savedAt: 0, pending: null } as import("./lib/checkpoint").Checkpoint;
  api.readAttemptProgress.mockResolvedValue({ attempt, recaps: [{ id: "old", recap_key: "p1:recall:0", recording_state: "saved" }] });
  render(<Runner {...props} resume={resume} />); await click(/Start exercise/); await click(/Next paragraph/);
  api.offset = 1000; await space(); api.offset = 2000; await space(); await click(/Finish passage/); await click(/Skip optional recall/);
  expect(api.readAttemptProgress).toHaveBeenCalledWith("a1", "s1");
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
});
it("does not count microphone setup or permission waiting as practice time", async () => {
  let now = 10000; vi.spyOn(Date, "now").mockImplementation(() => now);
  let permit!: (value: unknown) => void;
  api.prepare.mockReturnValueOnce(new Promise((resolve) => { permit = resolve; }));
  render(<Runner {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Start exercise/ })); now += 600000;
  await act(async () => { permit({ ok: true, stream: { getTracks: () => [] }, mimeType: "audio/webm" }); });
  now += 3000; await click(/Save my place and leave/);
  const checkpoint = listCheckpoints("s1")[0];
  expect(checkpoint.sectionMs).toBe(3000);
  vi.restoreAllMocks();
});

it("keeps older checkpoints on the legacy runner without changing their recap identities", () => {
  const resume = { version: 1, studentId: "s1", attemptId: "a1", attempt, contentKey: "legacy", scope: "all_read", stepIndex: 2, stepId: "p1:confirm:0", recaps: [{ key: "legacy-spoken", voice: "spoken", state: "saved", rowId: "legacy-row", label: "Paragraph" }], sectionMs: 0, passageMs: 0, savedAt: 0, pending: null } as import("./lib/checkpoint").Checkpoint;
  render(<Runner {...props} resume={resume} />);
  expect(screen.getByText("Legacy exercise")).toBeInTheDocument();
  expect(api.start).not.toHaveBeenCalled(); expect(api.saveCaptureWindow).not.toHaveBeenCalled();
  expect(resume.recaps[0].rowId).toBe("legacy-row");
});

const finishParagraphs = async () => {
  for (let i = 0; i < 2; i++) { api.offset += 1000; await space(); api.offset += 1000; await space(); await click(/Next paragraph|Finish passage/); }
};
it("retries only recording-status reconciliation after a confirmed finish", async () => {
  api.readAttemptProgress.mockRejectedValueOnce(new Error("offline"));
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(/Skip optional recall/);
  expect(screen.getByText(/Your result is saved, but recording status/)).toBeInTheDocument();
  await click(/Refresh recording status/);
  expect(api.finalizeAttempt).toHaveBeenCalledOnce(); expect(api.stop).toHaveBeenCalledOnce(); expect(api.uploadCapture).toHaveBeenCalledOnce();
  expect(api.readAttemptProgress).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
});
it("offers the list rather than a dead-end retry when there is no complete audio", async () => {
  api.stop.mockResolvedValueOnce(null);
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(/Skip optional recall/);
  expect(screen.getByText(/No complete recording is available to upload/)).toHaveTextContent(/any partial audio this device may have kept/);
  expect(screen.queryByRole("button", { name: /Try saving again|Refresh recording status/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to RC Training" })).toBeInTheDocument();
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
  expect(api.finalizeAttempt).toHaveBeenCalledOnce(); expect(api.uploadCapture).not.toHaveBeenCalled();
});
it.each(["Finish practice", "Skip optional recall"])("gives an unchecked optional %s the same skip history", async (label) => {
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(new RegExp(label));
  expect(api.insertRecap).not.toHaveBeenCalled();
  expect(api.saveCaptureWindow).toHaveBeenCalledTimes(2);
  expect(api.saveCaptureWindow.mock.calls.every(([input]) => input.kind === "recall")).toBe(true);
  expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
});
it("puts a working save-and-leave action beside a recording interruption", async () => {
  const view = render(<Runner {...props} />); await click(/Start exercise/);
  api.interruption = "The microphone stopped unexpectedly."; api.stop.mockResolvedValueOnce(null);
  view.rerender(<Runner {...props} />);
  const notice = screen.getByRole("region", { name: "Recording interrupted" });
  expect(notice).toContainElement(screen.getByRole("button", { name: "Save recording and leave" }));
  await click(/Save recording and leave/);
  expect(api.stop).toHaveBeenCalledOnce(); expect(props.onExit).toHaveBeenCalledOnce();
});

it("returns focus from the instructions button to the step so Space still advances", async () => {
  render(<Runner {...props} />); await click(/Start exercise/);
  const button = screen.getByRole("button", { name: "Hide instructions" }); button.focus();
  await click(/Hide instructions/);
  expect(screen.getByRole("heading", { name: "Read paragraph" })).toHaveFocus();
  api.offset = 1000; await space();
  expect(screen.getByLabelText("Passage text hidden")).toBeInTheDocument();
  const show = screen.getByRole("button", { name: "Show instructions" }); show.focus(); await click(/Show instructions/);
  expect(screen.getByRole("heading", { name: "Recall paragraph" })).toHaveFocus();
  api.offset = 2000; await space();
  expect(screen.getByRole("heading", { name: "Check your recall" })).toBeInTheDocument();
});
it("focuses the completion heading and announces a warning while retaining server feedback eligibility", async () => {
  api.readAttemptProgress.mockRejectedValueOnce(new Error("offline"));
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(/Skip optional recall/);
  expect(screen.getByRole("heading", { name: "Practice complete" })).toHaveFocus();
  expect(screen.getByRole("alert")).toHaveTextContent(/recording status could not be checked/);
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
});
it("does not request feedback before finalization is confirmed", async () => {
  api.finalizeAttempt.mockRejectedValueOnce(new Error("offline"));
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(/Skip optional recall/);
  expect(screen.getByRole("alert")).toHaveTextContent(/result could not be confirmed/);
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "false");
});
