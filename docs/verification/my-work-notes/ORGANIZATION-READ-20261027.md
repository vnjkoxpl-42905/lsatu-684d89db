# My Work organization and read-state release

User authorized push to main on 2026-10-27, including unread/read behavior across note and conversation entry points.

## Behavior

- One Teaching notes heading; independent exact-type/search/unread filters with predictive counts and preserved return state; visible month groups and concise accessible link names.
- Assigned work grouped by reliable progress, with evidence-backed subjects, real assigned/due dates and all assignment identities preserved.
- Note read writes authenticate and scope to the recipient, verify the persisted row, then reconcile account-keyed note/notification caches even after quick Back. Teacher previews cannot mark a student's note read. Focus refresh and recipient-filtered subscriptions are installed.
- Messages acknowledge successfully loaded incoming records only when the thread is visible, focused and at the bottom. Failed/background loads and newer unseen messages are not acknowledged. Participant read timestamps advance monotonically and zero-row writes require verification.
- Account/thread/request guards prevent older loads from replacing newer state. Message history and unread projection are paginated.
- Incoming-message badge counts use bounded exact-count batches with each conversation's own read timestamp. Notification totals use an exact recipient count independent of the latest 30 displayed alerts.
- Exact-conversation alert links and corner-bubble navigation open the intended thread. Alert cleanup snapshots recipient/thread IDs, checks the earliest unseen message and preserves newer/unseen alerts. Read events refresh shared counters and receipt consumers.

## Verification

Broad regression run: 129 tests across 17 files passed. Follow-up badge/shared-cache suite: 15 tests passed, including delayed alert creation, unseen-arrival preservation and boundary-query failure. Focused note suite: 24 tests across four files passed. Tests cover deferred loads, quick Back, account/thread changes, no-row writes, recipient isolation, pagination and failed reads. Final typecheck and production build are release gates run by the host.

Previous organization renders cover all three views at seven widths, 320 through 1441 CSS pixels, without overflow; Notes and Assigned work also fit 200% root text at390px. Source decisions and images live in the shared design folder `design/reviews/my-work-organization-20261027/REPORT.md` in AI OS. Synthetic fixture adapters do not prove real student persistence/RLS.

## Limits

No schema, RLS policy, database publication or Edge Function changes. Delivery of the new classroom-items realtime subscription is not independently established; another open session refreshes on focus/refetch regardless. Legacy generic message notification links lack a safe thread identity and are left untouched by thread-wide cleanup; explicit notification clicks can still mark those individual alerts read. Live release verification uses the signed-in operator account, not impersonated student accounts. Existing large-bundle warnings remain.
