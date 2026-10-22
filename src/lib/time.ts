/**
 * Canonical relative-time formatter for the entire app.
 *
 * Output samples:
 *   null or ""        -> "Never"
 *   now ± 45s         -> "Just now"
 *   1–59 min ago      -> "3m ago"
 *   1–23 hours        -> "5h ago"
 *   1–6 days          -> "2d ago"
 *   1+ weeks          -> "3w ago"
 *
 * Keep this small and dependency-free so that any surface — admin
 * dashboard, hub left list, overview profile card, notification bell —
 * renders the same shape. If a richer format is needed, pass the value
 * through `date-fns` directly rather than growing this util.
 */
export function formatRelativeShort(iso: string | null | undefined): string {
  if (!iso) return "Never";

  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return "Never";

  const diffMs = Date.now() - when;
  const sec = Math.floor(diffMs / 1000);

  if (sec < 60) return "Just now";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return `${Math.floor(day / 7)}w ago`;
}
