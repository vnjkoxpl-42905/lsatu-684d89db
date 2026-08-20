import { describe, expect, it } from "vitest";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import type { StudentAssignment } from "@/hooks/useStudentAssignments";
import {
  buildWorkRows,
  classroomNotes,
  groupNotes,
  isNoteUnread,
  unreadNoteCount,
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
  const note = (id: string, status: string, created_at: string) =>
    ({
      id,
      type: "note",
      title: id,
      status,
      created_at,
      source_table: null,
      source_id: null,
    }) as never;

  it("treats an unopened note as unread and an opened one as read", () => {
    expect(isNoteUnread(note("a", "assigned", "2026-08-19T00:00:00Z"))).toBe(true);
    expect(isNoteUnread(note("b", "started", "2026-08-19T00:00:00Z"))).toBe(false);
    // marked done is read by definition, never shown as unread again
    expect(isNoteUnread(note("c", "completed", "2026-08-19T00:00:00Z"))).toBe(false);
  });

  it("groups unread before read, each newest first", () => {
    const items = [
      note("old-read", "started", "2026-08-01T00:00:00Z"),
      note("new-unread", "assigned", "2026-08-19T00:00:00Z"),
      note("new-read", "completed", "2026-08-18T00:00:00Z"),
      note("old-unread", "assigned", "2026-08-02T00:00:00Z"),
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
    } as never;
    expect(unreadNoteCount([welcome])).toBe(0);
  });
});
