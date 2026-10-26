import { describe, expect, it } from "vitest";
import { notesDetailRoute, validateNotesReturnTo } from "./myWorkNotesNavigation";

describe("notes return navigation", () => {
  it.each([null, "https://evil.test/my-work/notes", "//evil.test/my-work/notes", "/my-work/notes/other", "/my-work/notes/../to-do", "/my-work/notes\\evil", "/classroom"])('rejects %s', value => {
    expect(validateNotesReturnTo(value)).toBe("/my-work/notes");
  });
  it("retains only valid archive state", () => {
    expect(validateNotesReturnTo("/my-work/notes?q=older+body&filter=unread&shown=24&note=private&view=mine#anchor")).toBe("/my-work/notes?q=older+body&filter=unread&shown=24");
    expect(validateNotesReturnTo("/my-work/notes?shown=Infinity&filter=other")).toBe("/my-work/notes");
  });
  it("encodes both item identity and return query", () => {
    const url = new URL(notesDetailRoute("id/1", "/my-work/notes?q=rule&shown=24"), "https://local.invalid");
    expect(url.pathname).toBe("/classroom/item/id%2F1");
    expect(url.searchParams.get("returnTo")).toBe("/my-work/notes?q=rule&shown=24");
  });
});
