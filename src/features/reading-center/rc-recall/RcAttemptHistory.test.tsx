import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RcAttemptHistory from "./RcAttemptHistory";
import { getCaptureRecordingUrl } from "./lib/captures";
import { getRcGrades, gradeRcRecap, type RcGradeItem } from "./lib/grading";
import type { HistoryEntry } from "./lib/history";
vi.mock("./lib/captures", () => ({ getCaptureRecordingUrl: vi.fn() }));
vi.mock("./lib/attempts", () => ({ signedRecordingUrl: vi.fn(), classifyFailure: () => "other" }));
vi.mock("./lib/grading", () => ({ getRcGrades: vi.fn(), gradeRcRecap: vi.fn() }));
type Props = ComponentProps<typeof RcAttemptHistory>;
const recap = (id: string, state: "saved" | "failed" = "saved") => ({ id, attempt_id: "attempt", student_id: "owner", recap_key: `p1-para${id}-recall`, passage_position: 1, kind: "recall" as const, voice: "spoken" as const, recording_state: state, object_path: null, mime_type: "audio/webm", duration_ms: null, capture_id: "capture", recall_start_ms: 2000, recall_end_ms: 5000 });
const entry = (): HistoryEntry => ({ attempt: { id: "attempt", student_id: "owner", mode: "rc_recall", preptest: 140, section: 4, passage_ids: [16], confirmation_scope: "all_read", started_at: "2026-10-18T12:00:00Z", finished_at: "2026-10-18T12:01:00Z", elapsed_seconds: 60, completed: true }, recaps: [recap("1")], status: "completed", resumable: false, pendingFinalization: null, unsavedRecordings: 0 });
function show(value = entry()) {
  const props = { studentId: "owner", history: { entries: [value], isPending: false, isError: false, hasNextPage: false }, recovery: { running: false }, savingUnavailable: false, onResume: vi.fn(), onRetryFinish: vi.fn(), busyAttemptId: null, message: null } as unknown as Props;
  return render(<RcAttemptHistory {...props} />);
}
beforeEach(() => { vi.resetAllMocks(); vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined); });
afterEach(() => vi.restoreAllMocks());

describe("RC attempt recordings and saved feedback", () => {
  it("opens cached feedback even when another recording needs recovery", async () => {
    const value = entry(); value.recaps.push(recap("2", "failed")); value.status = "recovery_needed"; value.unsavedRecordings = 1;
    const ready: RcGradeItem = { recapId: "1", label: "Paragraph 1", status: "ready", grade: { version: 2, transcript: "Some artists may disagree.", sourceText: "Some artists may disagree.", sourceHash: "source", audioHash: "audio", model: "test", asrEngine: "test", assessment: { summary: "The saved recall kept its meaning.", nextStep: "Keep that possibility in your next recall.", details: [], relationships: [], coverage: { earned: 2, possible: 2, percent: 100, label: "Meaning points" } } } };
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: [ready, { recapId: "2", label: "Paragraph 2", status: "ungradable", reason: "The recording has not saved yet." }] });
    show(value);
    fireEvent.click(screen.getByRole("button", { name: "View recall feedback" }));
    expect(await screen.findByText("The saved recall kept its meaning.")).toBeInTheDocument();
    expect(screen.getByText("The recording has not saved yet.")).toBeInTheDocument();
    expect(gradeRcRecap).not.toHaveBeenCalled();
  });
  it("refreshes private playback links while preserving the refreshed segment bounds", async () => {
    vi.mocked(getCaptureRecordingUrl).mockResolvedValueOnce({ url: "https://audio.test/first", startSeconds: 2, endSeconds: 5 }).mockResolvedValueOnce({ url: "https://audio.test/fresh", startSeconds: 8, endSeconds: 10 });
    show(); fireEvent.click(screen.getByRole("button", { name: "Play recall segment" }));
    const audio = await screen.findByLabelText("Recording: Passage 1, paragraph 1") as HTMLAudioElement;
    fireEvent.loadedMetadata(audio); expect(audio.currentTime).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Refresh playback link" }));
    await waitFor(() => expect(audio).toHaveAttribute("src", "https://audio.test/fresh"));
    fireEvent.loadedMetadata(audio); expect(audio.currentTime).toBe(8);
    audio.currentTime = 0; fireEvent.seeking(audio); expect(audio.currentTime).toBe(8);
    audio.currentTime = 11; fireEvent.timeUpdate(audio); expect(audio.pause).toHaveBeenCalled();
    expect(getCaptureRecordingUrl).toHaveBeenLastCalledWith("owner", expect.objectContaining({ capture_id: "capture" }), { download: false });
  });
  it("restores an actionable signing retry after a media playback error", async () => {
    vi.mocked(getCaptureRecordingUrl).mockResolvedValueOnce({ url: "https://audio.test/expired", startSeconds: 2, endSeconds: 5 }).mockResolvedValueOnce({ url: "https://audio.test/reopened", startSeconds: 2, endSeconds: 5 });
    show(); fireEvent.click(screen.getByRole("button", { name: "Play recall segment" }));
    fireEvent.error(await screen.findByLabelText("Recording: Passage 1, paragraph 1"));
    expect(screen.getByRole("alert")).toHaveTextContent("fresh playback link");
    fireEvent.click(screen.getByRole("button", { name: "Play recall segment" }));
    await waitFor(() => expect(screen.getByLabelText("Recording: Passage 1, paragraph 1")).toHaveAttribute("src", "https://audio.test/reopened"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
