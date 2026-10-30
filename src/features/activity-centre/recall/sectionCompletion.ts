import { completeSectionRun } from "../api/activitiesClient";
import { supabase } from "@/integrations/supabase/client";

export interface PendingSectionCompletion {
  assignmentId: string;
  studentId: string;
  audioPath: string;
  attemptNo: number;
  itemOrders: number[];
}

const keyFor = (assignmentId: string, studentId: string) => `rrc:completion:${studentId}:${assignmentId}`;

/** Finished-take intent. Account evidence must still be verified before closeout. */
export function keepSectionCompletion(pending: PendingSectionCompletion): void {
  localStorage.setItem(keyFor(pending.assignmentId, pending.studentId), JSON.stringify(pending));
}

export function readSectionCompletion(assignmentId: string, studentId: string): PendingSectionCompletion | null {
  const raw = localStorage.getItem(keyFor(assignmentId, studentId));
  if (!raw) return null;
  const pending = JSON.parse(raw) as PendingSectionCompletion;
  if (pending.assignmentId !== assignmentId || pending.studentId !== studentId ||
      !pending.audioPath || !Number.isInteger(pending.attemptNo) || pending.attemptNo < 1 ||
      !Array.isArray(pending.itemOrders) || pending.itemOrders.length === 0 ||
      !pending.itemOrders.every(Number.isInteger) || new Set(pending.itemOrders).size !== pending.itemOrders.length) {
    throw new Error("The saved section closeout does not match this assignment.");
  }
  return pending;
}

export function requireSectionEvidence(pending: PendingSectionCompletion, rows: unknown[], itemOrders: number[]): void {
  if (pending.itemOrders.length !== itemOrders.length || !itemOrders.every(order => pending.itemOrders.includes(order))) {
    throw new Error("The saved section closeout does not match this section.");
  }
  const saved = new Set(rows.flatMap(value => {
    const row = value as { assignment_id?: string; student_id?: string; item_order?: number; attempt_no?: number; rrc?: { audio_path?: string } };
    return row.assignment_id === pending.assignmentId && row.student_id === pending.studentId &&
      row.attempt_no === pending.attemptNo && row.rrc?.audio_path === pending.audioPath ? [row.item_order] : [];
  }));
  if (!pending.itemOrders.every(order => saved.has(order))) {
    throw new Error("Some saved section answers could not be verified. Retry loading.");
  }
}

export async function requireSectionRecording(pending: PendingSectionCompletion): Promise<void> {
  const split = pending.audioPath.lastIndexOf("/");
  if (split < 1) throw new Error("The saved recording path is unavailable.");
  const filename = pending.audioPath.slice(split + 1);
  const { data, error } = await supabase.storage.from("drill-recordings")
    .list(pending.audioPath.slice(0, split), { search: filename, limit: 100 });
  if (error) throw error;
  if (!data?.some(file => file.name === filename && file.id)) {
    throw new Error("Your section recording has not reached your account yet.");
  }
}

/** Retry status alone; recordings and append-only responses are never replayed. */
export async function acknowledgeSectionCompletion(assignmentId: string, studentId: string): Promise<void> {
  await completeSectionRun(assignmentId);
  localStorage.removeItem(keyFor(assignmentId, studentId));
}
