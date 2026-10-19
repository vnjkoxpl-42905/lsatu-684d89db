import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCheckpoints } from "./lib/checkpoint";
import { segmentPassage } from "./lib/segment";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import type { AttemptRow } from "./lib/attempts";
import { ReadingExerciseLayout } from "../components/ReadingExerciseLayout";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RcPreptestFile } from "@/features/rc/lib/rcTypes";
const api = vi.hoisted(() => ({ loadPassageProgress: vi.fn(), savePassageProgress: vi.fn(), prepare: vi.fn(), start: vi.fn(), stop: vi.fn(), createCapture: vi.fn(), saveCaptureWindow: vi.fn(), uploadCapture: vi.fn(), insertRecap: vi.fn(), finalizeAttempt: vi.fn(), readAttemptProgress: vi.fn(), discard: vi.fn(), offset: 0, count: 0, interruption: null as string | null }));
vi.mock("./lib/passageProgress", () => ({ loadPassageProgress: api.loadPassageProgress, savePassageProgress: api.savePassageProgress }));
vi.mock("./lib/captures", () => ({ createCapture: api.createCapture, saveCaptureWindow: api.saveCaptureWindow, uploadCapture: api.uploadCapture }));
vi.mock("./lib/attempts", () => ({ newId: () => `id-${++api.count}`, insertRecap: api.insertRecap, finalizeAttempt: api.finalizeAttempt, readAttemptProgress: api.readAttemptProgress }));
vi.mock("./lib/backup", () => ({ discard: api.discard }));
vi.mock("./useRecapRecorder", () => ({ useRecapRecorder: () => ({ prepare: api.prepare, start: api.start, stop: api.stop, getOffset: () => api.offset, interruption: api.interruption }) }));
vi.mock("./LegacyRcRecallRunner", () => ({ default: () => <div>Legacy exercise</div>, formatClock: (n: number) => String(n) }));
vi.mock("./RcTrainingFeedback", () => ({ default: ({ enabled, autoReview }: { enabled: boolean; autoReview?: boolean }) => <div data-testid="feedback" data-enabled={String(enabled)} data-auto={String(autoReview)} /> }));
import Runner from "./RcRecallRunner";
const bodies = ["First paragraph.\n\nSecond paragraph."];
const attempt = { id: "a1", student_id: "s1", preptest: 140, section: 4, passage_ids: [1] } as AttemptRow;
const props = { mode: "rc_recall" as const, scope: "all_read" as const, passages: bodies.map((text) => ({ text }) as RcPassage), segmented: bodies.map(text => segmentPassage(text)), attempt, studentId: "s1", onExit: vi.fn() };
const click = async (name: RegExp) => { if ((name.test("Pause and return to passages") || name.test("Finish early")) && !screen.queryByRole("button", { name })) fireEvent.click(screen.getByText("Practice options")); await waitFor(() => expect(screen.getByRole("button", { name })).toBeEnabled()); await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };
const space = async (repeat = false) => { await act(async () => { fireEvent.keyDown(document, { code: "Space", repeat }); }); };
beforeEach(() => {
  vi.restoreAllMocks();
  Object.values(api).forEach((value) => { if (typeof value === "function" && "mockReset" in value) value.mockReset(); });
  props.onExit.mockReset(); localStorage.clear(); api.interruption = null; api.offset = 0; api.count = 0;
  api.loadPassageProgress.mockResolvedValue([]);
  api.savePassageProgress.mockImplementation(async (input) => ({ attempt_id: input.attemptId, student_id: input.studentId, passage_id: input.passageId, passage_position: input.passagePosition, active_ms: input.activeMs, completed: input.completed }));
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
  it("runs each complete v2 paragraph read then hidden retell and reviews only after final save", async () => {
    render(<Runner {...props} attempt={{ ...attempt, segmentation_version: 2 }} />);
    await click(/Start exercise/);
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    api.offset = 1000; await click(/Retell paragraph/);
    expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
    expect(screen.getByText("Explain the whole paragraph in your own words.")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
    api.offset = 2500; await click(/Next paragraph/);
    expect(api.saveCaptureWindow).toHaveBeenLastCalledWith(expect.objectContaining({ recapKey: "p1-para1-recall", startMs: 1000, endMs: 2500 }));
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
    expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
    expect(api.finalizeAttempt).not.toHaveBeenCalled();
    api.offset = 4000; await click(/Retell paragraph/);
    api.offset = 6000; await click(/Finish passage/);
    expect(api.saveCaptureWindow).toHaveBeenLastCalledWith(expect.objectContaining({ recapKey: "p1-para2-recall", startMs: 4000, endMs: 6000 }));
    expect(api.savePassageProgress).toHaveBeenCalledWith(expect.objectContaining({ completed: true, passagePosition: 1 }));
    expect(api.finalizeAttempt).toHaveBeenCalledOnce();
    expect(api.uploadCapture).toHaveBeenCalledOnce();
    expect(screen.getByTestId("feedback")).toHaveAttribute("data-auto", "true");
    expect(screen.queryByText(/optional recall/i)).not.toBeInTheDocument();
  });

  it("waits until all four v2 passages are finished before enabling automatic review", async () => {
    const passages = Array.from({ length: 4 }, (_, i) => ({ text: `Complete passage ${i + 1}.` }) as RcPassage);
    render(<Runner {...props} passages={passages} segmented={passages.map(p => segmentPassage(p.text))} attempt={{ ...attempt, passage_ids: [1,2,3,4], segmentation_version: 2 }} />);
    await click(/Start exercise/);
    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`Complete passage ${i + 1}.`)).toBeInTheDocument();
      api.offset += 1000; await click(/Retell paragraph/);
      expect(screen.queryByText(`Complete passage ${i + 1}.`)).not.toBeInTheDocument();
      expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
      api.offset += 1000; await click(i === 3 ? /Finish section/ : /Next passage/);
      if (i < 3) expect(api.finalizeAttempt).not.toHaveBeenCalled();
    }
    expect(api.saveCaptureWindow).toHaveBeenCalledTimes(4);
    expect(api.finalizeAttempt).toHaveBeenCalledOnce();
    expect(screen.getByTestId("feedback")).toHaveAttribute("data-auto", "true");
  });

  it("presents all eight complete bank paragraphs with local A/B numbering and unchanged recall identities", async () => {
    const file: RcPreptestFile = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/rc/RC-PT140.json"), "utf8"));
    const source = file.passages.find((item) => item.passageId === 15)!;
    const segmented = segmentPassage(source.text);
    expect(source.title).toBe("Online Game Currencies");
    expect(segmented.paragraphs.map((item) => item.sub)).toEqual(["A", "A", "A", "A", "B", "B", "B", "B"]);
    render(<Runner {...props} passages={[source]} segmented={[segmented]} attempt={{ ...attempt, passage_ids: [15] }} />);
    await click(/Start exercise/);
    for (let index = 0; index < segmented.paragraphs.length; index++) {
      const current = segmented.paragraphs[index];
      expect(screen.getByText(`Passage ${current.sub} · Paragraph ${index % 4 + 1} of 4`)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Read the whole paragraph" })).toBeInTheDocument();
      const sourceArea = screen.getByRole("region", { name: "Passage text" });
      expect(sourceArea.querySelectorAll("p")).toHaveLength(1);
      expect(sourceArea.querySelector("p")!.textContent).toBe(current.text);
      expect(screen.getByRole("heading", { name: `Passage ${current.sub}` })).toBeInTheDocument();
      api.offset += 1000; await space();
      expect(screen.getByRole("heading", { name: "Recall the whole paragraph" })).toBeInTheDocument();
      expect(screen.getByText("Explain the whole paragraph in your own words.")).toBeInTheDocument();
      expect(screen.queryByText(current.text)).not.toBeInTheDocument();
      api.offset += 1000; await space();
      expect(api.saveCaptureWindow).toHaveBeenLastCalledWith(expect.objectContaining({ recapKey: `p1-para${index + 1}-recall` }));
      const checked = screen.getByRole("region", { name: "Passage text" });
      expect([...checked.querySelectorAll("p")].map((item) => item.textContent)).toEqual(segmented.paragraphs.slice(0, index + 1).map((item) => item.text));
      expect([...checked.querySelectorAll("h3")].map((item) => item.textContent)).toEqual(index < 4 ? ["Passage A"] : ["Passage A", "Passage B"]);
      await click(/Next paragraph|Finish passage/);
    }
    expect(screen.getByText("Whole-passage recall")).toBeInTheDocument();
    expect(screen.queryByText(/Paragraph \d of/)).not.toBeInTheDocument();
    expect(screen.queryByText(segmented.paragraphs[0].text)).not.toBeInTheDocument();
  });

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
    await click(/Pause and return to passages/);
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
  it("requires a working microphone, cancels pending permission and stops its late stream", async () => {
    let resolve!: (value: unknown) => void; const stop = vi.fn();
    api.prepare.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<Runner {...props} />); await click(/Start exercise/);
    expect(screen.getByText(/Waiting for microphone permission/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue without recording/ })).not.toBeInTheDocument();
    await click(/Cancel microphone request/);
    expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
    await act(async () => { resolve({ ok: true, stream: { getTracks: () => [{ stop }] }, mimeType: "audio/webm" }); });
    expect(stop).toHaveBeenCalledOnce(); expect(api.start).not.toHaveBeenCalled();
  });
  it("restores the app layout on unmount and stops permission streams that resolve late", async () => {
    let resolve!: (value: unknown) => void; const stop = vi.fn(); const layout = vi.fn();
    api.prepare.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const view = render(<ReadingExerciseLayout.Provider value={layout}><Runner {...props} /></ReadingExerciseLayout.Provider>);
    await click(/Start exercise/); view.unmount();
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
  await click(/Start exercise/); now += 600000;
  await act(async () => { permit({ ok: true, stream: { getTracks: () => [] }, mimeType: "audio/webm" }); });
  now += 3000; await click(/Pause and return to passages/);
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
  expect(screen.getByRole("button", { name: "Choose another passage" })).toBeInTheDocument();
  expect(screen.getByTestId("feedback")).toHaveAttribute("data-enabled", "true");
  expect(api.finalizeAttempt).toHaveBeenCalledOnce(); expect(api.uploadCapture).not.toHaveBeenCalled();
});
it("skips optional recall without adding an empty or silent history row", async () => {
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs(); await click(/Skip optional recall/);
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
  expect(api.stop).toHaveBeenCalledOnce();
  expect(screen.getByRole("region", { name: "Recording not saved" })).toBeInTheDocument();
  await click(/Leave anyway/);
  expect(props.onExit).toHaveBeenCalledOnce();
});

it("returns focus from the instructions button to the step so Space still advances", async () => {
  render(<Runner {...props} />); await click(/Start exercise/);
  const button = screen.getByRole("button", { name: "Show instructions" }); button.focus();
  await click(/Show instructions/);
  expect(screen.getByRole("heading", { name: "Read the whole paragraph" })).toHaveFocus();
  api.offset = 1000; await space();
  expect(screen.getByLabelText("Passage text hidden")).toBeInTheDocument();
  const show = screen.getByRole("button", { name: "Hide instructions" }); show.focus(); await click(/Hide instructions/);
  expect(screen.getByRole("heading", { name: "Recall the whole paragraph" })).toHaveFocus();
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

it("keeps an unsuccessful leave visible, retries retained audio and exits only after confirmed save", async () => {
  api.uploadCapture.mockRejectedValueOnce(new Error("offline"));
  render(<Runner {...props} />); await click(/Start exercise/); await click(/Pause and return to passages/);
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.getByRole("region", { name: "Recording not saved" })).toHaveTextContent(/progress or recording has not saved/);
  expect(screen.getByRole("button", { name: /Hide paragraph/ })).toBeDisabled();
  await click(/Try saving recording again/);
  expect(api.stop).toHaveBeenCalledOnce(); expect(api.uploadCapture).toHaveBeenCalledTimes(2);
  expect(props.onExit).toHaveBeenCalledOnce();
});
it("lets a student explicitly leave after a failed upload without discarding the retained backup", async () => {
  api.uploadCapture.mockRejectedValueOnce(new Error("offline"));
  render(<Runner {...props} />); await click(/Start exercise/); await click(/Pause and return to passages/);
  expect(api.discard).not.toHaveBeenCalled(); expect(props.onExit).not.toHaveBeenCalled();
  await click(/Leave anyway/);
  expect(props.onExit).toHaveBeenCalledOnce(); expect(api.discard).not.toHaveBeenCalled();
});
it("focuses the first paragraph when microphone setup becomes ready", async () => {
  render(<Runner {...props} />); await click(/Start exercise/);
  expect(screen.getByRole("heading", { name: "Read the whole paragraph" })).toHaveFocus();
});
it("begins and finishes an optional spoken window without a checkbox or another microphone start", async () => {
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Begin whole-passage recall/ })).toBeInTheDocument();
  api.offset = 4500; await click(/Begin whole-passage recall/);
  expect(screen.queryByRole("button", { name: /Skip optional recall/ })).not.toBeInTheDocument();
  expect(api.saveCaptureWindow).toHaveBeenCalledTimes(2);
  api.offset = 8000; await click(/Finish practice/);
  expect(api.saveCaptureWindow).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "passage_recap", startMs: 4500, endMs: 8000, captureId: "id-1" }));
  expect(api.prepare).toHaveBeenCalledOnce(); expect(api.start).toHaveBeenCalledOnce(); expect(api.stop).toHaveBeenCalledOnce();
  expect(api.insertRecap).not.toHaveBeenCalled();
});

it("keeps prestart to one primary action and no paragraph, timer, guide or exit options", async () => {
  render(<Runner {...props} />); await waitFor(() => expect(screen.getByRole("button", { name: "Start exercise" })).toBeEnabled());
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.queryByText(/Paragraph 1 of/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Show instructions|Pause and return|Finish early|Continue without/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Choose another passage" })).toBeInTheDocument();
});
it("does not reveal a paragraph when microphone preparation fails", async () => {
  api.prepare.mockResolvedValueOnce({ ok: false, reason: "Microphone permission denied." });
  render(<Runner {...props} />); await click(/Start exercise/);
  expect(screen.getByRole("alert")).toHaveTextContent(/permission denied/);
  expect(screen.queryByText("First paragraph.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start exercise" })).toBeEnabled();
});
it("saves passage completion before advancing and retries the identical intent on failure", async () => {
  api.savePassageProgress.mockRejectedValueOnce(new Error("Progress offline"));
  let now = 1000; vi.spyOn(Date, "now").mockImplementation(() => now);
  render(<Runner {...props} />); await click(/Start exercise/);
  for (let i = 0; i < 2; i++) { api.offset += 1000; await space(); api.offset += 1000; await space(); if (!i) await click(/Next paragraph/); }
  now += 4000; await click(/Finish passage/);
  expect(screen.getByRole("alert")).toHaveTextContent(/Progress offline/);
  expect(screen.getByRole("button", { name: /Finish passage/ })).toBeInTheDocument();
  expect(screen.queryByText(/Passage completed/)).not.toBeInTheDocument();
  expect(listCheckpoints("s1")[0].pendingPassageProgress).toMatchObject({ completed: true, activeMs: 4000 });
  now += 100000; await click(/Finish passage/);
  expect(api.savePassageProgress.mock.calls[0][0]).toEqual(api.savePassageProgress.mock.calls[1][0]);
  expect(screen.getByText(/Passage completed/)).toBeInTheDocument();
  expect(api.saveCaptureWindow).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
});
it("restores passage timing from the server and always shows its active timer", async () => {
  api.loadPassageProgress.mockResolvedValue([{ attempt_id: "a1", passage_id: 1, passage_position: 1, active_ms: 7000, completed: false }]);
  render(<Runner {...props} showElapsedTimer={false} />); await click(/Start exercise/);
  expect(screen.getByRole("timer")).toHaveTextContent("Passage practice time: 7");
  await click(/Pause and return to passages/);
  expect(api.savePassageProgress).toHaveBeenCalledWith(expect.objectContaining({ activeMs: expect.any(Number), completed: false }));
  expect(listCheckpoints("s1")[0].passageTimesMs![0]).toBeGreaterThanOrEqual(7000);
});

it("keeps four passage clocks separate, freezes completed time and continues the practice total", async () => {
  let now = 1000; vi.spyOn(Date, "now").mockImplementation(() => now);
  const fullBodies = [1, 2, 3, 4].map((id) => `Passage ${id} body.`);
  const full = { ...props, passages: fullBodies.map((text) => ({ text }) as RcPassage), segmented: fullBodies.map(text => segmentPassage(text)), attempt: { ...attempt, passage_ids: [1, 2, 3, 4] } };
  const view = render(<Runner {...full} />); await click(/Start exercise/);
  now += 5000; api.offset = 1000; await space();
  expect(screen.getByRole("timer")).toHaveTextContent(/Passage practice time: 5\s*Total practice time: 5/);
  api.offset = 2000; await space(); await click(/Finish passage/);
  expect(screen.getByRole("timer")).toHaveTextContent("Passage practice time: 5");
  now += 3000; await click(/Skip optional recall/);
  expect(screen.getByRole("timer")).toHaveTextContent("Passage practice time: 0");
  expect(screen.getByText(/Selected passage 2 of 4/)).toBeInTheDocument();
  now += 2000; await click(/Pause and return to passages/);
  const checkpoint = listCheckpoints("s1")[0];
  expect(checkpoint.sectionMs).toBe(10000);
  expect(checkpoint.passageTimesMs).toEqual([5000, 2000, 0, 0]);
  expect(checkpoint.completedPassagePositions).toEqual([1]);
  expect(api.savePassageProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ passageId: 1, passagePosition: 1, activeMs: 5000, completed: true }));
  expect(api.savePassageProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({ passageId: 2, passagePosition: 2, activeMs: 2000, completed: false }));
  view.unmount(); now += 600000;
  api.loadPassageProgress.mockResolvedValue([{ attempt_id: "a1", passage_id: 2, passage_position: 2, active_ms: 2000, completed: false }]);
  render(<Runner {...full} resume={checkpoint} />); await click(/Start exercise/);
  expect(screen.getByRole("timer")).toHaveTextContent("Passage practice time: 2");
  expect(screen.getByRole("timer")).toHaveTextContent("Total practice time: 10");

});

it("keeps microphone start unavailable when saved progress cannot be read, and offers a retry", async () => {
  api.loadPassageProgress.mockRejectedValueOnce(new Error("missing table"));
  render(<Runner {...props} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/saved passage progress could not be loaded/);
  expect(screen.getByRole("button", { name: "Start exercise" })).toBeDisabled();
  await click(/Retry loading progress/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start exercise" })).toBeEnabled());
  expect(api.prepare).not.toHaveBeenCalled();
});

it("waits for acknowledged last-passage completion before the attempt can finalize", async () => {
  let acknowledge!: (row: unknown) => void;
  api.savePassageProgress.mockReturnValueOnce(new Promise((resolve) => { acknowledge = resolve; }));
  render(<Runner {...props} />); await click(/Start exercise/);
  for (let i = 0; i < 2; i++) { api.offset += 1000; await space(); api.offset += 1000; await space(); if (!i) await click(/Next paragraph/); }
  await click(/Finish passage/);
  expect(api.finalizeAttempt).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Skip optional recall/ })).not.toBeInTheDocument();
  await act(async () => { acknowledge({ active_ms: 4000, completed: true }); });
  await click(/Skip optional recall/);
  expect(api.finalizeAttempt).toHaveBeenCalledOnce();
  expect(api.savePassageProgress.mock.invocationCallOrder[0]).toBeLessThan(api.finalizeAttempt.mock.invocationCallOrder[0]);
});
it("saves unfinished passage time before stopping audio and finalizing Finish early", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  let acknowledge!: (row: unknown) => void;
  api.savePassageProgress.mockReturnValueOnce(new Promise((resolve) => { acknowledge = resolve; }));
  api.finalizeAttempt.mockResolvedValueOnce({ completed: false, elapsed_seconds: 4 });
  render(<Runner {...props} />); await click(/Start exercise/); await click(/Finish early/);
  expect(api.finalizeAttempt).not.toHaveBeenCalled(); expect(api.stop).not.toHaveBeenCalled();
  expect(api.savePassageProgress).toHaveBeenCalledWith(expect.objectContaining({ completed: false }));
  await act(async () => { acknowledge({ active_ms: 4000, completed: false }); });
  expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ completed: false }));
  expect(api.savePassageProgress.mock.invocationCallOrder[0]).toBeLessThan(api.stop.mock.invocationCallOrder[0]);
  expect(api.stop.mock.invocationCallOrder[0]).toBeLessThan(api.finalizeAttempt.mock.invocationCallOrder[0]);
});

it("retries an optional recall save with its original window instead of recording it again", async () => {
  render(<Runner {...props} />); await click(/Start exercise/); await finishParagraphs();
  api.offset = 5000; await click(/Begin whole-passage recall/);
  api.saveCaptureWindow.mockRejectedValueOnce(new Error("Recall offline"));
  api.offset = 8500; await click(/Finish practice/);
  expect(screen.getByRole("alert")).toHaveTextContent(/Recall offline/);
  expect(api.finalizeAttempt).not.toHaveBeenCalled();
  api.offset = 9900; await click(/Finish practice/);
  expect(api.saveCaptureWindow.mock.calls[2][0]).toEqual(api.saveCaptureWindow.mock.calls[3][0]);
  expect(api.saveCaptureWindow.mock.calls[3][0]).toMatchObject({ startMs: 5000, endMs: 8500, kind: "passage_recap" });
  expect(api.start).toHaveBeenCalledOnce(); expect(api.stop).toHaveBeenCalledOnce();
});

it("does not create a resume banner checkpoint when choosing another passage before starting", async () => {
  const view = render(<Runner {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start exercise" })).toBeEnabled());
  expect(listCheckpoints("s1")).toHaveLength(0);
  await click(/Choose another passage/); view.unmount();
  expect(listCheckpoints("s1")).toHaveLength(0);
  expect(api.start).not.toHaveBeenCalled(); expect(api.savePassageProgress).not.toHaveBeenCalled();
});
it("preserves a genuinely resumed step-zero checkpoint when leaving before a new microphone start", async () => {
  const resume = { version: 1, captureWorkflow: true, studentId: "s1", attemptId: "a1", attempt, contentKey: "test", scope: "all_read", stepIndex: 0, stepId: "p1:read:0", recaps: [], sectionMs: 4000, passageMs: 4000, passageTimesMs: [4000], showElapsedTimer: true, savedAt: 0, pending: null, pendingPassageProgress: { passageId: 1, passagePosition: 1, activeMs: 4000, completed: false } } as import("./lib/checkpoint").Checkpoint;
  const view = render(<Runner {...props} resume={resume} />);
  await click(/Choose another passage/); view.unmount();
  expect(listCheckpoints("s1")[0]).toMatchObject({ sectionMs: 4000, pendingPassageProgress: resume.pendingPassageProgress });
  expect(api.start).not.toHaveBeenCalled();
});
it("keeps a fresh recording checkpoint from its first paragraph once the microphone has started", async () => {
  const view = render(<Runner {...props} />); await click(/Start exercise/);
  expect(listCheckpoints("s1")).toHaveLength(1);
  view.unmount(); expect(listCheckpoints("s1")).toHaveLength(1);
});
