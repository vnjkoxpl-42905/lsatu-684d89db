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
    const shown = url.searchParams.get("shown");
    if (shown && /^\d+$/.test(shown) && Number(shown) >= 12 && Number(shown) <= 10000) params.set("shown", String(Number(shown)));
    return fallback + (params.size ? `?${params}` : "");
  } catch { return fallback; }
}

export function notesDetailRoute(itemId: string, returnTo?: string | null): string {
  return `/classroom/item/${encodeURIComponent(itemId)}?${new URLSearchParams({ returnTo: validateNotesReturnTo(returnTo) })}`;
}
