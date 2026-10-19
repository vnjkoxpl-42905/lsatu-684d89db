import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { segmentPassage } from "./lib/segment";
import type { AttemptRow } from "./lib/attempts";
import { listCheckpoints, type Checkpoint } from "./lib/checkpoint";

// Explicit mocks of the persistence and recorder boundaries. The checkpoint
// store is the real one, backed by jsdom's localStorage.
const api = vi.hoisted(() => ({
  insertRecap: vi.fn(), finalizeAttempt: vi.fn(), markRecapFailed: vi.fn(), uploadRecording: vi.fn(),
  resetFailedRecap: vi.fn(), markUnstartedRecapFailed: vi.fn(), prepare: vi.fn(), start: vi.fn(), stop: vi.fn(), isRecording: vi.fn(), activeRecapId: vi.fn(),
}));
vi.mock("./lib/attempts", () => ({
  insertRecap: api.insertRecap, finalizeAttempt: api.finalizeAttempt,
  markRecapFailed: api.markRecapFailed, resetFailedRecap: api.resetFailedRecap, uploadRecording: api.uploadRecording,
  markUnstartedRecapFailed: api.markUnstartedRecapFailed,
}));
vi.mock("./lib/backup", () => ({ discard: vi.fn() }));
vi.mock("./useRecapRecorder", () => ({
  useRecapRecorder: () => ({ prepare: api.prepare, start: api.start, stop: api.stop, forget: vi.fn(), isRecording: api.isRecording, activeRecapId: api.activeRecapId }),
}));

import RcRecallRunner from "./RcRecallRunner";

const bodies = [0, 1, 2, 3].map((p) => `P${p} first paragraph.\n\nP${p} second paragraph.`);
const segmented = bodies.map(segmentPassage);
const passages = bodies.map((text, i) => ({ passageId: i + 1, setNumber: i + 1, text }) as RcPassage);
const attempt = { id: "att-1", student_id: "s1", preptest: 140, section: 4, passage_ids: [1, 2, 3, 4] } as AttemptRow;

interface Options { mode?: "rc_recall" | "cumulative_recall"; showElapsedTimer?: boolean; passageCount?: number; resume?: Checkpoint | null; onExit?: () => void }
const renderRunner = ({ mode = "rc_recall", showElapsedTimer = true, passageCount = 4, resume = null, onExit = vi.fn() }: Options = {}) => render(
  <RcRecallRunner showElapsedTimer={showElapsedTimer} mode={mode} scope="all_read" passages={passages.slice(0, passageCount)} segmented={segmented.slice(0, passageCount)}
    attempt={attempt} studentId="s1" onExit={onExit} resume={resume} />,
);
/** Buttons appear after async saves, so wait for each one. */
const click = async (name: RegExp) => {
  const button = await screen.findByRole("button", { name });
  await act(async () => { fireEvent.click(button); });
};
const step = (name: RegExp) => screen.findByRole("heading", { name });
/** One paragraph, the whole-paragraph way: read, hide and recall, check, then on. */
const workParagraph = async (next: RegExp = /next paragraph|optional passage recall/i) => {
  await click(/hide the text and recall paragraph/i);
  await click(/check my recall/i);
  await click(next);
};
const checkpoint = (): Checkpoint => listCheckpoints("s1")[0];

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  window.localStorage.clear();
  api.insertRecap.mockImplementation(async (input) => ({ id: `row-${input.recapKey}`, ...input }));
  api.resetFailedRecap.mockImplementation(async (id, _studentId, voice) => ({ id, voice, recording_state: voice === "spoken" ? "pending" : "not_recorded" }));
  api.prepare.mockResolvedValue({ ok: true, stream: { getTracks: () => [] }, mimeType: "audio/webm" });
  api.isRecording.mockReturnValue(false);
  api.activeRecapId.mockReturnValue(null);
  api.finalizeAttempt.mockResolvedValue({});
  api.markRecapFailed.mockResolvedValue(undefined);
});

afterEach(() => { vi.useRealTimers(); });

describe("RC Training runner: the whole-paragraph procedure", () => {
  it("shows the text to read, hides it for recall, and shows it again to check", async () => {
    renderRunner();
    expect(screen.getByText("P0 first paragraph.")).toBeInTheDocument();
    await click(/hide the text and recall paragraph 1/i);
    expect(await screen.findByLabelText("Passage text hidden")).toBeInTheDocument();
    expect(screen.queryByText("P0 first paragraph.")).not.toBeInTheDocument();
    await click(/check my recall/i);
    expect(await step(/check your recall/i)).toBeInTheDocument();
    expect(screen.getByText("P0 first paragraph.")).toBeInTheDocument();
  });

  it("hiding starts silent recall immediately, with no separate start click", async () => {
    renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    expect(await screen.findByText("Silently retell paragraph 1 in your own words.")).toBeInTheDocument();
    expect(screen.getByText(/silent recall in progress/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start (the )?recap|start recording/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check my recall/i })).toBeEnabled();
    expect(api.prepare).not.toHaveBeenCalled();
  });

  it("recalls only the newest paragraph, then checks everything read so far", async () => {
    renderRunner();
    await workParagraph(/next paragraph/i);
    await click(/hide the text and recall paragraph 2/i);
    expect(screen.getByText("Silently retell paragraph 2 in your own words.")).toBeInTheDocument();
    expect(screen.queryByText(/paragraphs 1 to 2/i)).not.toBeInTheDocument();
    await click(/check my recall/i);
    expect(await step(/check your recall/i)).toBeInTheDocument();
    expect(screen.getByText("P0 first paragraph.")).toBeInTheDocument();
    expect(screen.getByText("P0 second paragraph.")).toBeInTheDocument();
  });

  it("shows where the student is: passage, paragraph and the current step", async () => {
    renderRunner();
    expect(screen.getByText(/Passage 1/, { selector: ".rct-run-location" })).toHaveTextContent("Passage 1 of 4 · Paragraph 1 of 2");
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Read");
    await click(/hide the text and recall paragraph 1/i);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Hide and recall");
    await click(/check my recall/i);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Check");
  });

  it("names one dominant next action at each step", async () => {
    renderRunner();
    const actions = () => screen.getAllByRole("button").map((b) => b.textContent).filter((t) => /recall|check|next|finish|continue|start/i.test(t ?? "") && !/save my place|end attempt/i.test(t ?? ""));
    expect(actions()).toEqual(["Hide the text and recall paragraph 1"]);
    await click(/hide the text/i);
    expect(actions()).toEqual(["Check my recall"]);
    await click(/check my recall/i);
    expect(actions()).toEqual(["Next paragraph"]);
  });

  it("completes a silent-only attempt and saves every recall as not_recorded", async () => {
    renderRunner();
    for (let passage = 0; passage < 4; passage++) {
      await workParagraph(/next paragraph/i);
      await workParagraph(/optional passage recall/i);
      await step(/whole passage \(optional\)/i);
      await click(/skip this optional recall/i);
    }
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/practice complete/i);
    expect(screen.getByTestId("rc-recall-finished")).toHaveTextContent(/no spoken recalls/i);
    expect(api.insertRecap).toHaveBeenCalledTimes(8);
    expect(api.insertRecap.mock.calls.every(([i]) => i.voice === "silent")).toBe(true);
    expect(api.start).not.toHaveBeenCalled();
    expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ attemptId: "att-1", studentId: "s1", completed: true }));
  });
});

describe("optional whole-passage recall", () => {
  const toPassageEnd = async (options: Options = { passageCount: 1 }) => {
    renderRunner(options);
    await workParagraph(/next paragraph/i);
    await workParagraph(/optional passage recall/i);
    await step(/whole passage \(optional\)/i);
  };

  it("offers silent (the default) or out loud, and can be skipped", async () => {
    await toPassageEnd();
    expect(screen.getByLabelText(/silent \(not recorded\)/i)).toBeChecked();
    expect(screen.getByLabelText(/out loud/i)).not.toBeChecked();
    expect(screen.getByRole("button", { name: /skip this optional recall, finish practice/i })).toBeInTheDocument();
  });

  it("a silent passage recall records nothing and saves a not_recorded row", async () => {
    await toPassageEnd();
    await click(/finish recall, finish practice/i);
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/practice complete/i);
    expect(api.start).not.toHaveBeenCalled();
    expect(api.insertRecap).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "passage_recap", voice: "silent" }));
  });

  it("an out loud passage recall needs an explicit Start recording, and says it records this recall only", async () => {
    api.start.mockResolvedValue({ ok: true, path: "s1/att-1/p1-passage-recap-a.webm", backup: { ok: true } });
    await toPassageEnd();
    fireEvent.click(screen.getByLabelText(/out loud/i));
    expect(api.prepare).not.toHaveBeenCalled();
    await click(/^start recording$/i);
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/recording this recall only/i, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop recording, finish practice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skip this optional recall/i })).not.toBeInTheDocument();
  });

  it("reports a blocked microphone, records nothing, and offers the silent recall instead", async () => {
    api.prepare.mockResolvedValue({ ok: false, reason: "The microphone is blocked." });
    await toPassageEnd();
    fireEvent.click(screen.getByLabelText(/out loud/i));
    await click(/^start recording$/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/microphone is blocked/i);
    expect(api.insertRecap).not.toHaveBeenCalledWith(expect.objectContaining({ kind: "passage_recap" }));
    expect(screen.getByLabelText(/silent \(not recorded\)/i)).toBeInTheDocument();
  });

  it("can retry a failed recorder start using the same recall row", async () => {
    api.start.mockResolvedValueOnce({ ok: false, reason: "Recorder failed." }).mockResolvedValueOnce({ ok: true, path: "s1/att-1/x.webm", backup: { ok: true } });
    await toPassageEnd();
    fireEvent.click(screen.getByLabelText(/out loud/i));
    await click(/^start recording$/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Recorder failed/i);
    await click(/^start recording$/i);
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2));
    expect(api.insertRecap.mock.calls.filter(([i]) => i.kind === "passage_recap")).toHaveLength(1);
    expect(api.resetFailedRecap).toHaveBeenCalledTimes(1);
  });
});

it("reconciles a failed-start marker after reconnect before retrying the same recap", async () => {
  api.start.mockResolvedValueOnce({ ok: false, reason: "Recorder failed." }).mockResolvedValueOnce({ ok: true, path: "p", backup: { ok: true } });
  api.markUnstartedRecapFailed.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  renderRunner({ passageCount: 1 });
  await workParagraph(/next paragraph/i);
  await workParagraph(/optional passage recall/i);
  fireEvent.click(screen.getByLabelText(/out loud/i));
  await click(/^start recording$/i);
  expect(api.markUnstartedRecapFailed).toHaveBeenCalledTimes(1);
  await click(/^start recording$/i);
  expect(api.markUnstartedRecapFailed).toHaveBeenCalledTimes(2);
  expect(api.resetFailedRecap).toHaveBeenCalledWith("row-p1-passage-recap", "s1", "spoken");
  expect(api.start).toHaveBeenCalledTimes(2);
});

it("does not fail or reset a recap owned by another live recorder", async () => {
  api.start.mockResolvedValue({ ok: false, preserveExisting: true, reason: "Already recording in another tab." });
  renderRunner({ passageCount: 1 });
  await workParagraph(/next paragraph/i);
  await workParagraph(/optional passage recall/i);
  fireEvent.click(screen.getByLabelText(/out loud/i));
  await click(/^start recording$/i);
  expect(api.markUnstartedRecapFailed).not.toHaveBeenCalled();
  expect(api.markRecapFailed).not.toHaveBeenCalled();
  expect(api.resetFailedRecap).not.toHaveBeenCalled();
});

describe("timing", () => {
  it("resets the passage clock without resetting section time", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    renderRunner();
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByLabelText("Passage elapsed time")).toHaveTextContent("0:12");
    await workParagraph(/next paragraph/i);
    await workParagraph(/optional passage recall/i);
    await click(/skip this optional recall/i);
    expect(screen.getByLabelText("Passage elapsed time")).toHaveTextContent("0:00");
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:12");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByLabelText("Passage elapsed time")).toHaveTextContent("0:03");
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:15");
  });

  it("hides timers but still saves elapsed time", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    window.confirm = vi.fn(() => true);
    renderRunner({ showElapsedTimer: false });
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.queryByLabelText("Elapsed timers")).not.toBeInTheDocument();
    await click(/end attempt/i);
    expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ elapsedSeconds: 9 }));
    expect(await screen.findByTestId("rc-recall-finished")).not.toHaveTextContent("total time");
  });

  it("pauses on pagehide and does not count the time until the page is shown again", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    renderRunner();
    act(() => vi.advanceTimersByTime(5000));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:05");
    act(() => { window.dispatchEvent(new Event("pageshow")); });
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:07");
  });

  it("does not infer inactivity from a long silent stretch", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    act(() => vi.advanceTimersByTime(15 * 60_000));
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("15:00");
  });
});

describe("leaving and resuming", () => {
  it("writes the place on this device as the student moves, per account and attempt", async () => {
    renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    await click(/check my recall/i);
    const saved = checkpoint();
    expect(saved).toMatchObject({ studentId: "s1", attemptId: "att-1", stepId: "p1-para1-confirm", stepIndex: 2, pending: null });
    expect(saved.recaps).toEqual([expect.objectContaining({ key: "p1-para1-recall", voice: "silent", rowId: "row-p1-para1-recall" })]);
  });

  it("Save my place and leave keeps the work for resuming instead of abandoning it", async () => {
    const onExit = vi.fn();
    renderRunner({ onExit });
    await click(/hide the text and recall paragraph 1/i);
    await click(/save my place and leave/i);
    expect(onExit).toHaveBeenCalled();
    expect(api.finalizeAttempt).not.toHaveBeenCalled();
    expect(checkpoint()).toMatchObject({ stepId: "p1-para1-recall" });
  });

  it("unmounting from navigation keeps the place too", async () => {
    const view = renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    view.unmount();
    expect(checkpoint()).toMatchObject({ stepId: "p1-para1-recall" });
    expect(api.finalizeAttempt).not.toHaveBeenCalled();
  });

  it("resumes at the saved step with the saved recaps and the active time, adding none for time away", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const first = renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    await click(/check my recall/i);
    act(() => vi.advanceTimersByTime(20_000));
    first.unmount();
    const saved = checkpoint();
    expect(saved.sectionMs).toBe(20_000);
    // The student is away for ten minutes.
    vi.advanceTimersByTime(10 * 60_000);
    renderRunner({ resume: saved });
    expect(await step(/check your recall/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:20");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByLabelText("Section elapsed time")).toHaveTextContent("0:21");
  });

  it("preserves an interrupted recording for recovery instead of replacing it on resume", async () => {
    const saved = { ...({} as Checkpoint), version: 1 as const, studentId: "s1", attemptId: "att-1", contentKey: "k", scope: "all_read" as const,
      stepIndex: 6, stepId: "p1-passage-recap", showElapsedTimer: true, savedAt: 1, pending: null, sectionMs: 1000, passageMs: 1000,
      recaps: [{ key: "p1-passage-recap", voice: "spoken" as const, state: "pending" as const, rowId: "row-x", label: "Recall the whole passage (optional)" }] };
    renderRunner({ passageCount: 1, resume: saved });
    expect(screen.getByRole("alert")).toHaveTextContent(/recording was interrupted/i);
    expect(api.markRecapFailed).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^start recording$/i })).not.toBeInTheDocument();
    expect(checkpoint().recaps[0].state).toBe("pending");
  });
});

describe("saving the finish", () => {
  it("locks Finish immediately so a double click saves once", async () => {
    let finish!: (v: unknown) => void;
    api.finalizeAttempt.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderRunner({ passageCount: 1 });
    await workParagraph(/next paragraph/i);
    await workParagraph(/optional passage recall/i);
    const skip = await screen.findByRole("button", { name: /skip this optional recall, finish practice/i });
    await act(async () => { fireEvent.click(skip); fireEvent.click(skip); fireEvent.click(skip); });
    expect(api.finalizeAttempt).toHaveBeenCalledTimes(1);
    expect(skip).toBeDisabled();
    expect(checkpoint().pending).toMatchObject({ completed: true });
    await act(async () => { finish({ completed: true, elapsed_seconds: 4 }); });
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/practice complete/i);
    expect(api.finalizeAttempt).toHaveBeenCalledTimes(1);
  });

  it("End attempt pressed while Finish is saving does not start a second, conflicting save", async () => {
    let finish!: (v: unknown) => void;
    api.finalizeAttempt.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    window.confirm = vi.fn(() => true);
    renderRunner({ passageCount: 1 });
    await workParagraph(/next paragraph/i);
    await workParagraph(/optional passage recall/i);
    const skip = await screen.findByRole("button", { name: /skip this optional recall, finish practice/i });
    const end = screen.getByRole("button", { name: /end attempt/i });
    await act(async () => { fireEvent.click(skip); fireEvent.click(end); });
    expect(api.finalizeAttempt).toHaveBeenCalledTimes(1);
    expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
    await act(async () => { finish({ completed: true }); });
  });

  it("shows the server's result when it had already finished the attempt another way", async () => {
    api.finalizeAttempt.mockResolvedValue({ completed: true, elapsed_seconds: 900 });
    window.confirm = vi.fn(() => true);
    renderRunner();
    await click(/end attempt/i);
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/practice complete/i);
    expect(screen.getByTestId("rc-recall-finished")).toHaveTextContent("15:00");
  });

  it("does not claim the result is saved when finalizing fails, and keeps the original duration to retry", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    api.finalizeAttempt.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
    window.confirm = vi.fn(() => true);
    renderRunner();
    act(() => vi.advanceTimersByTime(30_000));
    await click(/end attempt/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not confirm that your result was saved/i);
    expect(screen.getByRole("heading", { name: /not saved yet/i })).toBeInTheDocument();
    expect(checkpoint().pending).toMatchObject({ seconds: 30, completed: false });
    act(() => window.dispatchEvent(new Event("pagehide")));
    act(() => window.dispatchEvent(new Event("pageshow")));
    // A long wait before trying again must not change the duration.
    act(() => vi.advanceTimersByTime(5 * 60_000));
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(checkpoint().sectionMs).toBe(30_000);
    await click(/try saving again/i);
    expect(api.finalizeAttempt).toHaveBeenCalledTimes(2);
    expect(api.finalizeAttempt.mock.calls.map(([i]) => i.elapsedSeconds)).toEqual([30, 30]);
    expect(await screen.findByRole("heading", { name: /ended early|attempt ended/i })).toBeInTheDocument();
    expect(listCheckpoints("s1")).toEqual([]);
  });

  it("a failed finish survives leaving: the record stays on this device with its duration", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    api.finalizeAttempt.mockRejectedValue(new Error("offline"));
    window.confirm = vi.fn(() => true);
    const onExit = vi.fn();
    const view = renderRunner({ onExit });
    act(() => vi.advanceTimersByTime(12_000));
    await click(/end attempt/i);
    await click(/leave and save later/i);
    expect(onExit).toHaveBeenCalled();
    view.unmount();
    expect(checkpoint().pending).toMatchObject({ seconds: 12, completed: false });
  });

  it("does not promise a durable result when local storage fails", async () => {
    api.finalizeAttempt.mockRejectedValue(new Error("offline"));
    const write = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    window.confirm = vi.fn(() => true);
    try {
      renderRunner();
      await click(/end attempt/i);
      expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/could not keep a backup of the result/i);
      expect(screen.getByTestId("rc-recall-finished")).not.toHaveTextContent(/time is kept on this device/i);
    } finally { write.mockRestore(); }
  });
});

describe("recordings", () => {
  const toRecording = async (start: unknown) => {
    api.start.mockResolvedValue(start);
    renderRunner({ passageCount: 1 });
    await workParagraph(/next paragraph/i);
    await workParagraph(/optional passage recall/i);
    await step(/whole passage \(optional\)/i);
    fireEvent.click(screen.getByLabelText(/out loud/i));
    await click(/^start recording$/i);
  };

  it("tells the student when no on-device backup could be kept, instead of promising recovery", async () => {
    await toRecording({ ok: true, path: "p", backup: { ok: false, reason: "This device is out of storage space for a backup copy." } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/out of storage space.*cannot be recovered/i);
  });

  it("marks an empty recording not saved when ending the attempt", async () => {
    api.isRecording.mockReturnValue(true);
    api.activeRecapId.mockReturnValue("row-p1-passage-recap");
    api.stop.mockResolvedValue(null);
    window.confirm = vi.fn(() => true);
    await toRecording({ ok: true, path: "p", backup: { ok: true } });
    await click(/end attempt/i);
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/was not saved/i);
    expect(api.markRecapFailed).toHaveBeenCalledWith("row-p1-passage-recap", "s1");
  });

  it("says which copy exists when an upload fails, and only offers retry and download where audio is still held", async () => {
    api.uploadRecording.mockRejectedValue(new Error("offline"));
    api.stop.mockResolvedValue({ blob: new Blob(["audio"]), mimeType: "audio/webm", durationMs: 4000, path: "s1/att-1/x.webm", backup: { ok: false, reason: "full" } });
    await toRecording({ ok: true, path: "s1/att-1/x.webm", backup: { ok: false, reason: "full" } });
    await click(/stop recording, finish practice/i);
    const finished = await screen.findByTestId("rc-recall-finished");
    await waitFor(() => expect(finished).toHaveTextContent(/no copy was kept on this device/i));
    expect(screen.getByRole("button", { name: /try uploading again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save a copy to this device/i })).toBeInTheDocument();
    api.uploadRecording.mockResolvedValue(undefined);
    await click(/try uploading again/i);
    await waitFor(() => expect(finished).toHaveTextContent(/1 of 1 spoken recalls saved/i));
  });

  it("a recording with an on-device copy says it will be retried, not that it is lost", async () => {
    api.uploadRecording.mockRejectedValue(new Error("offline"));
    api.stop.mockResolvedValue({ blob: new Blob(["audio"]), mimeType: "audio/webm", durationMs: 4000, path: "s1/att-1/x.webm", backup: { ok: true } });
    await toRecording({ ok: true, path: "s1/att-1/x.webm", backup: { ok: true } });
    await click(/stop recording, finish practice/i);
    const finished = await screen.findByTestId("rc-recall-finished");
    await waitFor(() => expect(finished).toHaveTextContent(/a copy is kept on this device/i));
  });

  it("keeps a failed silent recall visible after moving to the next step", async () => {
    api.insertRecap.mockRejectedValueOnce(new Error("offline"));
    renderRunner();
    await click(/hide the text and recall paragraph 1/i);
    await click(/check my recall/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 silent recall record could not be saved/i);
  });
});

describe("legacy cumulative mode", () => {
  it("still has no look-back: paragraph 2 recalls everything with the text hidden", async () => {
    renderRunner({ mode: "cumulative_recall" });
    await click(/hide the text and recall paragraph 1/i);
    await click(/finish recall/i);
    await step(/read the paragraph/i);
    await click(/hide the text and recall paragraph 2/i);
    await click(/finish recall/i);
    expect(await step(/recall everything so far/i)).toBeInTheDocument();
    expect(screen.queryByText(/P0 (first|second) paragraph/)).not.toBeInTheDocument();
  });
});
