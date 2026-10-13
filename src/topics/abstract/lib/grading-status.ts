export function isUngradedAttempt(trapTag?: string): boolean {
  return trapTag === "self_check_unverified" || trapTag === "source_exercise_ungraded" || trapTag === "source_breakdown_reviewed";
}

export function sourceExerciseIds(attempts: { drillId: string; trapTag?: string }[]): Set<string> {
  return new Set(attempts.filter((attempt) => attempt.trapTag === "source_exercise_ungraded").map((attempt) => attempt.drillId));
}
