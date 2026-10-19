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

it("reports an unexpected stop and keeps partial chunks unsealed instead of uploading them as complete", async () => {
  let recorder!: FakeRecorder;
  class FakeRecorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    constructor() { recorder = this; }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const { result, unmount } = renderHook(() => useRecapRecorder());
  await act(async () => {
    await result.current.start({ recapId: "interrupted-recap", attemptId: "a", studentId: "interrupted-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" });
    recorder.ondataavailable?.({ data: new Blob(["partial audio"]) });
  });
  await act(async () => { recorder.stop(); });
  expect(result.current.interruption).toMatch(/stopped unexpectedly/);
  expect((await listRuns("interrupted-test"))[0].stopped).not.toBe(true);
  await act(async () => { expect(await result.current.stop()).toBeNull(); });
  unmount();
  expect((await listRuns("interrupted-test"))[0].stopped).not.toBe(true);
});

it("reports a microphone track ending as an interruption", async () => {
  class FakeRecorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  let endTrack!: () => void;
  const track = { stop: vi.fn(), addEventListener: vi.fn((event: string, listener: () => void) => { if (event === "ended") endTrack = listener; }) };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => {
    await result.current.start({ recapId: "track-ended-recap", attemptId: "a", studentId: "track-ended-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" });
  });
  await act(async () => { endTrack(); });
  expect(result.current.interruption).toMatch(/stopped unexpectedly/);
  expect(track.stop).toHaveBeenCalled();
  await act(async () => { expect(await result.current.stop()).toBeNull(); });
  expect((await listRuns("track-ended-test"))[0].stopped).not.toBe(true);
});

it("does not seal partial audio when the microphone ends between explicit stop and onstop", async () => {
  let recorder!: FakeRecorder;
  class FakeRecorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    constructor() { recorder = this; }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  let endTrack!: () => void;
  const stream = { getTracks: () => [{ stop: vi.fn(), addEventListener: (event: string, listener: () => void) => { if (event === "ended") endTrack = listener; } }] } as unknown as MediaStream;
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => {
    await result.current.start({ recapId: "stop-race", attemptId: "a", studentId: "stop-race-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" });
    recorder.ondataavailable?.({ data: new Blob(["partial"]) });
  });
  await act(async () => {
    const stopping = result.current.stop();
    endTrack();
    recorder.onstop?.();
    expect(await stopping).toBeNull();
  });
  expect((await listRuns("stop-race-test"))[0].stopped).not.toBe(true);
});
