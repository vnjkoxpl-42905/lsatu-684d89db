import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useRecapRecorder } from "./useRecapRecorder";
import { listRuns } from "./lib/backup";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("pauses capture and excludes breaks from recall offsets and saved duration", async () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  let recorder!: Recorder;
  class Recorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    constructor() { recorder = this; }
    start() { this.state = "recording"; }
    pause() { this.state = "paused"; }
    resume() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["audio"]) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => { await result.current.start({ recapId: "pause-clock", attemptId: "a", studentId: "pause-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" }); });
  now = 2000;
  act(() => { expect(result.current.pause()).toBe(true); });
  expect(recorder.state).toBe("paused");
  now = 62000;
  expect(result.current.getOffset()).toBe(2000);
  act(() => { expect(result.current.resume()).toBe(true); });
  expect(recorder.state).toBe("recording");
  now = 65000;
  expect(result.current.getOffset()).toBe(5000);
  act(() => { expect(result.current.pause()).toBe(true); });
  now = 125000;
  await act(async () => { expect((await result.current.stop())?.durationMs).toBe(5000); });
  expect((await listRuns("pause-test"))[0].durationMs).toBe(5000);
});

it("reports pause failure without freezing the recording clock", async () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  class Recorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    start() { this.state = "recording"; }
    pause() { throw new Error("cannot pause"); }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => { await result.current.start({ recapId: "pause-failure", attemptId: "a", studentId: "pause-failure-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" }); });
  expect(result.current.pause()).toBe(false);
  now = 3000;
  expect(result.current.getOffset()).toBe(3000);
  await act(async () => { await result.current.stop(); });
});

it("meters the existing stream, follows real samples and releases analyser resources without another microphone request", async () => {
  let frame!: FrameRequestCallback;
  let sampleValue = 128;
  const cancel = vi.fn(); const sourceDisconnect = vi.fn(); const analyserDisconnect = vi.fn(); const close = vi.fn().mockResolvedValue(undefined);
  const source = { connect: vi.fn(), disconnect: sourceDisconnect };
  const analyser = { fftSize: 256, getByteTimeDomainData: (samples: Uint8Array) => samples.fill(sampleValue), disconnect: analyserDisconnect };
  const createSource = vi.fn(() => source);
  class Context { state = "running"; createMediaStreamSource = createSource; createAnalyser = () => analyser; close = close; }
  class Recorder { state = "inactive"; onstop: (() => void) | null = null; start() { this.state = "recording"; } stop() { this.state = "inactive"; this.onstop?.(); } }
  const getUserMedia = vi.fn(); const trackStop = vi.fn();
  const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
  vi.stubGlobal("AudioContext", Context); vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frame = callback; return 7; });
  vi.stubGlobal("cancelAnimationFrame", cancel); vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const { result, unmount } = renderHook(() => useRecapRecorder());
  await act(async () => { expect((await result.current.start({ recapId: "meter", attemptId: "a", studentId: "meter-test", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" })).ok).toBe(true); });
  expect(createSource).toHaveBeenCalledWith(stream);
  expect(getUserMedia).not.toHaveBeenCalled();
  act(() => frame(0));
  expect(result.current.micAvailable).toBe(true); expect(result.current.micLevel).toBe(0);
  sampleValue = 160; act(() => frame(100));
  expect(result.current.micLevel).toBe(1);
  await act(async () => { await result.current.stop(); });
  expect(result.current.micAvailable).toBe(false); expect(result.current.micLevel).toBe(0);
  expect(sourceDisconnect).toHaveBeenCalledOnce(); expect(analyserDisconnect).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce(); expect(cancel).toHaveBeenCalledWith(7);
  expect(trackStop).toHaveBeenCalledOnce();
  unmount(); expect(trackStop).toHaveBeenCalledOnce();
});

it("keeps recording available when Web Audio cannot initialize", async () => {
  class Context { constructor() { throw new Error("Audio context unavailable"); } }
  class Recorder { state = "inactive"; onstop: (() => void) | null = null; start() { this.state = "recording"; } stop() { this.state = "inactive"; this.onstop?.(); } }
  vi.stubGlobal("AudioContext", Context); vi.stubGlobal("MediaRecorder", Recorder);
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  const { result } = renderHook(() => useRecapRecorder());
  await act(async () => { expect((await result.current.start({ recapId: "meter-fallback", attemptId: "a", studentId: "meter-fallback", recapKey: "k" }, { ok: true, stream, mimeType: "audio/webm" })).ok).toBe(true); });
  expect(result.current.isRecording()).toBe(true); expect(result.current.micAvailable).toBe(false);
  await act(async () => { await result.current.stop(); });
});

it("stops microphone permission that arrives after the recorder hook unmounts", async () => {
  let permit!: (stream: MediaStream) => void;
  const stop = vi.fn();
  class Recorder { static isTypeSupported() { return true; } }
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise<MediaStream>((resolve) => { permit = resolve; }) } });
  const { result, unmount } = renderHook(() => useRecapRecorder());
  const preparation = result.current.prepare();
  unmount();
  permit({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await expect(preparation).resolves.toMatchObject({ ok: false });
  expect(stop).toHaveBeenCalledOnce();
});

it("never starts a recorder after unmount while its cross-tab lock is pending", async () => {
  let grant!: (lock: unknown) => Promise<void>;
  const start = vi.fn(); const stop = vi.fn();
  class Recorder { start = start; }
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("navigator", { locks: { request: (_name: string, _options: unknown, callback: (lock: unknown) => Promise<void>) => { grant = callback; return Promise.resolve(); } } });
  const { result, unmount } = renderHook(() => useRecapRecorder());
  const pending = result.current.start({ recapId: "late-lock", attemptId: "a", studentId: "late", recapKey: "p1-para1-recall" }, { ok: true, stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, mimeType: "audio/webm" });
  unmount();
  const held = grant({});
  await expect(pending).resolves.toMatchObject({ ok: false });
  await held;
  expect(start).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledOnce();
});

it("never starts recording if unmounted while its backup is being prepared", async () => {
  const start = vi.fn(); const stop = vi.fn();
  class Recorder { state = "inactive"; start = start; }
  vi.stubGlobal("MediaRecorder", Recorder);
  const { result, unmount } = renderHook(() => useRecapRecorder());
  const pending = result.current.start({ recapId: "late-backup", attemptId: "a", studentId: "late-backup-test", recapKey: "p1-para1-recall" }, { ok: true, stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, mimeType: "audio/webm" });
  unmount();
  await expect(pending).resolves.toMatchObject({ ok: false });
  expect(start).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledOnce();
  expect((await listRuns("late-backup-test"))[0]).toMatchObject({ stopped: true, chunkCount: 0 });
});

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

it("uses one monotonic clock for continuous recall markers and sealed capture duration", async () => {
  let now = 1000; vi.spyOn(performance, "now").mockImplementation(() => now);
  let recorder!: Recorder;
  class Recorder {
    state = "inactive"; onstop: (() => void) | null = null; ondataavailable: ((event: { data: Blob }) => void) | null = null;
    constructor() { recorder = this; }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["read plus recall audio"]) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  const stop = vi.fn(); const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const { result, unmount } = renderHook(() => useRecapRecorder());
  await act(async () => { await result.current.start({ recapId: "capture-clock", captureId: "capture-clock", attemptId: "a", studentId: "capture-clock-test", recapKey: "capture-capture-clock" }, { ok: true, stream, mimeType: "audio/webm" }); });
  now = 2250; expect(result.current.getOffset()).toBe(1250);
  now = 4875;
  await act(async () => { expect(await result.current.stop()).toMatchObject({ durationMs: 3875 }); });
  expect((await listRuns("capture-clock-test"))[0]).toMatchObject({ captureId: "capture-clock", stopped: true, durationMs: 3875 });
  expect(recorder.state).toBe("inactive"); expect(stop).toHaveBeenCalledOnce();
  unmount(); expect(stop).toHaveBeenCalledOnce();
});
