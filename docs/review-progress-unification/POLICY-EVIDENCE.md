# Current policy and release evidence

Checked on 2026-10-28 through the free Lovable query_database tool against project53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76. All queries were SELECT-only; no policy, role, record or schema changed. Detailed current pg_policies/pg_class receipt is preserved in the vault plan folder implementation-evidence/current-select-policies.json. This is a privileged metadata read, not an executed student-role session.

## Current read paths

RLS is enabled on rc_attempts, rc_drill_sessions, practice_test_runs and section_history. RC attempts and sessions each have a public own-row policy requiring auth.uid()=user_id. PracticeTest runs have pt_runs_owner_select requiring user_id=auth.uid(). Section history authenticated SELECT requires class_id=auth.uid()::text. Separate admins_read policies use has_role(auth.uid(), admin); executor-only policies exist for timed_pt_executor/timed_section_executor. UI loaders still explicitly bind owner IDs even when an administrator can read broadly. No front-end capability treats a link or selected-student label as authorization.

## Downstream RC release checks

src/features/rc/api/rcProtectedRelease.ts assertRcParentReleased first rejects session.userId != actorId. A PT child then reads the specific parent id with user_id=actorId and requires status=complete; read failure, missing/wrong owner or unfinished parent throws. src/features/rc/lib/rcResultsReveal.ts canRevealRcResults requires session.status=completed. PT children additionally require parentReleased=true; completed standalone timed sections follow their existing rule; ordinary drills require a parseable config.resultsRevealedAt. The first-answer adapter must reserve withheld chronological identity without exposing its outcome or promoting a later repeat.

## PrepTest destination checks

The new resolver must require explicit stored run/leg/question provenance and a completed owned parent, then preserve PracticeTestRunGate and the ScoreReport/player owner/release checks. Practice access is not inferred from analytics. Exact RC/PT capabilities remain unavailable when provenance, ownership, release or permission is missing. Relevant adapter/resolver/player guard regressions must pass before completion is claimed.

## Proof boundaries

A current policy expression and actual downstream guard source establish the configured read/release path. Wrong actor and protected-parent behavior require focused regression execution recorded in the final verification report. No separate live student login or impersonation was performed. The existing teacher session can supply additional owned-route readback; it does not establish student-role acceptance.


## Enabling evidence

Current pg_roles readback also confirmed authenticated and anon both have rolbypassrls=false and neither is a member of timed_pt_executor or timed_section_executor. The host independently passed 384 tests across 40 files, including owner, protected-parent, completed-parent, results-reveal, capability and actual-source replay regressions. Exact capability flags are enabled through the dated PROGRESS_POLICY_EVIDENCE attestation for personal Progress, still subject to owner, permission, explicit provenance and released-answer resolution.

This uses the plan's documented-current-policy-and-downstream-guard evidence path. It does not claim a live wrong-actor or protected-parent student-role execution. A normal existing student login showed its own Progress record (4 of 7 LR first answers in the selected period) and queue, separate from the teacher account. On the teacher account, exact RC review opened the stored session and question, and a completed PrepTest link opened the stored run, leg and question in its score report. Both returned to the selected queue item. These readbacks supplement the policy metadata and regressions; they do not broaden authorization.
