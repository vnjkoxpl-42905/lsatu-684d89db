import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ responses: [] as unknown[], insert: vi.fn(), update: vi.fn(), upload: vi.fn(), list: vi.fn(), signed: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => { const result = () => Promise.resolve(api.responses.shift()); const chain: Record<string, unknown> = {}; for (const key of ["select", "eq"]) chain[key] = () => chain; chain.insert = (input: unknown) => { api.insert(input); return chain; }; chain.update = (input: unknown) => { api.update(input); return chain; }; chain.single = result; chain.maybeSingle = result; return chain; }, storage: { from: () => ({ upload: api.upload, list: api.list, createSignedUrl: api.signed }) } } }));
import { createCapture, saveCaptureWindow, uploadCapture, getCaptureRecordingUrl, type CaptureRecap } from "./captures";
const capture = { id: "c1", student_id: "s1", attempt_id: "a1", recording_state: "saved", object_path: "s1/a1/capture-c1-unique.webm", duration_ms: 10000 };
const recap = { student_id: "s1", capture_id: "c1", attempt_id: "a1", recall_start_ms: 1200, recall_end_ms: 3500 } as CaptureRecap;
beforeEach(() => { api.responses = []; api.insert.mockReset(); api.update.mockReset(); api.upload.mockReset().mockResolvedValue({ error: null }); api.list.mockReset(); api.signed.mockReset().mockResolvedValue({ data: { signedUrl: "https://private.example/file" }, error: null }); });
describe("capture persistence", () => {
  it("reconciles a lost capture insert response by exact owner and attempt", async () => {
    api.responses = [{ error: new Error("lost response") }, { data: capture }];
    await expect(createCapture("c1", "s1", "a1", "audio/webm")).resolves.toEqual(capture);
  });
  it("reconciles an immutable recall window after a lost response", async () => {
    api.responses = [{ error: new Error("lost response") }, { data: { ...recap, id: "r1", recap_key: "p1:recall:0" } }];
    await expect(saveCaptureWindow({ id: "r1", studentId: "s1", attemptId: "a1", captureId: "c1", recapKey: "p1:recall:0", passagePosition: 1, kind: "recall", startMs: 1200, endMs: 3500 })).resolves.toMatchObject({ recall_start_ms: 1200, recall_end_ms: 3500 });
    expect(api.insert).toHaveBeenCalledOnce(); expect(api.update).not.toHaveBeenCalled();
  });
  it("rejects a stored window with different offsets rather than overwriting it", async () => {
    api.responses = [{ error: new Error("duplicate") }, { data: { ...recap, recap_key: "p1:recall:0", recall_end_ms: 9999 } }];
    await expect(saveCaptureWindow({ id: "r1", studentId: "s1", attemptId: "a1", captureId: "c1", recapKey: "p1:recall:0", passagePosition: 1, kind: "recall", startMs: 1200, endMs: 3500 })).rejects.toThrow();
    expect(api.update).not.toHaveBeenCalled();
  });
  it("reconciles capture saved state when the update response is lost", async () => {
    api.responses = [{ data: { ...capture, recording_state: "pending" } }, { error: new Error("lost") }, { data: capture }];
    await expect(uploadCapture({ studentId: "s1", attemptId: "a1", captureId: "c1", path: capture.object_path, blob: new Blob(["audio"]), mimeType: "audio/webm", durationMs: 10000 })).resolves.toBeUndefined();
    expect(api.upload).toHaveBeenCalledOnce();
  });
});
describe("private capture playback", () => {
  it("returns only a verified owner's signed URL and exact recall window", async () => {
    api.responses = [{ data: capture }];
    await expect(getCaptureRecordingUrl("s1", recap)).resolves.toEqual({ url: "https://private.example/file", startSeconds: 1.2, endSeconds: 3.5 });
  });
  it.each([{ ...capture, student_id: "other" }, { ...capture, attempt_id: "other" }, { ...capture, recording_state: "pending" }, { ...capture, object_path: "other/private.webm" }, { ...capture, duration_ms: 2000 }])("never signs an unverified capture %j", async (row) => {
    api.responses = [{ data: row }];
    await expect(getCaptureRecordingUrl("s1", recap)).rejects.toThrow(/could not be verified/);
    expect(api.signed).not.toHaveBeenCalled();
  });
});
