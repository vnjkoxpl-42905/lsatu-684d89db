import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useRecapRecorder } from "./useRecapRecorder";
import { listRuns } from "./lib/backup";

afterEach(() => vi.unstubAllGlobals());

it("can retry after MediaRecorder.start throws without losing an earlier audio backup", async () => {
  let fail = true;
  class FakeRecorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    start() { if (fail) throw new Error("device failure"); this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  const meta = { recapId: "start-failure", attemptId: "a", studentId: "start-test", recapKey: "k" };
  const prepared = { ok: true as const, stream, mimeType: "audio/webm" };
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => { expect((await result.current.start(meta, prepared)).ok).toBe(false); });
  expect(result.current.isRecording()).toBe(false);
  expect((await listRuns("start-test"))[0]).toMatchObject({ stopped: true, chunkCount: 0 });
  fail = false;
  await act(async () => { expect((await result.current.start(meta, prepared)).ok).toBe(true); });
  await act(async () => { await result.current.stop(); });
});
