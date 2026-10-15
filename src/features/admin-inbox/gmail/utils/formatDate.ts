/**
 * Format a Gmail message timestamp for the thread-row column.
 * Today  → "9:42 AM"
 * This year → "May 13"
 * Older → "5/13/24"
 */
export function formatThreadDate(input: Date | number | string | null | undefined): string {
  if (input == null || input === "") return "";
  const d = typeof input === "number"
    ? new Date(input)
    : typeof input === "string"
      ? new Date(/^\d+$/.test(input) ? Number(input) : input)
      : input;
  if (!d || Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });
}

/** Full-precision timestamp for reading-pane message headers. */
export function formatMessageDate(input: Date | number | string | null | undefined): string {
  if (input == null || input === "") return "";
  const d = typeof input === "number"
    ? new Date(input)
    : typeof input === "string"
      ? new Date(/^\d+$/.test(input) ? Number(input) : input)
      : input;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
