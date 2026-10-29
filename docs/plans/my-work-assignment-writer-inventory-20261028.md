# Assignment writer coverage

Frontend inventory, 2026-10-28. No production writes are part of this inventory.

| Writer | Delivery policy and finalization |
|---|---|
| assignWork / assignWorkBundle | Managed per student group before source and mirror writes; suppressed for notify:false. One finalization after writes, outside rollback. Future unlock skips inbox/email. |
| readingCenterAccess | Explicit policy/group passed into assign_reading_center before SQL insertion/reactivation. Reused grant does not resend. |
| classroomItems | Explicit auto default for assignment allowlist; recap/announcement/weekly task suppressed. Managed override for client group writers. SQL inherits native source policy for mirrors. |
| AssignmentBuilder | Managed note group, scheduled unlock guard; recap/announcement uses message channel and suppressed assignment policy. |
| TeacherBootcamps | Managed persisted group, unlock guard. |
| StudentSchedulePanel | Managed note group and unlock guard; recap/announcement uses message channel with suppressed assignment policy. |
| agentActions | Managed note group; assignment resources delegate assignWork/resource writer. Existing messages retain message channel. |
| teacherAssignResource | Delegates native work to assignWork; managed standalone group; reuse does not resend. |
| TA DraftCard | Managed source group before insert; shared finalization, no raw assignment bell insert. |
| publishSessionBundle | One managed group for assignment parts, finalized after posted flags; recaps keep separate message channel. |
| weeklyPlanPublish / useWeeklyPlanPublisher / TeacherWeeklyPlans | Suppressed mirrors share persisted planKey group. Dedicated generic summary RPC after publication, same durable group on retry. No future titles/descriptions/bodies in summary. |
| aiTAQueue | Shared writer explicit type-based policy; notes auto, recaps/announcements suppressed. |
| RecapComposer | Shared writer suppressed session recap. |
| accessTierClient | Practice-test fallback explicitly auto on source upsert/mirror write/reactivation. |

Backend-owned coverage: SQL MCP assignment functions, existing practice-test Edge Function default/compatibility path, version gate, source mirror inheritance and deferred release are verified in migration tests. Notification bell consumes actor-scoped exact mappings and carries canonical identity or explicit workGroup; only unmappable generic legacy alerts acknowledge on click.

Managed writes are bounded to one two-minute student bundle signal across native source and Classroom insert requests. Each fresh-record cleanup request is also bounded, and records are cleaned in parallel across the failed attempt. Managed server recovery waits at least ten minutes and rechecks the current source/publication. Notification finalization remains outside the rollback boundary.
