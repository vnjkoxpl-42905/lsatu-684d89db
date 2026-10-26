// Shared localStorage key scheme for per-question drill notes. Used by both the
// floating DrillNotepad and the docked DrillNotesPanel so a note written in one
// surface is visible in the other.

import { mirroredSetItem, mirroredRemoveItem } from "@/lib/cloudMirror";

const STORAGE_PREFIX = "drill-notepad:";
const GLOBAL_KEY = `${STORAGE_PREFIX}global`;

/** Returns the localStorage key for a question's notes, or the shared global pad. */
export function notesKeyFor(qid: string | null): string {
  return qid ? `${STORAGE_PREFIX}q:${qid}` : GLOBAL_KEY;
}

/** Read a question's notes, tolerant of storage being unavailable. */
export function readDrillNotes(qid: string | null): string {
  try {
    return localStorage.getItem(notesKeyFor(qid)) ?? "";
  } catch {
    return "";
  }
}

/** Persist (or clear, when empty) a question's notes. Mirrored to the cloud. */
export function writeDrillNotes(qid: string | null, value: string): void {
  try {
    const k = notesKeyFor(qid);
    if (value) mirroredSetItem(k, value);
    else mirroredRemoveItem(k);
  } catch {
    /* ignore quota/availability errors */
  }
}
