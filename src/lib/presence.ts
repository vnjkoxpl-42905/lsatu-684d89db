import { formatRelativeShort } from "@/lib/time";

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isUserOnline(
  lastSeenAt: string | null | undefined,
  now = Date.now(),
) {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return now - seen <= ONLINE_WINDOW_MS;
}

export function formatLastActiveLabel(
  lastSeenAt: string | null | undefined,
  emptyLabel = "No LSAT U activity yet",
) {
  if (!lastSeenAt) return emptyLabel;
  const relative = formatRelativeShort(lastSeenAt);
  return `Last active ${relative.charAt(0).toLowerCase()}${relative.slice(1)}`;
}
