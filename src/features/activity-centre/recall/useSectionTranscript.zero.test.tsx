import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSectionTranscript } from "./useSectionTranscript";

/**
 * Where the transcript's clock starts, which is not where it used to.
 *
 * The transcript is cut at the recording's own segment boundaries, and those
 * are offsets from the instant the FILE begins. This hook measured from its own
 * mount instead, and the two are not the same instant: recognition starts on
 * mount, the recorder starts when `getUserMedia` resolves, and on a first run
 * that is a permission prompt a student has to read and answer. Every piece was
 * then stamped that much too late and filed one segment further on than the one
 * she spoke it in -- which is exactly the failure `sliceTranscript` was rewritten
 * to fix, arriving through the other door and looking like nothing at all.
 */

type Alternative = { transcript: string };
type Result = { 0: Alternative; isFinal: boolean };

class FakeRecognition {
  static live: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: { length: number } & Record<number, Result> }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    FakeRecognition.live = this;
  }
  stop() {}
  abort() {}
  /** One settled result, as the engine delivers it. */
  say(text: string, index = 0) {
    const results = { length: index + 1 } as { length: number } & Record<number, Result>;
    results[index] = { 0: { transcript: text }, isFinal: true };
    this.onresult?.({ resultIndex: index, results });
  }
}

let clock = 0;
const now = () => clock;

beforeEach(() => {
  clock = 0;
  FakeRecognition.live = null;
  vi.stubGlobal("SpeechRecognition", FakeRecognition);
});

describe("what the transcript's offsets are measured from", () => {
  it("measures from the recording's start, not from its own", () => {
    // She spent eight seconds on the permission prompt, so the file begins
    // eight seconds after recognition did.
    let recordingStartedAt: number | null = null;
    const { result } = renderHook(() =>
      useSectionTranscript(true, now, () => recordingStartedAt),
    );

    clock = 8_000;
    recordingStartedAt = 8_000;
    clock = 9_500;
    FakeRecognition.live?.say("the argument moves on the second sentence");

    // A second and a half into the FILE, which is where the first segment is.
    // Measured from mount it would have been 9.5s, deep inside a later window.
    expect(result.current.transcript()).toEqual([
      { atMs: 1_500, text: "the argument moves on the second sentence" },
    ]);
  });

  it("drops words spoken before the file existed rather than guessing at them", () => {
    // The ready beat asks her to say something to check the microphone. Those
    // words are genuinely not in the recording, so there is no stretch of it
    // they could be filed against.
    const { result } = renderHook(() => useSectionTranscript(true, now, () => null));

    clock = 500;
    FakeRecognition.live?.say("testing");

    expect(result.current.transcript()).toEqual([]);
  });

  it("keeps one timeline across a session the engine ends on silence", () => {
    // Engines close a session after a stretch of quiet even with `continuous`
    // set, and she is silent for every read in the section. Re-zeroing on the
    // restart would time the rest of the run from the middle of it.
    const { result } = renderHook(() => useSectionTranscript(true, now, () => 0));

    clock = 2_000;
    FakeRecognition.live?.say("first");

    clock = 400_000;
    FakeRecognition.live?.onend?.();
    clock = 401_000;
    FakeRecognition.live?.say("after the restart");

    expect(result.current.transcript()).toEqual([
      { atMs: 2_000, text: "first" },
      { atMs: 401_000, text: "after the restart" },
    ]);
  });
});
