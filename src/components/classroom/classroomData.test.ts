import { describe, expect, it } from "vitest";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import type { StudentAssignment } from "@/hooks/useStudentAssignments";
import {
  buildWorkRows,
  classroomNotes,
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
