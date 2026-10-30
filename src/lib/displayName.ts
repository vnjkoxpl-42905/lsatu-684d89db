/**
 * Canonical formatter for participant names across messaging surfaces.
 * Per project rule (CLAUDE.md): the instructor is displayed as "Joshua",
 * not the full DB display_name "Joshua Fisseha". Students show their real name.
 */
export function formatParticipantName(
  displayName: string | null | undefined,
  isAdmin?: boolean
): string {
  if (isAdmin) return 'Joshua';
  const trimmed = displayName?.trim();
  return trimmed || 'User';
}

export function formatFirstName(
  displayName: string | null | undefined,
  fallback = 'Student'
): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return fallback;

  const firstToken = trimmed.split(/[\s._-]+/).find(Boolean);
  if (!firstToken) return fallback;

  const cleaned = firstToken.replace(/[^a-zA-Z]/g, '');
  if (!cleaned) return fallback;

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
