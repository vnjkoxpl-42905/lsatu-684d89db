import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceLevel } from "./VoiceLevel";

/*
 * The warning that would not go away.
 *
 * On the trial run one deliberately skipped Recall -- ten seconds of nothing,
 * because she had nothing for that one -- put "Nothing is reaching the
 * microphone" on the screen at 121s and left it there for the remaining
 * twenty-five stimuli, through 250 seconds of speech the drill heard perfectly.
 * Two defects: it fired on a single quiet window, and there was no path back.
 */

/** RMS of a constant-filled buffer is the constant, so this IS the reading. */
let amplitude = 0;
let frames: FrameRequestCallback[] = [];

class FakeAnalyser {
  fftSize = 512;
  getFloatTimeDomainData(out: Float32Array) {
    out.fill(amplitude);
  }
}

class FakeAudioContext {
  createAnalyser() {
    return new FakeAnalyser();
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  close() {
    return Promise.resolve();
  }
}

const LOUD = 0.05;
const SILENT = 0;
/** Past `MIN_WINDOW_MS`, so the window carries evidence. */
const LONG_ENOUGH = 9000;

beforeEach(() => {
  amplitude = SILENT;
  frames = [];
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Run every frame the read loop has queued, once. */
function pump() {
  const due = frames;
  frames = [];
  act(() => due.forEach((cb) => cb(0)));
}

function harness() {
  const onDeadInput = vi.fn();
  const stream = {} as MediaStream;
  const view = render(
    <VoiceLevel getStream={() => stream} phase="working" onDeadInput={onDeadInput} />,
  );
  /** Spend a window at one level, then close it by moving to the next phase. */
  const window_ = (level: number, ms: number, next: "working" | "recalling") => {
    amplitude = level;
    pump();
    act(() => vi.advanceTimersByTime(ms));
    view.rerender(
      <VoiceLevel getStream={() => stream} phase={next} onDeadInput={onDeadInput} />,
    );
  };
  return { onDeadInput, window_ };
}

const raised = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.some(([dead]) => dead === true);

describe("what a silent window means", () => {
  it("does not accuse the hardware over one skipped Recall", () => {
    const { onDeadInput, window_ } = harness();
    window_(LOUD, LONG_ENOUGH, "recalling"); // she read the stimulus aloud
    window_(SILENT, LONG_ENOUGH, "working"); // the skip: nothing for this one
    window_(LOUD, LONG_ENOUGH, "recalling"); // and straight back to speaking
    expect(raised(onDeadInput)).toBe(false);
  });

  it("says so when the silence runs across a whole stimulus", () => {
    const { onDeadInput, window_ } = harness();
    window_(SILENT, LONG_ENOUGH, "recalling");
    expect(raised(onDeadInput)).toBe(false);
    window_(SILENT, LONG_ENOUGH, "working");
    expect(onDeadInput).toHaveBeenCalledWith(true);
  });

  it("says it once and not again on every boundary after it", () => {
    const { onDeadInput, window_ } = harness();
    window_(SILENT, LONG_ENOUGH, "recalling");
    window_(SILENT, LONG_ENOUGH, "working");
    window_(SILENT, LONG_ENOUGH, "recalling");
    expect(onDeadInput.mock.calls.filter(([dead]) => dead === true)).toHaveLength(1);
  });

  it("takes it back as soon as anything is heard again", () => {
    const { onDeadInput, window_ } = harness();
    window_(SILENT, LONG_ENOUGH, "recalling");
    window_(SILENT, LONG_ENOUGH, "working");
    expect(onDeadInput).toHaveBeenLastCalledWith(true);

    amplitude = LOUD;
    pump();
    expect(onDeadInput).toHaveBeenLastCalledWith(false);
  });

  it("does not withdraw it over and over once it is withdrawn", () => {
    const { onDeadInput, window_ } = harness();
    window_(SILENT, LONG_ENOUGH, "recalling");
    window_(SILENT, LONG_ENOUGH, "working");
    amplitude = LOUD;
    pump();
    pump();
    pump();
    expect(onDeadInput.mock.calls.filter(([dead]) => dead === false)).toHaveLength(1);
  });

  it("ignores a window too short to carry evidence either way", () => {
    const { onDeadInput, window_ } = harness();
    window_(SILENT, 3000, "recalling"); // a Recall ended in three seconds
    window_(SILENT, LONG_ENOUGH, "working");
    expect(raised(onDeadInput)).toBe(false);
  });
});
