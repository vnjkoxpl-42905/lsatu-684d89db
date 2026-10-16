/** Position is the zero-based ordinal within this session, not the source item order. */
export function getGeneralPhase(position: number): { number: 1 | 2 | 3; seconds: null | 45 | 30; label: string } {
  if (position < 12) return { number: 1, seconds: null, label: "Phase 1: Untimed" };
  if (position < 37) return { number: 2, seconds: 45, label: "Phase 2: 45 seconds" };
  return { number: 3, seconds: 30, label: "Phase 3: 30 seconds" };
}
