export interface PostSessionTask {
  id: string;
  revision: number;
  student_id: string | null;
  student_name: string | null;
  source_title: string;
  starts_at: string;
  ends_at: string;
  source_state: "ended" | "rescheduled" | "cancelled" | "unavailable";
  match_state: "matched" | "needs_match";
  transcript_doc_id: string | null;
  transcript_source: "auto" | "manual" | null;
  transcript_status: "linked" | "waiting" | "needs_review";
  drive_folder_url: string | null;
  local_slug: string | null;
  recap_done: boolean;
  recap_posted?: boolean;
  notes_done: boolean;
  work_assigned: boolean;
  handled_at: string | null;
  blocker?: string | null;
  kind?: "session" | "consultation";
}
export interface PostSessionSettings {
  enabled: boolean;
  activation_cutoff: string;
  last_success_at: string | null;
  last_error: string | null;
  drive_root_url: string | null;
  catching_up: boolean;
}
export interface PostSessionSnapshot {
  settings: PostSessionSettings | null;
  tasks: PostSessionTask[];
  handled: PostSessionTask[];
  total?: number;
  handled_total?: number;
  student_counts?: {
    student_id: string;
    total: number;
    handled: number;
    blocked: number;
  }[];
}
export type PostSessionAction =
  | "handle"
  | "reopen"
  | "checklist"
  | "attach_transcript"
  | "match_student"
  | "blocker"
  | "recap_posted";
export interface PostSessionChange {
  action: PostSessionAction;
  field?: "recap_done" | "notes_done" | "work_assigned" | string;
  value?: boolean;
  docId?: string;
  studentId?: string;
}
export interface PostSessionHomeState {
  state: "loading" | "ready" | "setup" | "error";
  data?: PostSessionSnapshot;
  refreshFailed?: boolean;
  error?: string;
  savingId?: string | null;
  retry?: () => void;
  update?: (task: PostSessionTask, change: PostSessionChange) => Promise<void>;
}
const DOC_ID = /^[a-zA-Z0-9_-]{10,200}$/;
export function transcriptIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "docs.google.com" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    const match =
      /^\/document\/d\/([a-zA-Z0-9_-]+)(?:\/edit|\/view|\/preview)?\/?$/.exec(
        url.pathname,
      );
    return match && DOC_ID.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}
export const transcriptUrl = (id: string | null) =>
  id && DOC_ID.test(id)
    ? `https://docs.google.com/document/d/${id}/edit`
    : null;
export function safeDriveFolderUrl(value: string | null): string | null {
  try {
    const url = new URL(value ?? "");
    if (
      url.protocol !== "https:" ||
      url.hostname !== "drive.google.com" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    const match = /^\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)\/?$/.exec(
      url.pathname,
    );
    return match && DOC_ID.test(match[1])
      ? `https://drive.google.com/drive/folders/${match[1]}`
      : null;
  } catch {
    return null;
  }
}
export function calendarCheckIsStale(
  settings: PostSessionSettings,
  now = Date.now(),
): boolean {
  const checked = Date.parse(settings.last_success_at ?? "");
  return !Number.isFinite(checked) || now - checked > 20 * 60 * 1000;
}
export function postSessionLede(work?: PostSessionHomeState): string | null {
  if (!work || work.state !== "ready" || !work.data?.settings) return null;
  const count = work.data.total ?? work.data.tasks.length;
  if (!work.data.settings.enabled)
    return "Automatic updates are paused. Your saved follow-up work is below.";
  if (work.refreshFailed)
    return `${count} ${count === 1 ? "session was" : "sessions were"} waiting when your work list last loaded.`;
  if (work.data.settings.last_error)
    return "Your calendar needs attention. New follow-up work may be missing.";
  if (work.data.settings.catching_up)
    return "Your work list is catching up on calendar changes.";
  if (!work.data.settings.last_success_at)
    return "Waiting for the first calendar check.";
  if (calendarCheckIsStale(work.data.settings))
    return "Calendar updates are delayed. New follow-up work may be missing.";
  return count
    ? `${count} ${count === 1 ? "session needs" : "sessions need"} your follow-up.`
    : "Your after-session work is up to date.";
}
