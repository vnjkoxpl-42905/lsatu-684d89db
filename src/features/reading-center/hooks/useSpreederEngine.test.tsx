// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpreederEngine } from "./useSpreederEngine";
import { DEFAULT_PREFERENCES } from "../lib/constants";
import { buildTextModel } from "../lib/spreeder";

vi.mock("../lib/workerTimer", () => ({ startTimer: (delay: number, callback: () => void) => {
  const timer = window.setTimeout(callback, delay);
  return () => window.clearTimeout(timer);
} }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const model = buildTextModel("one two");
const measure = (text: string) => text.length * 10;
const read = vi.fn();
const finish = vi.fn();
let engine: ReturnType<typeof useSpreederEngine>;
function Harness() {
  engine = useSpreederEngine({ model, prefs: { ...DEFAULT_PREFERENCES, wpm: 200, words_per_line: 1, number_of_lines: 1, punctuation_pauses: false }, stage: { width: 500, height: 500 }, measure, initialWord: 0, onFinish: finish, onReadChunk: read });
  return null;
}
let root: Root;
let node: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
  read.mockClear(); finish.mockClear();
  node = document.createElement("div"); document.body.append(node);
  root = createRoot(node);
  act(() => root.render(<Harness />));
});
afterEach(() => { act(() => root.unmount()); node.remove(); vi.useRealTimers(); });

describe("reader playback", () => {
  it("preserves remaining chunk time on pause/resume and counts the final chunk", () => {
    act(() => engine.play());
    act(() => vi.advanceTimersByTime(200));
    act(() => engine.pause());
    act(() => vi.advanceTimersByTime(1000));
    expect(read).not.toHaveBeenCalled();
    act(() => engine.play());
    act(() => vi.advanceTimersByTime(99));
    expect(read).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(read).toHaveBeenCalledWith(1);
    expect(engine.activeWord).toBe(1);
    act(() => vi.advanceTimersByTime(300));
    expect(read).toHaveBeenCalledTimes(2);
    expect(finish).toHaveBeenCalledOnce();
    expect(engine.playing).toBe(false);
  });
  it("does not treat manual navigation as words read", () => {
    act(() => engine.next());
    expect(engine.activeWord).toBe(1);
    expect(read).not.toHaveBeenCalled();
    act(() => engine.restartSection());
    expect(engine.activeWord).toBe(0);
    expect(engine.seekVersion).toBe(2);
  });
});
