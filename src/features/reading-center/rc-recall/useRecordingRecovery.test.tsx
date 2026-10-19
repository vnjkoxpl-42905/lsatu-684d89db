import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The device backup and the upload are explicit mocked boundaries here; the
// scheduling under test (mount, reconnect, manual retry, no overlap) is real.
const api = vi.hoisted(() => ({ recover: vi.fn(), download: vi.fn(), upload: vi.fn(), uploadCapture: vi.fn() }));
vi.mock("./lib/backup", () => ({ recoverRcRecallBackups: api.recover, downloadRun: api.download }));
vi.mock("./lib/attempts", () => ({ uploadRecording: api.upload }));
vi.mock("./lib/captures", () => ({ uploadCapture: api.uploadCapture }));

import { useRecordingRecovery } from "./useRecordingRecovery";

const result = (over: Record<string, unknown> = {}) => ({ recovered: 0, failed: 0, empty: 0, incomplete: 0, live: 0, details: [], ...over });

beforeEach(() => { api.recover.mockReset().mockResolvedValue(result()); api.download.mockReset(); api.upload.mockReset(); });

describe("recording recovery scheduling", () => {
  it("checks the device once on entry, for the signed-in student only", async () => {
    const { result: hook } = renderHook(() => useRecordingRecovery("s1"));
    await waitFor(() => expect(hook.current.result).not.toBeNull());
    expect(api.recover).toHaveBeenCalledTimes(1);
    expect(api.recover.mock.calls[0][0]).toBe("s1");
  });

  it("does nothing without a signed-in student", async () => {
    renderHook(() => useRecordingRecovery(undefined));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(api.recover).not.toHaveBeenCalled();
  });

  it("reports an upload that failed, then retries by itself when the connection returns", async () => {
    api.recover.mockResolvedValueOnce(result({ failed: 1, details: [{ outcome: "failed" }] })).mockResolvedValueOnce(result({ recovered: 1 }));
    const onRecovered = vi.fn();
    const { result: hook } = renderHook(() => useRecordingRecovery("s1", onRecovered));
    await waitFor(() => expect(hook.current.attention).toBe(1));
    expect(onRecovered).not.toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(hook.current.attention).toBe(0));
    expect(api.recover).toHaveBeenCalledTimes(2);
    expect(onRecovered).toHaveBeenCalledTimes(1);
  });

  it("a manual retry runs a fresh pass and reports pending or failed work, never silence", async () => {
    api.recover.mockResolvedValueOnce(result({ incomplete: 1 })).mockResolvedValueOnce(result({ failed: 2 }));
    const { result: hook } = renderHook(() => useRecordingRecovery("s1"));
    await waitFor(() => expect(hook.current.attention).toBe(1));
    await act(async () => { await hook.current.retry(); });
    expect(hook.current.attention).toBe(2);
  });

  it("never runs two passes at once, so a reconnect during a pass cannot send a recording twice", async () => {
    let finish!: (r: unknown) => void;
    api.recover.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result: hook } = renderHook(() => useRecordingRecovery("s1"));
    await waitFor(() => expect(hook.current.running).toBe(true));
    await act(async () => { window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("online")); await hook.current.retry(); });
    expect(api.recover).toHaveBeenCalledTimes(1);
    await act(async () => { finish(result()); });
    await waitFor(() => expect(hook.current.running).toBe(false));
  });

  it("surfaces a pass that could not run at all", async () => {
    api.recover.mockRejectedValue(new Error("boom"));
    const { result: hook } = renderHook(() => useRecordingRecovery("s1"));
    await waitFor(() => expect(hook.current.error).toMatch(/could not be checked/i));
    expect(hook.current.running).toBe(false);
  });

  it("stops listening for reconnects when the page goes away", async () => {
    const { result: hook, unmount } = renderHook(() => useRecordingRecovery("s1"));
    await waitFor(() => expect(hook.current.result).not.toBeNull());
    unmount();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(api.recover).toHaveBeenCalledTimes(1);
  });
});


it("does not publish or download another account's recovery after a switch", async () => {
  let finish!: (r: unknown) => void;
  api.recover.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result: hook, rerender } = renderHook(({ id }) => useRecordingRecovery(id), { initialProps: { id: "s1" } });
  await waitFor(() => expect(api.recover).toHaveBeenCalledTimes(1));
  rerender({ id: "s2" });
  await waitFor(() => expect(api.recover).toHaveBeenCalledTimes(2));
  await act(async () => { finish(result({ failed: 1, details: [{ run: { studentId: "s1" }, outcome: "failed" }] })); });
  expect(hook.current.attention).toBe(0);
  await expect(hook.current.download({ studentId: "s1" } as never)).resolves.toBe(false);
  expect(api.download).not.toHaveBeenCalled();
});


it("does not start automatic or manual recovery while practice disables it", async () => {
  const { result: hook, rerender } = renderHook(({ enabled }) => useRecordingRecovery("s1", undefined, enabled), { initialProps: { enabled: false } });
  await act(async () => { window.dispatchEvent(new Event("online")); await hook.current.retry(); });
  expect(api.recover).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(api.recover).toHaveBeenCalledTimes(1));
});

it("recovers a sealed continuous capture through the capture adapter, preserving its duration", async () => {
  const blob = new Blob(["session"]);
  api.recover.mockImplementationOnce(async (_studentId, upload) => { await upload({ run: { captureId: "c1", recapId: "c1", studentId: "s1", attemptId: "a1", path: "s1/a1/capture-c1-unique.webm", mimeType: "audio/webm", durationMs: 6000 }, blob }); return result({ recovered: 1 }); });
  const { result: hook } = renderHook(() => useRecordingRecovery("s1"));
  await waitFor(() => expect(hook.current.result).not.toBeNull());
  expect(api.uploadCapture).toHaveBeenCalledWith(expect.objectContaining({ captureId: "c1", durationMs: 6000, blob }));
  expect(api.upload).not.toHaveBeenCalled();
});
