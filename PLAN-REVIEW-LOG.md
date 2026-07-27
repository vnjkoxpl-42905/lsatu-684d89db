# Plan Review Log: Classroom redesign

Act 1 (grill-with-docs) complete — plan locked, spec at `CLASSROOM-DESIGN.md`. MAX_ROUNDS=3.
Act 2 reviewer: Codex `gpt-5.6-terra`, reasoning effort medium, read-only sandbox.

Live-database verification performed before Act 2 via the Lovable connector
(project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`), correcting the spec's
"the data is already there" claim. Findings recorded in `PLAN.md`.

Standing instruction from Joshua: Claude does **not** apply Codex's findings
automatically. Surviving findings are presented for per-item green/red light.

## Round 1 — Codex

Material blockers:

- Moving only `/classroom` outside `StudentShell` leaves `/classroom/uploads`, `/recaps`, item details, and assignment details inside it; Classroom links will abruptly return to the old chrome. Fix: define and move the entire `/classroom/*` route family, or keep all new links within the new page.
- `StudentShell` is currently the onboarding gate; the moved route bypasses its profile-name/onboarding redirect, while `ProtectedRoute allowSignedIn` permits any authenticated user. Fix: add an equivalent onboarding/profile gate around the new full-screen Classroom route.
- The route move does not itself weaken database RLS, but the plan never explicitly preserves the `ProtectedRoute` wrapper. Fix: specify the exact moved route element, retaining `ProtectedRoute flag="has_classroom_access" allowSignedIn` (or deliberately remove `allowSignedIn`).
- The “day-0 guarantee” cannot be implemented from the identified enrollment path: `AuthContext` provisions `students` client-side, and students cannot insert `classroom_items` under its RLS. Fix: add an idempotent privileged database trigger/Edge Function with a defined Joshua author ID and failure handling.
- Seeding at every auth signup is not equivalent to paid enrollment and could create welcome notes for unauthorized accounts. Fix: seed on the authoritative access-grant/enrollment transition, not `auth.users` creation.
- The seed is not idempotency-specified; retries/concurrent enrollment flows can create duplicate “latest word” notes. Fix: add a unique seed marker/source key plus `ON CONFLICT` behavior.
- “Joshua’s latest word” is underspecified: `useInbox` returns many conversations, and the latest message may be authored by the student. Fix: select a defined Joshua conversation and filter by Joshua/admin `sender_id`, then fall back to the seeded note.
- Query failures would be rendered as absent sections, falsely telling students there is no work, message, or booking. Fix: define loading/error states and telemetry separately from legitimate empty results.
- The scope lock is internally inconsistent: `test_date` capture requires edits to `Onboarding`, `Profile`, likely `src/lib/onboarding`, and regenerated Supabase types—none are in the allowed-file list. Fix: explicitly list every approved file and make generated-type regeneration part of the migration step.
- The test-date feature has no null, invalid, timezone, or past-date behavior, despite the deck depending on “days to test.” Fix: define local-date arithmetic and a truthful no-date/past-date deck state before implementation.
- The repository migration declares `external_work_uploads.extracted_text`, `parsed_json`, and `confidence_score`, while the plan says production lacks them; this is schema drift, not merely a UI limitation. Fix: add a production schema-drift check/migration and regenerate types before relying on upload status or fields.
- `lecture_video` is proposed only in the TypeScript union; the database `classroom_items.type` check constraint will reject it. Fix: include an additive migration updating the constraint, or do not add the type until hosting is implemented.
- “Inline images and GIFs” assumes existing classroom-content storage paths and publicly renderable URLs, neither established by `classroom_items`. Fix: specify the bucket, authorization/signed-URL strategy, and sanitized renderer.
- Rendering `content_html` inline without a mandated sanitizer introduces stored XSS; existing item detail code sanitizes it, but the plan does not carry that rule forward. Fix: require DOMPurify (or equivalent) before every inline HTML render.
- “Drills done” and “consistency/accuracy” need explicit sample thresholds and definitions; the analytics helper has low-sample semantics, but the plan could present misleading charts for one attempt. Fix: reuse `MIN_SAMPLE`/`hasData` rules and omit or label insufficient data.
- “Up next” merges multiple assignment systems but only says to dedupe by source ID; IDs from different tables can collide and the existing sources have distinct unlock/status semantics. Fix: dedupe by `(source_table, source_id)` and define ordering/visibility rules per source.
- The verification plan checks screenshots and typecheck but not RLS for the moved route, seed idempotency, production schema parity, or hook-error states. Fix: add student/admin/unauthenticated E2E cases plus migration and seed integration tests.

VERDICT: REVISE
### Claude's response

Accepted 16 of 17. Independently verified before accepting:
- `classroom_items_type_check` really does exclude `lecture_video` (live DB) — additive migration required or the type must not ship.
- DOMPurify is the established pattern (`ClassroomItem.tsx:61`, `ClassroomTAAssignmentDetail.tsx:98`) — the spec failed to carry it forward.
- `supabase/migrations/20260506000200_external_work_uploads.sql` declares `extracted_text`/`parsed_json`/`confidence_score`; production lacks all three. Confirmed schema drift, not a UI limitation.
- `StudentShell` is indeed the onboarding gate (profile display_name -> /onboarding redirect); moving the route out bypasses it.
- The `/classroom/*` sub-routes (uploads, recaps, item, ta, assignment) all remain in the shell — chrome whiplash confirmed.

Partially rejected: finding 7 attacked a strawman — the plan already said "on enrolment", not on auth signup. The idempotency half of the finding stands and is accepted.

Highest-value finding: 10 (loading/error states rendering as legitimate absence). Combined with the
"empty sections do not render" rule, a failed query would silently tell a student they have no
homework, no message and no booking. That is a correctness bug that would ship invisibly.

## Round 2 — Codex

Several Round 1 issues are acknowledged, but not yet converted into an implementable plan.

- The onboarding replacement is still ambiguous: “equivalent profile/onboarding check” does not say whether the gate requires `display_name`, `onboarding_completed_at`, or both; today `StudentShell` checks only `display_name`, so either interpretation changes behavior for partially onboarded users. Fix: specify one guard component, its exact query and predicate, its `authReady`/loading/error behavior, and the redirect return path.
- The moved family needs a new parent layout route with the Classroom frame and an `<Outlet>`; moving six individual routes outside the shell otherwise leaves detail/upload pages without the new navigation and frame. Fix: define `/classroom` as a guarded layout route and nest all six child routes beneath it.
- Seed idempotency is not implementable from a marker plus `ON CONFLICT DO NOTHING`: `classroom_items` has no unique constraint on `source_table`/`source_id`. Fix: add a partial unique index such as `(student_id, source_table, source_id)` for the enrollment-welcome marker, then target it in the insert.
- “Defined Joshua/admin id” is still not defined or safely resolved; a hard-coded UUID or a mutable profile lookup can make the trigger fail or attribute content incorrectly. Fix: name the authoritative lookup/configuration mechanism and make its absence a transaction failure with an admin-visible alert.
- The tri-state rule is correct but insufficiently specified to build consistently: it does not define loading UI, retry behavior, stale-data behavior, or whether an error hides the whole page versus only its block. Fix: establish one per-block contract: loading skeleton, prior successful data retained while refetching, inline retryable error, and omission only after a successful empty query.
- `useInbox` and `useConversationMessages` are separate asynchronous reads; the plan does not define how the selected Joshua conversation is obtained, what happens when the participant-name RPC fails, or how it avoids showing the seed while the real message is still loading. Fix: define a dedicated “latest Joshua word” query state and selection algorithm, with seed fallback only after a successful no-admin-message result.
- The day-0 `note` will match the Lecture Notes filter (`note`) and can appear both as “Joshua’s latest word” and as a lecture note, mislabeling the welcome message. Fix: exclude the enrollment seed marker from the lecture-notes section.
- Lecture notes remain zero-row production data with no posting workflow in scope; calling them the central promoted block is aspirational, not a backed feature. Fix: explicitly make the section dormant until authored content exists, or add a separately approved teacher-posting workflow and seed/backfill plan.
- Uploads remain zero-row data, and production schema drift breaks the parser itself: `parse-external-work` writes `extracted_text`, `parsed_json`, and `confidence_score`, so “status only” does not make the current pipeline safe. Fix: make the production schema-repair migration a prerequisite to exposing submission, or disable submission and show no upload capability in this release.
- Schema repair for uploads, the seed trigger/index, and regenerated types are now required migrations, but the scope lock authorizes only `profiles.test_date` plus an unspecified seed. Fix: update the allowed-change list to authorize each named migration/function/type-generation artifact, or defer those features.
- “Production-vs-repo schema parity check” is only a verification phrase; no authoritative command, expected schema, or deployment ordering is stated. Fix: require migrations to deploy before the UI and add a CI/deploy check that validates the required columns and constraints.
- The plan still preserves `allowSignedIn`, which means the new gate must be the sole enrollment/onboarding boundary; it cannot rely on `has_classroom_access`. Fix: state explicitly whether non-paying signed-in accounts may enter and test that policy.

VERDICT: REVISE
### Claude's response

Verified two claims against production before accepting:
- `classroom_items` has NO unique constraint beyond the primary key (indexes: pkey, student_idx,
  status_idx, type_idx). `ON CONFLICT DO NOTHING` on (student_id, source_table, source_id) is
  unimplementable without first adding a partial unique index. Codex correct.
- `supabase/functions/parse-external-work/index.ts` writes `extracted_text` (lines 272, 285),
  `parsed_json` (286) and `confidence_score` (287) to columns that DO NOT EXIST in production.
  The upload parse pipeline is therefore already broken in production, which explains why
  `external_work_uploads` has zero rows. This is a live defect discovered incidentally by the
  review and is out of scope for the Classroom redesign; it needs its own decision.

Best finding of round 2: the day-0 seed note is type `note`, so it would match the Lecture Notes
filter and appear twice — once as "Joshua's latest word" and again as a lecture note. That would
have shipped.

LOOP STOPPED AT ROUND 2 of 3, deliberately, not by convergence and not by cap.
Codex's remaining findings have shifted from "this is wrong" to "specify this in more detail"
(exact guard predicate, loading skeleton contract, deployment ordering). That is implementation
detail appropriate to the build step, not plan-level defect. Per Joshua's standing instruction,
surviving findings go to him for per-item green/red light rather than being applied automatically.
No VERDICT: APPROVED was reached and none is claimed.


---

# Plan Review Log: Wrong answers in the Classroom frame

Started 2026-07-27. Spec by Claude, reviewed by Codex (read-only), to be implemented by Codex.

## Round 1 — Codex

## Findings, ranked by severity

1. **HIGH — The spec contradicts its own “unchanged `/flagged` and `/classroom`” scope lock.**

   The spec requires adding a trailing chevron to “Wrong answers.” Today that button has no `<em>›</em>`, while Flagged does ([ClassroomLayout.tsx:174](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:174)). The same `ClassroomSidebar` renders on every Classroom-framed route ([ClassroomLayout.tsx:529](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:529)), so adding the chevron visibly changes `/flagged` and every `/classroom/*` page.

   `PLAN.md:14` says those routes must render exactly as now, while `PLAN.md:118` requires the shared visual change. One of those requirements must be relaxed.

2. **HIGH — The fourth-column design is feasible, but the specified “existing context slot pattern” does not exist.**

   `ClassroomLayoutContext` currently carries only `displayName`, `testDate`, and `openSection` ([ClassroomLayout.tsx:41](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:41)). The child route is rendered inside `.classroom-column` through `<Outlet>` ([ClassroomLayout.tsx:575](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:575)). There is no content projection, registration, portal, or slot precedent.

   A child cannot synchronously return content into a parent sibling. A setter-based context slot can work, but only through a post-render registration effect, with explicit cleanup and stable/memoized content. Otherwise it risks:

   - an initial empty aside or visible stale content;
   - an effect loop if each render registers a newly created `ReactNode`;
   - the previous question’s review form surviving briefly after `qid` changes;
   - parent updates during route/layout unmount.

   The simpler correct layout is either:

   - a journal-only grid modifier on `.classroom-root`, with named positions for stage and aside; or
   - a journal-only workspace wrapper containing `.classroom-stage` and `.classroom-aside` as siblings.

   Both preserve the locked sibling relationship. The spec needs to choose the slot lifecycle or permit one of these simpler implementations.

3. **HIGH — “Aside beneath the question below ~1100px” fights the current root flex layout unless journal gets route-specific layout rules.**

   `.classroom-root` is one horizontal flex container ([classroom.css:17](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:17)). Its sidebar and section list are sticky fixed-width siblings ([classroom.css:112](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:112), [classroom.css:290](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:290)); `.classroom-stage` is another flex sibling ([classroom.css:422](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:422)).

   At 1024–1099px, the main sidebar is still present because it disappears only at 1023px ([classroom.css:1024](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:1024)). Simply wrapping the root flex would place the aside under the entire row, not specifically under the question. Global changes to this layout would risk `/flagged` and `/classroom`.

   Require a journal-scoped class/grid or conditional wrapper. Otherwise the implementer must invent a fragile combination of wrapping, offsets, and width calculations.

4. **HIGH — The autosave requirement lacks the state machine needed to prevent the exact data loss it is intended to fix.**

   The current timer retains its payload only in a timeout closure ([JournalEntrySurface.tsx:186](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalEntrySurface.tsx:186)); the ref stores only the timer handle. Cleanup merely clears it ([JournalEntrySurface.tsx:222](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalEntrySurface.tsx:222)).

   The revised implementation needs a pending-save ref containing at least `{classId, qid, draft, annotations}`, plus a single `flushPendingSave()` operation that clears and consumes it. The spec must require:

   - flush before seeding the next `qid`;
   - flush on child-route unmount;
   - latest draft and annotations via refs, not stale cleanup closures;
   - the old `qid` captured in the pending payload, not read from the new route;
   - no duplicate flush under StrictMode cleanup;
   - ordering or serialization when an older save is already in flight.

   Param navigation may reuse `JournalEntryView`; it cannot be treated solely as an unmount. The Flagged view already resets local state in response to `qid` changes ([FlaggedViews.tsx:242](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/FlaggedViews.tsx:242)).

   Moving `scheduleSave` outside the updater also requires a latest-state ref. A naïve `{...draft, ...patch}` outside the updater can itself use stale state. The current forbidden side effect is at [JournalEntrySurface.tsx:226](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalEntrySurface.tsx:226), and the app really does run under StrictMode ([main.tsx:138](/Users/joshuaf/ai-os/projects/lsatu/src/main.tsx:138)).

5. **MEDIUM — `useJournalEntries` cannot safely be “the same shape as `useFlagged`” without additional class-ID semantics.**

   `useFlagged` can key and enable directly from authenticated `user.id` ([useFlagged.ts:16](/Users/joshuaf/ai-os/projects/lsatu/src/hooks/useFlagged.ts:16)). Journal rows require an asynchronously resolved `classId`; the existing surface explicitly includes `classLoading` in its loading state ([JournalEntrySurface.tsx:84](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalEntrySurface.tsx:84), [JournalEntrySurface.tsx:383](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalEntrySurface.tsx:383)).

   The spec must define:

   - the query key, including `classId`;
   - whether the hook exposes class-ID loading separately or folds it into query state;
   - how the `useClassId` fallback/error is represented;
   - the exact invalidation key;
   - how an empty-state flash is prevented before `classId` resolves.

   Also, `SectionList` currently instantiates all its data hooks unconditionally ([ClassroomLayout.tsx:260](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:260)). Adding `useJournalEntries()` beside them would run the two-query journal fan-out on `/flagged` and `/classroom` whenever the section list mounts. A journal-only subcomponent or an explicit `enabled` option is required to avoid changing those routes’ network behavior.

6. **MEDIUM — The responsive contract is internally ambiguous and lacks column dimensions.**

   The spec says the entries column folds “below ~1400px,” while also saying it matches the existing `max-width: 1279px` behavior. The actual list disappears at 1279px ([classroom.css:1014](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:1014)). Verification then names exact widths 1400 and 1100 without saying which side of each breakpoint they represent.

   “Four fixed columns” also does not specify the aside width, minimum question width, or whether `.classroom-column` retains its current `max-width: 720px` ([classroom.css:432](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/classroom.css:432)). These values determine whether 1500px can actually fit four columns without horizontal overflow.

7. **MEDIUM — The annotation fix does not identify the new scroll owner or required DOM relationship.**

   Today the overlay is absolute over the outer pane ([JournalQuestionPane.tsx:100](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalQuestionPane.tsx:100)), while the stimulus and answer regions scroll independently ([JournalQuestionPane.tsx:105](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalQuestionPane.tsx:105), [JournalQuestionPane.tsx:124](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalQuestionPane.tsx:124)). `AnnotationLayer` normalizes coordinates against its own bounding box ([AnnotationLayer.tsx:76](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/AnnotationLayer.tsx:76), [AnnotationLayer.tsx:95](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/AnnotationLayer.tsx:95)).

   “Anchor it to the question content element” should explicitly require:

   - one scrolling ancestor for the vertical question;
   - a natural-height, `position: relative` content wrapper;
   - the absolute annotation layer filling that content wrapper, not the viewport-height scrollbox.

   Without that DOM contract, an implementer can move the layer and still reproduce the same bug.

8. **MEDIUM — Required failure and deep-link states are unspecified.**

   `FlaggedQuestionView`, the named reference, separately handles list loading, list failure, missing row, question-bank loading, and missing question ([FlaggedViews.tsx:306](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/FlaggedViews.tsx:306), [FlaggedViews.tsx:331](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/FlaggedViews.tsx:331), [FlaggedViews.tsx:360](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/FlaggedViews.tsx:360)).

   The plan does not specify what `/journal/:qid` renders when:

   - the `qid` is not in the journal rows;
   - the row disappears after loading;
   - the question bank lacks that `qid`;
   - the class-ID lookup or journal query fails.

   It also needs to define whether clicking entries pushes browser history and whether returning to `/journal` leaves the index prompt or redirects to the first entry.

9. **MEDIUM — The verification section omits repository-mandated gates.**

   This is significant UI work, but the plan does not require `npm run build`, which project guidance requires before wrapping significant work ([AGENTS.md:67](/Users/joshuaf/ai-os/projects/lsatu/AGENTS.md:67)). Its responsive matrix also omits the mandated sidecar-docked regression case ([AGENTS.md:63](/Users/joshuaf/ai-os/projects/lsatu/AGENTS.md:63)).

10. **LOW — One reuse claim is factually stale.**

    The plan says the text helpers were “already lifted out of the two panes.” `JournalQuestionPane` still contains local copies of both helpers ([JournalQuestionPane.tsx:21](/Users/joshuaf/ai-os/projects/lsatu/src/components/journal/entry/JournalQuestionPane.tsx:21)), while shared versions also exist in [questionText.ts:9](/Users/joshuaf/ai-os/projects/lsatu/src/lib/questionText.ts:9). The new component should import the shared helpers, but the plan should not imply both old duplications are already gone or invite an out-of-scope cleanup.

## Scope conclusion

No `StudentShell` edit is technically required. Moving the route in `App.tsx` is sufficient; the current journal route is plainly inside the StudentShell block ([App.tsx:375](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:375), [App.tsx:385](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:385)), and the single Classroom layout route is correctly established at [App.tsx:353](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:353). This agrees with ADR 0004’s one-layout requirement ([ADR 0004:14](/Users/joshuaf/ai-os/projects/lsatu/docs/adr/0004-classroom-frame-is-one-pathless-layout-route.md:14)).

However, the plan necessarily edits a component shared by `/flagged` and `/classroom`. Those routes can remain behaviorally unchanged only if the aside layout and journal query are strictly journal-scoped. The mandated shared-sidebar chevron already violates that promise.

VERDICT:REVISE
### Claude's response — round 1

All 12 findings plus both scope findings accepted and folded into PLAN.md. The two rated CRITICAL were verified against the code before acceptance:

- The `<Outlet>` is inside `.classroom-column` inside `.classroom-stage` (ClassroomLayout.tsx:575-587), so the "context slot" in the original spec was impossible. Replaced with a journal-only bare-Outlet branch where `JournalEntryView` returns `<main>` + `<aside>` siblings itself.
- `saveTimer.current` is never nulled after the timer fires (JournalEntrySurface.tsx:192), so a flush guarded on its truthiness would double-write. Spec now requires a captured pending payload, nulling before write, and an idempotent flush.

Also corrected: the original rationale for the flush ("URL selection makes unmounts routine") was wrong — a `:qid` change reuses the same route element and does not unmount. The requirement was right for the wrong reason; the spec now says flush on qid change.

## Round 2 — Codex

1. **P2 — Active entry highlighting is based on a false routing assumption.** `PLAN.md:123` says `activeId` receives `params.qid`, but `ClassroomLayout` is the parent route ([src/App.tsx:353](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:353)) and `:qid` belongs to its descendant ([PLAN.md:102](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:102)). The parent’s `useParams()` ([ClassroomLayout.tsx:439](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:439)) cannot see descendant params, so `activeId` ([ClassroomLayout.tsx:514](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:514)) will lack the journal qid. Require a journal-specific `useMatch("/journal/:qid")` or pathname-derived qid, without changing Flagged.

No other material problems found.

VERDICT:REVISE
### Claude's response — round 2

**Rejected, with evidence.** The claim is that `ClassroomLayout` cannot see `:qid` because the param belongs to a descendant route, so `activeId` would never highlight the active entry.

This is contradicted by a direct measurement on the identical pattern already in production. `/flagged/:qid` is built exactly this way — pathless `ClassroomLayout` parent, `:qid` on the descendant, `activeId = params.itemId ?? params.assignmentId ?? params.qid` — and loading `/flagged/PT118-S3-Q8` yields `activeRows: 1` with `activeLabel: "PT118-S3-Q8"`. React Router surfaces the deepest match's params to the layout. No `useMatch` is needed.

No new evidence was offered against the shipped behaviour, so the spec is unchanged on this point.

**Converged after 2 rounds.** Codex's round-2 reply states "No other material problems found"; its sole remaining objection is factually incorrect.
