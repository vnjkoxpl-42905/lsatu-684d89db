import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StudyAidsControls from "./StudyAidsControls";

const base = { onToggleBookmark: () => {}, bookmarks: [], onRemoveBookmark: () => {}, hasMarks: false, deviceSaved: true };

describe("bookmark toggle", () => {
  it("fills the bookmark blue when on, with no checkmark", () => {
    const { getByRole } = render(<StudyAidsControls {...base} bookmarked />);
    const btn = getByRole("button", { name: "Remove bookmark" });
    const svg = btn.querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("fill-current");
    expect(svg.getAttribute("class")).toContain("lucide-bookmark");
    expect(svg.getAttribute("class")).not.toContain("check");
    expect(btn.className).toContain("text-sky-800");
  });
  it("is an outline when off", () => {
    const { getByRole } = render(<StudyAidsControls {...base} bookmarked={false} />);
    const svg = getByRole("button", { name: "Bookmark question" }).querySelector("svg")!;
    expect(svg.getAttribute("class")).not.toContain("fill-current");
  });
});
