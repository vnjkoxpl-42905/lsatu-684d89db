import { describe, expect, it } from "vitest";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import type { StudentAssignment } from "@/hooks/useStudentAssignments";
import {
  buildWorkRows,
  classroomNotes,
  groupNotes,
  isNoteUnread,
  unreadNoteCount,
  sanitizeClassroomHtml,
  DAY_ZERO_WELCOME_SOURCE_ID,
  DAY_ZERO_WELCOME_SOURCE_TABLE,
} from "./classroomData";

const baseItem: ClassroomItem = {
  id: "item-1",
  student_id: "student",
  class_id: null,
  created_by: "admin",
  type: "homework",
  title: "Homework",
  description: null,
  content_html: null,
  content_markdown: null,
  source_table: "homework_assignments",
  source_id: "shared-id",
  status: "assigned",
  unlock_at: null,
  due_at: null,
  completed_at: null,
  priority: 0,
  visible_to_student: true,
  metadata_json: {},
  created_at: "2026-07-26T12:00:00Z",
  updated_at: "2026-07-26T12:00:00Z",
};

it("dedupes work by the complete source pair", () => {
  const homework = [{
    id: "shared-id",
    set_title: "Duplicate source row",
    status: "assigned",
    created_at: "2026-07-25T12:00:00Z",
  }] as StudentAssignment[];

  const ta = [{
    id: "shared-id",
    title: "Different table, same id",
    status: "assigned",
    assigned_at: "2026-07-24T12:00:00Z",
  }];

  const rows = buildWorkRows([baseItem], homework, ta as never);
  expect(rows.map((row) => row.key)).toEqual([
    "homework_assignments:shared-id",
    "ta_assignments:shared-id",
  ]);
});

describe("classroomNotes", () => {
  it("removes the day-zero welcome marker but keeps ordinary notes", () => {
    const welcome = {
      ...baseItem,
      id: "welcome",
      type: "note",
      source_table: DAY_ZERO_WELCOME_SOURCE_TABLE,
      source_id: DAY_ZERO_WELCOME_SOURCE_ID,
    } as ClassroomItem;
    const note = {
      ...baseItem,
      id: "note",
      type: "note",
      source_table: null,
      source_id: null,
    } as ClassroomItem;

    expect(classroomNotes([welcome, note])).toEqual([note]);
  });
});

describe("note read state", () => {
  const note = (id: string, read: boolean, created_at: string, status = "assigned") =>
    ({
      id,
      type: "note",
      title: id,
      status,
      created_at,
      source_table: null,
      source_id: null,
      metadata_json: read ? { kind: "note", read_at: created_at } : { kind: "note" },
    }) as never;

  it("treats an unopened note as unread and an opened one as read", () => {
    expect(isNoteUnread(note("a", false, "2026-08-19T00:00:00Z"))).toBe(true);
    expect(isNoteUnread(note("b", true, "2026-08-19T00:00:00Z"))).toBe(false);
    // marked done is read by definition, whatever the metadata says
    expect(isNoteUnread(note("c", false, "2026-08-19T00:00:00Z", "completed"))).toBe(false);
  });

  it("groups unread before read, each newest first", () => {
    const items = [
      note("old-read", true, "2026-08-01T00:00:00Z"),
      note("new-unread", false, "2026-08-19T00:00:00Z"),
      note("new-read", true, "2026-08-18T00:00:00Z"),
      note("old-unread", false, "2026-08-02T00:00:00Z"),
    ];
    const { unread, read } = groupNotes(items);
    expect(unread.map((n) => n.id)).toEqual(["new-unread", "old-unread"]);
    expect(read.map((n) => n.id)).toEqual(["new-read", "old-read"]);
    expect(unreadNoteCount(items)).toBe(2);
  });

  it("does not count the day-zero welcome as an unread note", () => {
    const welcome = {
      id: "w",
      type: "note",
      title: "Welcome",
      status: "assigned",
      created_at: "2026-08-19T00:00:00Z",
      source_table: DAY_ZERO_WELCOME_SOURCE_TABLE,
      source_id: DAY_ZERO_WELCOME_SOURCE_ID,
      metadata_json: {},
    } as never;
    expect(unreadNoteCount([welcome])).toBe(0);
  });
});

describe("sanitizeClassroomHtml", () => {
  it("keeps a <style> block that opens the note", () => {
    // The parser hoists a document-opening <style> into <head>, which DOMPurify
    // then throws away. Without the wrapper this returns markup with no design.
    const clean = sanitizeClassroomHtml(
      "<style>.cl-note{color:red}</style><div class=\"cl-note\">Hi</div>",
    );
    expect(clean).toContain("<style>.cl-note{color:red}</style>");
    expect(clean).toContain("Hi");
  });

  it("does not leave its parse wrapper in the output", () => {
    expect(sanitizeClassroomHtml("<p>Hi</p>")).toBe("<p>Hi</p>");
  });

  it("keeps the at-rules a self-contained design needs", () => {
    const css =
      "@media (prefers-color-scheme:dark){.a{color:#fff}}@keyframes k{to{opacity:1}}";
    expect(sanitizeClassroomHtml(`<style>${css}</style><p>x</p>`)).toContain(css);
  });

  it("still blocks scripts and event handlers", () => {
    const clean = sanitizeClassroomHtml(
      '<script>window.x=1</script><button onclick="alert(1)">b</button>',
    );
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
  });

  it("still lazy-loads images", () => {
    expect(sanitizeClassroomHtml('<img src="https://x/y.png">')).toContain(
      'loading="lazy"',
    );
  });
});
