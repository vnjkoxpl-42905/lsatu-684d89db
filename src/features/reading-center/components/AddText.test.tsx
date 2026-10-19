// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddTextScreen } from "./AddText";

const mutation = vi.hoisted(() => ({
  inputs: [] as { title: string; body: string }[],
  succeed: () => {},
  fail: () => {},
}));
vi.mock("../hooks/useReadingCenterData", () => ({ useUpsertPassage: () => {
  const [isPending, setPending] = useState(false);
  return { isPending, mutate: (input: { title: string; body: string }, handlers: { onSuccess: (row: { slug: string }) => void; onError: (error: Error) => void; onSettled: () => void }) => {
    mutation.inputs.push(input);
    setPending(true);
    mutation.succeed = () => { setPending(false); handlers.onSuccess({ slug: "my-article" }); handlers.onSettled(); };
    mutation.fail = () => { setPending(false); handlers.onError(new Error("Connection lost")); handlers.onSettled(); };
  } };
} }));

let root: Root;
let node: HTMLDivElement;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { mutation.inputs = []; node = document.createElement("div"); document.body.append(node); root = createRoot(node); });
afterEach(() => { act(() => root.unmount()); node.remove(); });

function fillText() {
  const title = document.querySelector<HTMLInputElement>('input[id="rc-field-enter-title"]')!;
  const body = document.querySelector<HTMLTextAreaElement>("textarea")!;
  act(() => {
    Simulate.change(title, { target: { value: "My article" } } as unknown as Parameters<typeof Simulate.change>[1]);
    Simulate.change(body, { target: { value: "The original article text." } } as unknown as Parameters<typeof Simulate.change>[1]);
  });
  return { title, body };
}
function saveButton() { return [...document.querySelectorAll("button")].find((button) => button.textContent === "Save")!; }

describe("Add Text save lifecycle", () => {
  it("locks editing and closing during a slow save and reports success only after confirmation", () => {
    const close = vi.fn();
    const saved = vi.fn();
    act(() => root.render(<AddTextScreen mode="paste" onClose={close} onSaved={saved} />));
    const { title, body } = fillText();
    act(() => saveButton().click());
    expect(title.matches(":disabled")).toBe(true);
    expect(body.matches(":disabled")).toBe(true);
    expect([...document.querySelectorAll("button")].every((button) => button.matches(":disabled"))).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Saving your text");
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(close).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(mutation.inputs).toEqual([{ title: "My article", body: "The original article text." }]);
    act(() => mutation.succeed());
    expect(saved).toHaveBeenCalledWith("my-article");
  });
  it("preserves the entered article and restores editing and retry after a failed save", () => {
    const saved = vi.fn();
    act(() => root.render(<AddTextScreen mode="paste" onClose={() => {}} onSaved={saved} />));
    const { title, body } = fillText();
    act(() => saveButton().click());
    act(() => mutation.fail());
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Connection lost");
    expect(title.matches(":disabled")).toBe(false);
    expect(body.matches(":disabled")).toBe(false);
    expect(title.value).toBe("My article");
    expect(body.value).toBe("The original article text.");
    expect(saved).not.toHaveBeenCalled();
    act(() => saveButton().click());
    expect(mutation.inputs).toHaveLength(2);
  });
});
