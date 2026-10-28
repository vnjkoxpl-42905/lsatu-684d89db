import { supabase } from "@/integrations/supabase/client";
import type { RecapRow } from "./attempts";
const table = (name: string): any => (supabase as any).from(name);
export interface CaptureRow { id: string; student_id: string; attempt_id: string; recording_state: "pending" | "saved" | "failed"; object_path: string | null; mime_type: string | null; duration_ms: number | null }
export interface CaptureRecap extends RecapRow { capture_id?: string | null; recall_start_ms?: number | null; recall_end_ms?: number | null }
export async function createCapture(id: string, studentId: string, attemptId: string, mimeType: string): Promise<CaptureRow> {
  const row = { id, student_id: studentId, attempt_id: attemptId, recording_state: "pending", mime_type: mimeType };
  const { data, error } = await table("rc_recall_captures").insert(row).select().single();
  if (!error && data) return data;
  const prior = await table("rc_recall_captures").select("*").eq("id", id).eq("student_id", studentId).maybeSingle();
  if (prior.error || !prior.data || prior.data.attempt_id !== attemptId || prior.data.student_id !== studentId) throw error || prior.error || new Error("Capture could not be saved.");
  return prior.data;
}
export async function saveCaptureWindow(input: { id: string; studentId: string; attemptId: string; captureId: string; recapKey: string; passagePosition: number; kind: "recall" | "passage_recap"; startMs: number; endMs: number }): Promise<CaptureRecap> {
  const row = { id: input.id, student_id: input.studentId, attempt_id: input.attemptId, capture_id: input.captureId, recap_key: input.recapKey, passage_position: input.passagePosition, kind: input.kind, voice: "spoken", recording_state: "pending", recall_start_ms: input.startMs, recall_end_ms: input.endMs };
  const { data, error } = await table("rc_recall_recaps").insert(row).select().single();
  if (!error && data) return data;
  const prior = await table("rc_recall_recaps").select("*").eq("id", input.id).eq("student_id", input.studentId).maybeSingle();
  if (prior.error || !prior.data || prior.data.attempt_id !== input.attemptId || prior.data.student_id !== input.studentId || prior.data.capture_id !== input.captureId || prior.data.recap_key !== input.recapKey || prior.data.recall_start_ms !== input.startMs || prior.data.recall_end_ms !== input.endMs) throw error || prior.error || new Error("Recall timing could not be saved.");
  return prior.data;
}
export async function uploadCapture(input: { studentId: string; attemptId: string; captureId: string; path: string; blob: Blob; mimeType: string; durationMs: number }): Promise<void> {
  if (!input.blob.size || input.blob.size > 50 * 1024 * 1024 || !Number.isInteger(input.durationMs) || input.durationMs <= 0 || input.durationMs > 7200000) throw new Error("This recording exceeds the two-hour or 50 MB recording limit. The copy remains on this device for download.");
  const prior = await table("rc_recall_captures").select("*").eq("id", input.captureId).eq("student_id", input.studentId).maybeSingle();
  if (prior.error || !prior.data || prior.data.attempt_id !== input.attemptId) throw prior.error || new Error("The capture could not be verified.");
  if (prior.data.recording_state === "saved") { if (prior.data.object_path !== input.path) throw new Error("The saved capture does not match."); return; }
  const storage = supabase.storage.from("rc-recall-recordings");
  const uploaded = await storage.upload(input.path, input.blob, { contentType: input.mimeType, upsert: false });
  if (uploaded.error) {
    const split = input.path.lastIndexOf("/");
    const listed = await storage.list(input.path.slice(0, split), { search: input.path.slice(split + 1), limit: 100 });
    if (listed.error || !listed.data?.some((file) => file.name === input.path.slice(split + 1) && file.id)) throw uploaded.error;
  }
  const saved = await table("rc_recall_captures").update({ recording_state: "saved", object_path: input.path, mime_type: input.mimeType, duration_ms: input.durationMs }).eq("id", input.captureId).eq("student_id", input.studentId).select().single();
  const verified = saved.error ? await table("rc_recall_captures").select("*").eq("id", input.captureId).eq("student_id", input.studentId).maybeSingle() : saved;
  if (verified.error || verified.data?.recording_state !== "saved" || verified.data?.object_path !== input.path) throw saved.error || verified.error || new Error("Capture upload could not be confirmed.");
}

/** Resolve a private recording only after checking its owner and attempt. */
export async function getCaptureRecordingUrl(studentId: string, recap: CaptureRecap, options: { download?: boolean } = {}): Promise<{ url: string; startSeconds: number; endSeconds: number }> {
  if (!recap.capture_id || recap.recall_start_ms == null || recap.recall_end_ms == null) throw new Error("Recall recording timing is unavailable.");
  const result = await table("rc_recall_captures").select("*").eq("id", recap.capture_id).eq("student_id", studentId).maybeSingle();
  const row = result.data as CaptureRow | null;
  if (result.error || !row || row.student_id !== studentId || row.attempt_id !== recap.attempt_id || row.recording_state !== "saved" || !row.object_path?.startsWith(`${studentId}/${recap.attempt_id}/capture-${row.id}-`) || !row.duration_ms || recap.recall_start_ms < 0 || recap.recall_end_ms <= recap.recall_start_ms || recap.recall_end_ms > row.duration_ms) throw new Error("This recording could not be verified.");
  const signed = await supabase.storage.from("rc-recall-recordings").createSignedUrl(row.object_path, 300, options.download ? { download: true } : undefined);
  if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("This recording could not be opened.");
  return { url: signed.data.signedUrl, startSeconds: recap.recall_start_ms / 1000, endSeconds: recap.recall_end_ms / 1000 };
}
