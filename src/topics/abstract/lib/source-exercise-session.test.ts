import { beforeEach, expect, it, vi } from "vitest";
import { emptySourceSession, loadSourceSession, readSourceSession, restoreSourceSession, saveSourceSession, sourceSessionKey } from "./source-exercise-session";
vi.mock("@/lib/cloudMirror", () => ({ mirroredSetItem: vi.fn() }));
beforeEach(() => localStorage.clear());
it("isolates preview and separate accounts", () => {
  const a = { ...emptySourceSession(), index: 4, drafts: { choice_5: { requirements: "A draft", example: "", revealed: false } } };
  expect(saveSourceSession(sourceSessionKey("a"), a)).toBe(true);
  expect(loadSourceSession(sourceSessionKey("a"))?.index).toBe(4);
  expect(loadSourceSession(sourceSessionKey("b"))).toBeNull();
  expect(loadSourceSession(sourceSessionKey())).toBeNull();
});
it("rejects corrupted, outdated and out-of-bounds saved state", () => {
  const base = emptySourceSession();
  for (const value of ["bad json", JSON.stringify({ ...base, version: 0 }), JSON.stringify({ ...base, sourceHash: "old" }), JSON.stringify({ ...base, index: 15 }), JSON.stringify({ ...base, reviewedIds: ["unknown"] }), JSON.stringify({ ...base, drafts: { choice_1: { requirements: 42, example: "", revealed: false } } })]) expect(readSourceSession(value)).toBeNull();
});
it("preserves drafts/current reveal while merging account review and writing separately", () => {
  const saved = { ...emptySourceSession(), index: 2, reviewedIds: ["choice_1"], drafts: { choice_3: { requirements: "unfinished", example: "", revealed: true } } };
  const restored = restoreSourceSession(saved, [{ drillId: "choice_2", trapTag: "source_breakdown_reviewed" }, { drillId: "choice_1", trapTag: "source_exercise_ungraded" }]);
  expect(restored.index).toBe(2); expect(restored.drafts.choice_3.requirements).toBe("unfinished");
  expect(restored.reviewedIds).toEqual(["choice_1", "choice_2"]); expect(restored.practicedIds).toEqual(["choice_1"]);
});
