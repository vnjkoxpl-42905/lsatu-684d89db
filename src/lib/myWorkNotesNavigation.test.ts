import { describe, expect, it } from "vitest";
import { notesArchiveOrigin, notesDetailRoute, validateNotesReturnTo } from "./myWorkNotesNavigation";

describe("notes return navigation", () => {
  it('accepts only a canonical matching explicit archive origin', () => {
    const returnTo = '/my-work/notes?q=rule&filter=unread&type=note&shown=24';
    expect(notesArchiveOrigin({ notesArchiveOrigin: { id: 'a', returnTo } }, returnTo)).toEqual({ id: 'a', returnTo });
    expect(notesArchiveOrigin({ notesArchiveOrigin: { id: 'a', returnTo } }, '/my-work/notes')).toBeNull();
    expect(notesArchiveOrigin({ notesArchiveOrigin: { id: 'a', returnTo: 'https://evil.test' } }, '/my-work/notes')).toBeNull();
    expect(notesArchiveOrigin({ notesArchiveOrigin: { id: true, returnTo } }, returnTo)).toBeNull();
    expect(notesArchiveOrigin({ notesArchiveOrigin: { id: 'a', returnTo: '/my-work/notes?view=mine' } }, '/my-work/notes')).toBeNull();
    expect(notesArchiveOrigin(null, returnTo)).toBeNull();
  });
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
  it('preserves only exact teaching-note types at the return boundary', () => {
    expect(validateNotesReturnTo('/my-work/notes?q=rule&filter=unread&type=session_recap&shown=24')).toBe('/my-work/notes?q=rule&filter=unread&type=session_recap&shown=24');
    expect(validateNotesReturnTo('/my-work/notes?type=made-up')).toBe('/my-work/notes');
    expect(validateNotesReturnTo('/my-work/notes?type=note')).toBe('/my-work/notes?type=note');
  });

});
