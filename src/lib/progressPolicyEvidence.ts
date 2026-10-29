/**
 * Configured SELECT policies checked on 2026-10-28, plus owner/release guard
 * regressions. This is policy-source evidence, not a live wrong-actor test.
 * Receipt: docs/review-progress-unification/POLICY-EVIDENCE.md.
 * These attestations never replace the per-answer capability checks.
 */
export const PROGRESS_POLICY_EVIDENCE = Object.freeze({
  checkedOn: '2026-10-28',
  basis: 'current-select-policies-and-downstream-guards',
  rc: true,
  practiceTest: true,
});
