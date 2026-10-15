// Match get_student_booking: usable access first, then recoverable passes.
export function selectStudentBookingPass<T extends { status: string; created_at: string }>(passes: T[]): T | null {
  const rank: Record<string, number> = { active: 0, paused: 1, exhausted: 2, expired: 3 };
  return [...passes].sort((a, b) =>
    (rank[a.status] ?? 4) - (rank[b.status] ?? 4)
    || Date.parse(b.created_at) - Date.parse(a.created_at),
  )[0] ?? null;
}
