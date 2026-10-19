import { parseAddress } from "../api";

function firstName(displayName: string, email: string): string {
  const dn = displayName.trim();
  if (dn && dn !== email) {
    const tok = dn.split(/\s+/)[0];
    return tok.replace(/[,;]$/, "");
  }
  // No display name — use local part before @.
  return email.split("@")[0] || email;
}

/**
 * Build the sender label shown in a thread row.
 *
 * Rules (mirroring Gmail web's observable behavior):
 * - Use first names only.
 * - Replace the admin's own address with "me", preserving chronological position.
 * - Dedup while preserving first-occurrence order.
 * - 1–3 distinct → comma-joined ("A", "A, B", "A, B, C").
 * - 4+ distinct → first + ".." + last ("A, .., D").
 * - When messageCount > 1, append " (N)" so threads with multiple replies are visible.
 */
export function formatSenders(
  rawSenders: string[],
  messageCount: number,
  adminEmail: string | null,
): string {
  if (!rawSenders.length) return "(unknown)";
  const adminLower = adminEmail?.toLowerCase() ?? null;

  const names: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawSenders) {
    const { name, email } = parseAddress(raw);
    const isMe = adminLower !== null && email.toLowerCase() === adminLower;
    const label = isMe ? "me" : firstName(name, email);
    if (!seen.has(label)) {
      seen.add(label);
      names.push(label);
    }
  }

  let line: string;
  if (names.length <= 3) {
    line = names.join(", ");
  } else {
    line = `${names[0]}, .., ${names[names.length - 1]}`;
  }
  if (messageCount > 1) line += ` (${messageCount})`;
  return line;
}
