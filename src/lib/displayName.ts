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
