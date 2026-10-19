import { describe, expect, it } from "vitest";
import { mergePassageMetadata, metadataForEdit, progressPayload, readingCenterKey } from "./persistence";
import type { Passage } from "./types";

const original: Passage = { id: "global", owner_id: null, slug: "shared-text", title: "Teacher title", body: "A shared passage.", author: "Teacher", genre: "Essay", cover_url: "https://example.com/cover.png", word_count: 3, sort_order: 1, is_published: true, created_at: "2026-10-13", updated_at: "2026-10-13" };

describe("Reading Center cloud data boundaries", () => {
  it("isolates every library and passage cache by signed-in account", () => {
    expect(readingCenterKey("student-a", "passages")).not.toEqual(readingCenterKey("student-b", "passages"));
    expect(readingCenterKey("student-a", "passage", "shared-text")).not.toEqual(readingCenterKey("student-b", "passage", "shared-text"));
  });
  it("applies personal text/image/tag edits without changing the teacher original", () => {
    const metadata = { passage_id: original.id, ...metadataForEdit({ title: "My title", body: "My own reading text.", author: null, cover_url: null, tags: ["Practice"] }) };
    const personal = mergePassageMetadata(original, metadata)!;
    expect(personal).toMatchObject({ title: "My title", body: "My own reading text.", author: null, cover_url: null, tags: ["Practice"], word_count: 4, slug: "shared-text" });
    expect(original.title).toBe("Teacher title");
    expect(mergePassageMetadata(original)).toMatchObject({ title: "Teacher title", tags: [] });
  });
  it("removes a shared text only from that student's library", () => {
    expect(mergePassageMetadata(original, { passage_id: original.id, hidden: true })).toBeNull();
    expect(mergePassageMetadata(original)).not.toBeNull();
  });
  it("preserves a finished text when it is opened, and clears completion only on explicit restart", () => {
    expect(progressPayload("student", { passage_id: "global", word_index: 0 })).not.toHaveProperty("completed_at");
    expect(progressPayload("student", { passage_id: "global", word_index: 0, completed: false })).toHaveProperty("completed_at", null);
    expect(progressPayload("student", { passage_id: "global", word_index: 2, completed: true }).completed_at).toEqual(expect.any(String));
  });
});
