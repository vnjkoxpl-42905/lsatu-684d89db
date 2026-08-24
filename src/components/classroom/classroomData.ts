import DOMPurify from "dompurify";
import type { ClassroomItem } from "@/hooks/useClassroomItems";
import { isReadInMetadata } from "@/lib/markNoteRead";
import type {
  StudentAssignment,
  StudentTAAssignment,
} from "@/hooks/useStudentAssignments";

export const DAY_ZERO_WELCOME_SOURCE_TABLE = "profiles";
export const DAY_ZERO_WELCOME_SOURCE_ID = "day-0-welcome";

export const NOTE_TYPES = new Set<ClassroomItem["type"]>([
  "note",
  "session_recap",
  "announcement",
  "smartboard_recap",
]);

/**
 * Classroom notes and assignments are authored ONLY by the teacher/admin, never
 * by students. Nothing a student types is ever rendered as HTML anywhere in the
 * app (messages and free responses render as React text, which escapes), so this
 * sanitizer is not what protects the teacher from students.
 *
 * <style> is therefore allowed: it lets an authored note carry its own design as
 * a self-contained file, which is how the rest of the app already treats teacher
 * content (every bootcamp lesson renders its HTML raw).
 *
 * <script> stays blocked. That is the one that could steal a session, and there
 * is no authoring reason to want it.
 */
export function sanitizeClassroomHtml(html: string) {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ["loading", "sizes", "srcset"],
    ADD_TAGS: ["style"],
    FORBID_TAGS: ["script"],
  });
  if (typeof document === "undefined") return sanitized;
  const template = document.createElement("template");
  template.innerHTML = sanitized;
  template.content.querySelectorAll("img").forEach((image) => {
    image.setAttribute("loading", "lazy");
    image.setAttribute("sizes", "(min-width: 720px) 720px");
    if (!image.getAttribute("srcset") && image.getAttribute("src")) {
      image.setAttribute("srcset", `${image.getAttribute("src")} 720w`);
    }
  });
  return template.innerHTML;
}

export function isDayZeroWelcome(item: ClassroomItem) {
  return (
    item.source_table === DAY_ZERO_WELCOME_SOURCE_TABLE &&
    item.source_id === DAY_ZERO_WELCOME_SOURCE_ID
  );
}

export function classroomNotes(items: ClassroomItem[]) {
  return items.filter((item) => NOTE_TYPES.has(item.type) && !isDayZeroWelcome(item));
}

/**
 * A note is unread until it has been opened. `markNoteRead` stamps
 * `metadata_json.read_at` on first open.
 *
 * Read state deliberately does not live in `status`: the database's
 * classroom_items_status_check rejects the 'started' value the type declares,
 * and the remaining allowed values all mean something about work rather than
 * about reading. See src/lib/markNoteRead.ts.
 */
export function isNoteUnread(item: ClassroomItem) {
  return !isReadInMetadata(item);
}

export function unreadNoteCount(items: ClassroomItem[]) {
  return classroomNotes(items).filter(isNoteUnread).length;
}

/**
 * Notes split into unread and read, each newest first.
 *
 * Unread come first because the reason to open this page is almost always a
 * note that just arrived. Within each group the sort is by created_at rather
 * than the list's incoming order, which is priority-then-due_at and means
 * nothing for a note.
 */
export function groupNotes(items: ClassroomItem[]) {
  const notes = [...classroomNotes(items)].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  return {
    unread: notes.filter(isNoteUnread),
    read: notes.filter((note) => !isNoteUnread(note)),
  };
}

export type ClassroomWorkRow = {
  key: string;
  sourceTable: string;
  sourceId: string;
  title: string;
  status: string;
  date: string;
  route: string;
  classroomItem?: ClassroomItem;
};

function itemDate(item: ClassroomItem) {
  return item.due_at ?? item.unlock_at ?? item.created_at;
}

/**
 * DEAD as of 2026-08-03 — no runtime caller. `useAssignedTodoFeed` is now the
 * single source for "what is assigned to me"; this builder read only
 * classroom_items + homework + TA, so it could never see guided drills or
 * activity assignments, which is what left the two feeds disjoint. Kept for
 * now rather than deleted; remove once nothing references it.
 *
 * Classroom items are the preferred representation. Source assignments fill
 * gaps, keyed by the complete source pair so ids from unrelated tables cannot
 * collide.
 */
export function buildWorkRows(
  items: ClassroomItem[],
  homework: StudentAssignment[],
  taAssignments: StudentTAAssignment[],
) {
  const rows = new Map<string, ClassroomWorkRow>();

  for (const item of items) {
    if (!["drill", "homework", "activity", "bootcamp_module", "weekly_plan_task"].includes(item.type)) {
      continue;
    }
    const sourceTable = item.source_table ?? "classroom_items";
    const sourceId = item.source_id ?? item.id;
    const key = `${sourceTable}:${sourceId}`;
    rows.set(key, {
      key,
      sourceTable,
      sourceId,
      title: item.title,
      status: item.status,
      date: itemDate(item),
      route: `/classroom/item/${encodeURIComponent(item.id)}`,
      classroomItem: item,
    });
  }

  for (const assignment of homework) {
    const key = `homework_assignments:${assignment.id}`;
    if (rows.has(key)) continue;
    rows.set(key, {
      key,
      sourceTable: "homework_assignments",
      sourceId: assignment.id,
      title: assignment.set_title || "Assigned work",
      status: assignment.status,
      date: assignment.created_at,
      route: `/classroom/${encodeURIComponent(assignment.id)}`,
    });
  }

  for (const assignment of taAssignments) {
    const key = `ta_assignments:${assignment.id}`;
    if (rows.has(key)) continue;
    rows.set(key, {
      key,
      sourceTable: "ta_assignments",
      sourceId: assignment.id,
      title: assignment.title || "Assigned work",
      status: assignment.status,
      date: assignment.assigned_at,
      route: `/classroom/ta/${encodeURIComponent(assignment.id)}`,
    });
  }

  return [...rows.values()].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
