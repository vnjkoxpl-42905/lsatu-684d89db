// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { EReader } from "./EReader";
import { DEFAULT_PREFERENCES } from "../lib/constants";
import { buildTextModel } from "../lib/spreeder";

let root: Root;
let node: HTMLDivElement;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { if (root) act(() => root.unmount()); node?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("eReader resume after column measurement", () => {
  it("restores the saved word's page before emitting any page-zero progress", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(2144);
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
      return Math.floor(Number(this.dataset.word ?? 0) / 60) * 548;
    });
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const positions = vi.fn();
    const words = buildTextModel(Array.from({ length: 240 }, (_, i) => `word${i}`).join(" ")).words;
    function RestoredReader() {
      const [page, setPage] = useState(0);
      return <EReader prefs={{ ...DEFAULT_PREFERENCES, reading_mode: "ereader" }} fontStack="Arial" words={words} page={page} initialWord={180} onResumePage={setPage} onPageCount={() => {}} onPageWord={positions} highlight={[]} onWordClick={() => {}} />;
    }
    node = document.createElement("div"); document.body.append(node);
    root = createRoot(node);
    await act(async () => root.render(<RestoredReader />));
    expect(positions).toHaveBeenCalledWith(180, 240);
    expect(positions.mock.calls.every(([word]) => word === 180)).toBe(true);
    expect(document.getElementById("onePage")?.scrollLeft).toBe(1644);
  });
});
