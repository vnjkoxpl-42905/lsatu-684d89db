import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { segmentPassage } from "./lib/segment";
import type { AttemptRow } from "./lib/attempts";

const api = vi.hoisted(() => ({
  insertRecap: vi.fn(), finalizeAttempt: vi.fn(), markRecapFailed: vi.fn(), uploadRecording: vi.fn(),
  resetFailedRecap: vi.fn(), prepare: vi.fn(), start: vi.fn(), stop: vi.fn(), isRecording: vi.fn(), activeRecapId: vi.fn(),
}));
vi.mock("./lib/attempts", () => ({
  insertRecap: api.insertRecap, finalizeAttempt: api.finalizeAttempt,
  markRecapFailed: api.markRecapFailed, resetFailedRecap: api.resetFailedRecap, uploadRecording: api.uploadRecording,
}));
vi.mock("./lib/backup", () => ({ discard: vi.fn() }));
vi.mock("./useRecapRecorder", () => ({
  useRecapRecorder: () => ({ prepare: api.prepare, start: api.start, stop: api.stop, forget: vi.fn(), isRecording: api.isRecording, activeRecapId: api.activeRecapId }),
}));

import RcRecallRunner from "./RcRecallRunner";

const bodies = [0, 1, 2, 3].map((p) => `P${p} first paragraph.\n\nP${p} second paragraph.`);
const segmented = bodies.map(segmentPassage);
const passages = bodies.map((text, i) => ({ passageId: i + 1, setNumber: i + 1, text }) as RcPassage);
const attempt = { id: "att-1", student_id: "s1" } as AttemptRow;

const renderRunner = (mode: "rc_recall" | "cumulative_recall") => render(
  <RcRecallRunner mode={mode} scope="all_read" passages={passages} segmented={segmented} attempt={attempt} studentId="s1" onExit={vi.fn()} />,
);
/** Buttons appear after async saves, so wait for each one. */
const click = async (name: RegExp) => { fireEvent.click(await screen.findByRole("button", { name })); };
const step = (name: RegExp) => screen.findByRole("heading", { name });

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.insertRecap.mockImplementation(async (input) => ({ id: `row-${input.recapKey}`, ...input }));
  api.resetFailedRecap.mockImplementation(async (id, _studentId, voice) => ({ id, voice, recording_state: voice === "spoken" ? "pending" : "not_recorded" }));
  api.prepare.mockResolvedValue({ ok: true, stream: { getTracks: () => [] }, mimeType: "audio/webm" });
  api.isRecording.mockReturnValue(false);
  api.activeRecapId.mockReturnValue(null);
  api.finalizeAttempt.mockResolvedValue({});
  api.markRecapFailed.mockResolvedValue(undefined);
});

describe("RC Recall runner", () => {
  it("shows the text to read, hides it during recall, and shows it again to confirm", async () => {
    renderRunner("rc_recall");
    expect(screen.getByText("P0 first paragraph.")).toBeInTheDocument();
    await click(/done reading/i);
    expect(await screen.findByText(/text is hidden/i)).toBeInTheDocument();
    expect(screen.queryByText("P0 first paragraph.")).not.toBeInTheDocument();
    await click(/start the recap/i);
    await click(/finish recap/i);
    expect(await step(/confirm with the text/i)).toBeInTheDocument();
    expect(screen.getByText("P0 first paragraph.")).toBeInTheDocument();
  });

  it("completes a silent-only attempt and saves every recap as not_recorded", async () => {
    renderRunner("rc_recall");
    for (let passage = 0; passage < 4; passage++) {
      for (let para = 0; para < 2; para++) {
        await click(/done reading/i);
        await click(/start the recap/i);
        await click(/finish recap/i);
        await click(/confirmed, continue/i);
      }
      await step(/whole passage \(optional\)/i);
      await click(/skip this recap/i);
    }
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/section complete/i);
    expect(screen.getByTestId("rc-recall-finished")).toHaveTextContent(/no spoken recaps/i);
    expect(api.insertRecap).toHaveBeenCalledTimes(8);
    expect(api.insertRecap.mock.calls.every(([i]) => i.voice === "silent")).toBe(true);
    expect(api.start).not.toHaveBeenCalled();
    expect(api.finalizeAttempt).toHaveBeenCalledWith(expect.objectContaining({ attemptId: "att-1", studentId: "s1", completed: true }));
  });

  it("offers the optional passage recap, spoken or silent", async () => {
    renderRunner("rc_recall");
    for (let para = 0; para < 2; para++) {
      await click(/done reading/i); await click(/start the recap/i); await click(/finish recap/i); await click(/confirmed, continue/i);
    }
    expect(await step(/whole passage \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/out loud/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/silent \(not recorded\)/i)).toBeInTheDocument();
  });

  it("reports a blocked microphone, records nothing, and marks that recap failed", async () => {
    api.prepare.mockResolvedValue({ ok: false, reason: "The microphone is blocked." });
    renderRunner("cumulative_recall");
    await click(/done reading/i);
    await click(/start recording the recap/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/microphone is blocked/i);
    expect(api.insertRecap).not.toHaveBeenCalled();
    expect(api.markRecapFailed).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /finish recap/i })).not.toBeInTheDocument();
  });

  it("keeps a failed silent recap visible after moving to the next step", async () => {
    api.insertRecap.mockRejectedValueOnce(new Error("offline"));
    renderRunner("cumulative_recall");
    await click(/done reading/i);
    fireEvent.click(screen.getByLabelText(/silent \(not recorded\)/i));
    await click(/start the recap/i);
    await click(/finish recap/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 silent recap record could not be saved/i);
  });

  it("marks an empty recording failed when ending an attempt", async () => {
    api.start.mockResolvedValue({ ok: true, path: "s1/att-1/p1-para1-recall-a.webm" });
    api.isRecording.mockReturnValue(true);
    api.activeRecapId.mockReturnValue("row-p1-para1-recall");
    api.stop.mockResolvedValue(null);
    window.confirm = vi.fn(() => true);
    renderRunner("cumulative_recall");
    await click(/done reading/i);
    await click(/start recording the recap/i);
    await click(/end attempt/i);
    expect(await screen.findByTestId("rc-recall-finished")).toHaveTextContent(/1 could not be saved/i);
    expect(api.markRecapFailed).toHaveBeenCalledWith("row-p1-para1-recall", "s1");
  });

  it("can retry a failed recorder start using the same recap row", async () => {
    api.start.mockResolvedValueOnce({ ok: false, reason: "Recorder failed." }).mockResolvedValueOnce({ ok: true, path: "s1/att-1/x.webm" });
    renderRunner("cumulative_recall");
    await click(/done reading/i);
    await click(/start recording the recap/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Recorder failed/i);
    await click(/start recording the recap/i);
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2));
    expect(api.insertRecap).toHaveBeenCalledTimes(1);
  });

  it("does not claim the result is saved when finalizing fails", async () => {
    api.finalizeAttempt.mockRejectedValue(new Error("offline"));
    window.confirm = vi.fn(() => true);
    renderRunner("cumulative_recall");
    await click(/end attempt/i);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be saved/i);
    expect(screen.getByRole("button", { name: /try saving again/i })).toBeInTheDocument();
  });

  it("Cumulative Recall has no look-back: paragraph 2 recaps everything with the text hidden", async () => {
    renderRunner("cumulative_recall");
    await click(/done reading/i);
    fireEvent.click(screen.getByLabelText(/silent \(not recorded\)/i));
    await click(/start the recap/i); await click(/finish recap/i);
    await step(/read, translate and quip/i);
    await click(/done reading/i); await click(/start the recap/i); await click(/finish recap/i);
    expect(await step(/recall everything so far/i)).toBeInTheDocument();
    expect(screen.queryByText(/P0 (first|second) paragraph/)).not.toBeInTheDocument();
  });
});
