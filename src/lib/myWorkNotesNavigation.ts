export const TEACHING_NOTE_TYPES = ['note', 'session_recap', 'announcement', 'smartboard_recap'] as const;
export type TeachingNoteType = typeof TEACHING_NOTE_TYPES[number];
export function archiveNoteType(value: string | null): TeachingNoteType | '' {
  return TEACHING_NOTE_TYPES.includes(value as TeachingNoteType) ? value as TeachingNoteType : '';
}

/** Only archive state may cross the detail-page return boundary. */
export function validateNotesReturnTo(value: string | null | undefined): string {
  const fallback = "/my-work/notes";
  if (!value || !value.startsWith("/my-work/notes") || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname !== fallback) return fallback;
    const params = new URLSearchParams();
    if (url.searchParams.has("q")) params.set("q", url.searchParams.get("q")!.slice(0, 500));
    if (url.searchParams.get("filter") === "unread") params.set("filter", "unread");
    const type = archiveNoteType(url.searchParams.get("type"));
    if (type) params.set("type", type);
    const shown = url.searchParams.get("shown");
    if (shown && /^\d+$/.test(shown) && Number(shown) >= 12 && Number(shown) <= 10000) params.set("shown", String(Number(shown)));
    return fallback + (params.toString() ? `?${params}` : "");
  } catch { return fallback; }
}

export function notesDetailRoute(itemId: string, returnTo?: string | null): string {
  return `/classroom/item/${encodeURIComponent(itemId)}?${new URLSearchParams({ returnTo: validateNotesReturnTo(returnTo) })}`;
}

export type NotesArchiveOrigin = { id: string; returnTo: string };

/** Carry only an archive's explicit origin through its reader chain. */
export function notesArchiveOrigin(state: unknown, returnTo: string): NotesArchiveOrigin | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const origin = (state as { notesArchiveOrigin?: unknown }).notesArchiveOrigin;
  if (!origin || typeof origin !== 'object' || Array.isArray(origin)) return null;
  const { id, returnTo: path } = origin as Partial<NotesArchiveOrigin>;
  if (typeof id !== 'string' || !id || id.length > 500 || /[\r\n]/.test(id) || typeof path !== 'string') return null;
  if (path !== validateNotesReturnTo(path) || path !== validateNotesReturnTo(returnTo)) return null;
  return { id, returnTo: path };
}
