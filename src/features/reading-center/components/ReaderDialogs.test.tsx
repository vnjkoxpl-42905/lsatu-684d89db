// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarkNoteDialog } from "./ReaderDialogs";
import { buildTextModel } from "../lib/spreeder";

let root: Root;
let node: HTMLDivElement;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { vi.useFakeTimers(); node = document.createElement("div"); document.body.append(node); root = createRoot(node); });
afterEach(() => { act(() => root.unmount()); node.remove(); vi.useRealTimers(); });
const word = buildTextModel("one two").words[0];
const state = { mode: "edit" as const, word, bookmark: { id: "b", passage_id: "p", word_index: 0, note: "original", created_at: "2026-10-13" } };

describe("bookmark note autosave", () => {
  it("locks note editing during a slow create and never duplicates the bookmark", async () => {
    let finishSave!: () => void;
    const save = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    act(() => root.render(<BookmarkNoteDialog state={{ mode: "create", word }} title="Test" onClose={() => {}} onGoTo={() => {}} onSave={save} />));
    const textarea = document.querySelector("textarea")!;
    act(() => Simulate.change(textarea, { target: { value: "first note" } } as unknown as Parameters<typeof Simulate.change>[1]));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(textarea.disabled).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Saving your note");
    act(() => Simulate.change(textarea, { target: { value: "unsubmitted typing" } } as unknown as Parameters<typeof Simulate.change>[1]));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe("first note");
    await act(async () => finishSave());
    expect(textarea.disabled).toBe(false);
    expect(textarea.value).toBe("first note");
  });
  it("autosaves pasted input without any keyup and tolerates parent rerenders", async () => {
    const save = vi.fn(async (_note: string, _close: boolean) => {});
    const renderDialog = () => root.render(<BookmarkNoteDialog state={state} title="Test" onClose={() => {}} onGoTo={() => {}} onSave={(...args) => save(...args)} />);
    act(renderDialog);
    act(() => Simulate.change(document.querySelector("textarea")!, { target: { value: "pasted note" } } as unknown as Parameters<typeof Simulate.change>[1]));
    act(renderDialog);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(save).toHaveBeenCalledWith("pasted note", false);
  });
  it("keeps failed autosave dirty so Update retries instead of closing", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const close = vi.fn();
    act(() => root.render(<BookmarkNoteDialog state={state} title="Test" onClose={close} onGoTo={() => {}} onSave={save} />));
    act(() => Simulate.change(document.querySelector("textarea")!, { target: { value: "unsaved" } } as unknown as Parameters<typeof Simulate.change>[1]));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("has not saved");
    const update = [...document.querySelectorAll("button")].find((button) => button.textContent === "Update")!;
    await act(async () => update.click());
    expect(save).toHaveBeenLastCalledWith("unsaved", true);
    expect(close).not.toHaveBeenCalled();
  });
});
