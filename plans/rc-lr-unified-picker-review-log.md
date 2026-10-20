# Plan Review Log: RC access repair + one unified LR/RC question picker

Act 1 (grill-with-docs) complete — plan locked at `plans/rc-lr-unified-picker.md`. `src/features/rc/CONTEXT.md` amended (Passage, Set, Position, Question subset, Session, Pace), `CONTEXT-MAP.md` amended (the Set collision retired), ADRs 0006 and 0007 recorded. MAX_ROUNDS=5.

## Round 1 — Codex (gpt-5.6-sol, read-only, reasoning effort high)

VERDICT: REVISE. 17 findings; full text preserved below.

## Findings

1. **Critical — The claimed auth root cause is incomplete.** The bounce begins because `ProtectedRoute` treats `user=null, authReady=false` as anonymous while `useUserPermissions` reports `loading=false`; duplicate `redirectAfterAuth` calls are a downstream amplifier caused by multiple `AuthProvider` resolution paths, not the primary cause. Phase 1 step 2 would repair signed-in cold deep links, but step 1 merely masks duplicate initialization unless the provider is also fixed. ([ProtectedRoute.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/ProtectedRoute.tsx:43), [useUserPermissions.ts](/Users/joshuaf/ai-os/projects/lsatu/src/hooks/useUserPermissions.ts:93), [AuthContext.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/contexts/AuthContext.tsx:102))  
   Fix: Gate every protected route on `authReady`, then make auth initialization cancellable and idempotent before adding a one-shot redirect guard.

2. **High — Google OAuth still loses deep links.** A component ref cannot survive the full-page OAuth round trip, and the outbound redirect stores only `oauth_pending`, not the validated `returnTo`; Phase 1 therefore does not repair OAuth assignments or `next=` continuations. ([Auth.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Auth.tsx:387), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:31))  
   Fix: Persist a validated target in session storage before OAuth departure and atomically consume it after callback.

3. **High — The proposed redirect guard retains two competing redirect owners.** Password sign-in manually redirects while the user-watcher also redirects; reusing `skipAutoRedirectRef` can strand users on “Redirecting…” if `getUser()` returns no user, and successful navigation currently pushes rather than replaces, creating a Back-button loop. ([Auth.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Auth.tsx:242), [Auth.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Auth.tsx:318), [authRedirect.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/authRedirect.ts:24))  
   Fix: Give one idempotent controller sole ownership of post-auth navigation and always leave `/auth` with `replace:true`.

4. **High — `ProtectedRoute` has an unrelated authentication hole that Phase 1 misses.** A wrapper with `allowSignedIn` but no flag, such as `/booking`, renders for anonymous users because the anonymous check runs only for admin or flagged routes. ([ProtectedRoute.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/ProtectedRoute.tsx:65), [App.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/App.tsx:525))  
   Fix: After `authReady`, redirect every `ProtectedRoute` with no user unless an explicit public-access prop exists.

5. **High — Phase 1’s RC rail entry cannot work as described.** `AcademyMainhub` has no RC mode until Phase 3, `RAIL_CATALOG` has no route field, `RailItemId` excludes `rc`, and `ClassroomLayout` has an exhaustive behavior switch that would return `undefined`. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:33), [railCatalog.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/railCatalog.ts:9), [ClassroomLayout.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/classroom/shell/ClassroomLayout.tsx:231), [AcademyMainhub.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/AcademyMainhub.tsx:219))  
   Fix: Point the Phase 1 entry to existing `/rc`, then switch it only after Phase 3 supplies a tested RC-mode route contract and full rail wiring.

6. **High — Changing the default maximum does not “hold back” PT149–159.** Both RC range controls still allow `RC_PREPTEST_MAX` 159, so students can immediately expose supposedly withheld tests. ([RcSearch.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcSearch.tsx:153), [rcTypes.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcTypes.ts:303))  
   Fix: Decide whether this is a default or an embargo; for an embargo, enforce 148 in the available pool rather than merely initializing the slider there.

7. **Critical — The bank split has no safe API boundary.** The singleton exposes synchronous full `LRQuestion` objects to Drill, guided drills, analytics, homework, adaptive selection, and bootcamps, while the plan audits only four consumers and declares several affected areas out of scope; partial index objects could become playable questions or empty queues. ([questionLoader.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/questionLoader.ts:1113), [Drill.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Drill.tsx:348), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:74))  
   Fix: Introduce distinct index and body types/APIs, inventory every synchronous consumer, and require `await loadBodies(qids)` before all player and review paths.

8. **High — “Bodies fetched per PrepTest” does not match the actual artifacts.** LR content is stored in 156 per-section files, while canonical qtypes, qids, repaired text, and difficulty defaults are derived only at runtime; extending the raw merge script creates either nonexistent PT bundles or a second normalization pipeline. ([build-question-bank.mjs](/Users/joshuaf/ai-os/projects/lsatu/scripts/build-question-bank.mjs:5), [questionLoader.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/questionLoader.ts:1023))  
   Fix: Define the body artifact grain explicitly and extract one pure normalization pipeline shared by index generation, body loading, and fallback, with full parity tests.

9. **High — Both promised keyword searches are unsupported by the proposed indexes.** The LR index omits stimulus and choices currently searched, while the RC passage index contains only `firstWords`, not passage bodies; behavior must either regress or load full content. ([lrDrillFilters.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/lrDrillFilters.ts:66), [rcTypes.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcTypes.ts:81), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:52))  
   Fix: Emit compact normalized search documents for LR and one nonduplicated body-search record per RC passage, then test body-only and choice-only matches.

10. **Critical — RC saved Sets cannot fit the existing persistence model.** `user_saved_sets` stores only LR `text[] question_ids`, has no mode or passage/subset representation, and every saved Set launches `/drill`; extracting this machinery into RC will serialize ambiguous or unusable data. ([user_saved_sets migration](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260806180200_user_saved_sets.sql:10), [savedSets.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/savedSets.ts:4), [SavedSets.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/pages/SavedSets.tsx:147))  
   Fix: Add a required mode and versioned selection payload, migrate legacy rows as LR, and dispatch save/open/duplicate/launch by mode.

11. **Critical — “Assign to student” has no assignment architecture.** `AssignableItem` has no RC or generic Question Set branch, RC sessions are student-owned, and classroom route resolution would send an ordinary `drill` item into the LR runner; the teacher-context rule also says Assign pushes a persisted Library item, not an ephemeral basket. ([assignWork.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/assignWork.ts:14), [classroomItems.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/classroomItems.ts:133), [teacher context](/Users/joshuaf/ai-os/projects/lsatu/src/pages/teacher/CONTEXT.md:17))  
   Fix: Specify an immutable mode-aware Question Set/assignment snapshot, assignment RLS, `assignWork` branch, classroom route, notification, and student-created session linked to that assignment.

12. **High — The plan does not actually produce “one picker, one home.”** `/rc` remains a full competing builder, and the player/results contain numerous hard-coded returns to it; only `/rc/search` is retired. ([RcHub.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcHub.tsx:311), [RcPlayer.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:411), [RcResults.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcResults.tsx:226), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:54))  
   Fix: Remove the builder from `RcHub` or redirect `/rc` too, preserve history/resume elsewhere, and update every RC return link to the unified hub.

13. **High — Mixed-grain RC selection has no canonical invariant.** The plan does not define whether “matched 4 of 7” adds four questions or all seven, what happens when a whole passage and some of its questions are both selected, or whether changing modes discards the basket. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:50), [RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:17))  
   Fix: Normalize RC selection as `Map<passageId, null | Set<questionId>>`, define merge/removal/mode-switch rules, and label “Add passage” separately from “Add matched questions.”

14. **Critical — Phase 4 is not backward-compatible and misses downstream subset consumers.** Persisted timing contains only `secondsPerPassage`, the new allowances have no values or versioning, results rebuild every question, and “Drill misses” recreates sessions from passage IDs, so subset scores and remediation will be wrong. ([rcTypes.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcTypes.ts:140), [rcSession.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcSession.ts:260), [RcResults.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcResults.tsx:99))  
   Fix: Version and snapshot timing, preserve legacy 8:45 semantics, and thread the normalized subset through player initialization, resume, review, results, scoring, and Drill Misses.

15. **Critical — RC attempt integrity contradicts the domain model.** `FOR ALL` RLS lets owners update/delete supposedly append-only attempts, ownership is not coupled to the referenced session, and `recordAttempt` uses a select-then-insert race that can create two first attempts and corrupt scoring. ([RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:55), [migration](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260806000000_rc_drilling.sql:11), [rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:147))  
   Fix: Enforce session ownership server-side, restrict policies to append/select, derive first-attempt status transactionally, and add a unique partial index.

16. **Medium — The domain documentation is internally contradictory.** The amended glossary still opens by saying a student “never” selects a single RC question, then later defines question subsets and question-grain Sets. ([RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:3), [RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:29))  
   Fix: Rewrite the introduction to say RC is passage-first for reading while selection may occur at passage or question grain.

17. **High — Verification and observability are inadequate for the riskiest claims.** There are no deterministic tests for unresolved auth, duplicate session emissions, OAuth/expiry returns, index/body parity, asset mismatch, saved-set modes, assignment RLS, legacy/subset sessions, duplicate first attempts, or body-load fallback; a browser landing check will miss most of these failures. ([ProtectedRoute.test.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/ProtectedRoute.test.tsx:79), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:71))  
   Fix: Add the missing contract/integration matrix plus counters for auth redirect source, index fallback, body-load failure, assignment failure, and duplicate-attempt rejection.

VERDICT: REVISE
### Claude's response

Accepted 16 of 17. Four spot-checked against the repo before accepting: `App.tsx:526`
mounts `<ProtectedRoute allowSignedIn>` with no flag (finding 4 — confirmed anonymous-render
hole); `build-question-bank.mjs` globs per-*section* files, not per-PT (finding 8 — confirmed);
`RcIndexPassage` carries only `firstWords`, no body (finding 9 — confirmed); `SavedSetRow`
is `question_ids: string[]` with no mode (finding 10 — confirmed).

Changes made:
- New **Phase 0**, shipping alone and first: the anonymous-render hole. Promoted above all RC
  work — it is a live auth defect unrelated to the picker.
- Root cause restated. `ProtectedRoute` ignoring `authReady` is now named the primary cause;
  the `redirectAfterAuth` double-fire is demoted to a downstream amplifier (finding 1).
- Phase 1 gained: idempotent/cancellable auth init, a single redirect owner as a state machine
  with a terminal failure branch rather than a boolean ref, `replace: true` on every exit from
  `/auth`, and **session-storage persistence of `returnTo` across the OAuth round trip**
  (findings 2, 3) — the ref-based guard could never have survived the full-page redirect.
- Phase 2 rail entry now points at existing `/rc`, and names all three coordinated edits
  (`RailItemId`, catalog entry, `ClassroomLayout`'s exhaustive switch) rather than pretending
  it is one (finding 5).
- Phase 3 rewritten around a defined body grain, one shared normalization pipeline with parity
  tests, distinct non-assignable index/body types, LR search documents that keep stimulus and
  choices, and a full synchronous-consumer inventory (findings 7, 8, 9).
- Phase 4 gained the `Map<passageId, null | Set<questionId>>` selection invariant with explicit
  merge/removal/mode-switch rules, an RC passage body-search document, a `user_saved_sets`
  mode + versioned payload migration, retirement of `/rc`'s builder as well as `/rc/search`,
  and a real teacher-assignment architecture instead of a button (findings 10, 11, 12, 13).
- New **Phase 5** precondition: RC attempt integrity (`FOR ALL` RLS, uncoupled ownership,
  select-then-insert race) lands before the subset, because subset scoring rests on
  first-attempt integrity. Timing is now versioned and snapshotted, and the subset is threaded
  through resume, review, results, scoring, and Drill Misses (findings 14, 15).
- Glossary contradiction fixed in `src/features/rc/CONTEXT.md`: the intro now says RC is
  passage-first *for reading* while selection may occur at either grain (finding 16).
- Added a **verification matrix** table — per-phase contract tests plus the five counters
  Codex named (finding 17).

Partially rejected — finding 6 (PT range). Codex is right that initializing a slider at 148
withholds nothing, but `rcTypes.ts:304` states the tests are held back "**by default**".
Converting that to an embargo is a product change Joshua has not asked for. The defect is that
the two RC surfaces disagree; aligning them is the fix. The plan now says "default, not
embargo" explicitly so the next reader does not re-raise it.

## Round 2 — Codex (same session, read-only)

VERDICT: REVISE. 8 addressed / 8 partial / 1 not addressed, plus new blockers; full text preserved below.

The revision materially improves the plan, but it still has sequencing blockers. My closure count is: **8 addressed, 8 partially addressed, 1 not addressed.**

## Spec

| # | Prior finding | Status | Assessment |
|---|---|---|---|
| 1 | Auth root cause | Addressed | The plan now correctly identifies unresolved auth as primary and duplicate redirects as an amplifier. |
| 2 | OAuth loses `returnTo` | Addressed | Session-storage persistence and atomic consumption are explicit. |
| 3 | Competing redirect owners | Addressed | One controller, terminal failure handling, and `replace:true` are specified. |
| 4 | Flagless `ProtectedRoute` hole | Partial | The policy is correct, but Phase 0 cannot safely ship without the `authReady` gate deferred to Phase 1. |
| 5 | RC rail wiring | Addressed | The union, catalog, behavior switch, existing `/rc` target, and later repointing are covered. |
| 6 | PT range disagreement | Addressed | Accepted as revised: 148 is explicitly a default, not an embargo. |
| 7 | Unsafe index/body API | Partial | Distinct APIs and consumer inventory are specified, but the out-of-scope section still excludes affected consumers. |
| 8 | Artifact grain/normalization | Partial | Section grain and shared normalization are correct, but governing ADR 0007 still mandates per-PrepTest bodies. |
| 9 | Missing keyword-search data | Partial | RC is addressed; the LR solution contradicts ADR 0007 and nearly recreates the full-bank payload. |
| 10 | Saved-set schema | Addressed | Mode, versioned payload, legacy migration, and mode-aware dispatch are specified. |
| 11 | Teacher assignment architecture | Not addressed | “Specify an architecture” is still a placeholder, not an architecture. |
| 12 | More than one RC picker home | Addressed | Both `/rc/search` and the `/rc` builder are retired, with history/resume preserved. |
| 13 | Mixed-grain selection invariant | Partial | Addition/promotion is defined, but removal from whole-passage and subset states is not. |
| 14 | Timing/results compatibility | Partial | Legacy semantics and downstream consumers are named, but timing values, config shape, and serialization remain undecided. |
| 15 | Attempt integrity | Partial | The intended database constraints are named, but they break current flagging and lack a deployable migration sequence. |
| 16 | RC glossary contradiction | Addressed | The revised [RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:3) now separates reading grain from selection grain. |
| 17 | Verification/observability | Partial | Contract coverage improved substantially, but required browser verification, build/typecheck gates, and actionable counter definitions are absent. |

### Remaining and new blockers

1. **Blocker — Phase 0 cannot ship alone.** It says the anonymous decision happens after `authReady`, but the unresolved-auth spinner is Phase 1; Phase 0 alone must either flash `/booking` content or redirect restored users through `/auth`. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:33), [ProtectedRoute.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/ProtectedRoute.tsx:43))  
   Fix: Move the `!authReady` blocking state into Phase 0 and make `ProtectedRoute` intrinsically authenticated rather than adding an unused `public` escape hatch.

2. **Blocker — Phase 4 produces Sets that cannot run until Phase 5.** Phase 4 exposes question-grain selection, saved-set launching, and assignments before sessions can persist or honor question subsets. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:65), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:78))  
   Fix: Land the subset session schema/API/player support before any question-grain Start, saved-set launch, or assignment action.

3. **Blocker — Append/select-only attempt RLS breaks flagging.** `setAttemptFlag()` currently updates stored attempts, so Phase 5’s policy contraction removes a live feature. ([rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:190), [RcPlayer.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:283))  
   Fix: Move mutable per-session question flags into a separate state table before making attempts append-only.

4. **High — The integrity migration can fail against existing data.** The current race may already have produced duplicate `is_first_attempt=true` rows, so creating the partial unique index without a preflight will abort; failed writes are also swallowed while the session can still be completed. ([rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:147), [RcPlayer.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/pages/RcPlayer.tsx:214))  
   Fix: Audit and adjudicate existing duplicates, reject completion until expected writes succeed, then deploy server-derived first-attempt state and the unique index.

5. **Blocker — The new LR search document defeats ADR 0007.** A document containing stimulus and all choices is approximately **5.07 MB uncompressed / 1.44 MB gzip** against the current bank’s **5.53 MB / 1.47 MB**; it is effectively the bank again, while ADR 0007 explicitly requires a lightweight index with no choices. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:58), [ADR 0007](/Users/joshuaf/ai-os/projects/lsatu/docs/adr/0007-lr-bank-splits-into-index-and-bodies.md:11))  
   Fix: Keep a genuinely lightweight facet index and either accept stem-only search or design a separate compact/on-demand full-text index, then amend the ADR explicitly.

6. **High — The build script would ingest its newly generated artifact on the next build.** It accepts every top-level JSON except two named files, so a new search/index JSON can be mistaken for a section source. ([build-question-bank.mjs](/Users/joshuaf/ai-os/projects/lsatu/scripts/build-question-bank.mjs:28))  
   Fix: Restrict source discovery to `PT\\d+-S\\d+-LR.json` before emitting additional artifacts.

7. **Blocker — Teacher assignment remains undesigned.** No table, wire payload, ownership lifecycle, RLS predicates, route discriminator, rollback branch, completion synchronization, or behavior for students lacking `has_drill_access` has been chosen. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:76), [assignWork.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/assignWork.ts:14), [classroomItems.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/classroomItems.ts:133))  
   Fix: Put the concrete Set snapshot and assignment schema, policies, routes, rollback, access check, and assignment-to-session linkage in the plan before Phase 4.

8. **High — Session-expiry deep-link preservation has a proof but no implementation step.** `useUserPermissions` still navigates to bare `/auth`, discarding the current pathname, query, and hash. ([useUserPermissions.ts](/Users/joshuaf/ai-os/projects/lsatu/src/hooks/useUserPermissions.ts:150), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:46))  
   Fix: Capture and validate the current location before expiry sign-out and carry it through the same post-auth state machine.

9. **High — The persisted subset and timing contracts are still undefined.** A JavaScript `Map<number, null | Set<number>>` is not a JSON wire format, the new timing allowances have no values, and both a stale local RC row type and generated Supabase types must evolve safely. ([rcSupabase.types.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcSupabase.types.ts:12), [generated types](/Users/joshuaf/ai-os/projects/lsatu/src/integrations/supabase/types.ts:2863), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:81))  
   Fix: Define a versioned JSON DTO with validation, exact standard/custom timing formulas, legacy decoding, and an explicit Supabase-type regeneration step.

10. **Medium — Phase 5 changes semantics the plan calls out of scope.** `getQuestionHistory()` includes review attempts, while `rollingAccuracy()` claims to use first attempts; the plan excludes the adaptive engine even though attempt-integrity work exposes this mismatch. ([rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:208), [rcAdaptive.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcAdaptive.ts:67), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:121))  
   Fix: Separate first-attempt analytics from all-attempt review history and narrow “out of scope” to adaptive algorithm changes, not required data correctness.

## Standards

- The out-of-scope section contradicts required implementation work: Phase 3 must change guided-drill, bootcamp, analytics, homework, and adaptive consumers, while Phases 4–5 explicitly alter the RC player and results.
- The verification matrix omits the repository’s hard UI gate: all affected pages/components must be viewed running, with DOM or screenshot evidence; responsive picker work also needs narrow, mid, wide, and sidecar-docked coverage. It likewise omits the required build and typecheck gates. ([AGENTS.md](/Users/joshuaf/ai-os/projects/lsatu/AGENTS.md:60))

VERDICT: REVISE
### Claude's response

Accepted all ten remaining items. Two were verified against the repo first: `setAttemptFlag()`
(`rcProgress.ts:190`) does UPDATE `rc_attempts`, so append-only RLS would have removed a live
feature (blocker 3 — confirmed); `RcTiming` is an unversioned discriminated union (finding 9 —
confirmed).

Structural changes:
- **Phase 0 and the `authReady` gate merged into one shippable change.** Codex is right that
  they cannot be separated: deciding "anonymous?" before auth resolves either flashes protected
  content or bounces restored sessions. Also dropped the `public` escape hatch — nothing in
  `App.tsx` needs it, since genuinely public pages are not wrapped at all.
- **Phase order reversed: the RC session model now precedes the picker.** Shipping question-grain
  selection before sessions can persist a subset would give students a Start button that silently
  widens their selection back to the whole passage.
- **ADR 0007 amended rather than contradicted.** The sizing is the finding of the review: an index
  carrying stimulus and choices is ~5.07 MB / 1.44 MB gzip against the bank's 5.53 MB / 1.47 MB —
  it would have been the bank, and the ADR would have bought nothing. The index is now facets plus
  stem; stimulus, choices, and RC passage bodies are matched in a second stage over the
  already-filtered set. The amendment says so explicitly so the contradiction cannot recur.
- Phase 4 gained the two preconditions Codex named — flags move to their own mutable table before
  attempts go append-only, and existing duplicate `is_first_attempt` rows are audited and
  adjudicated before the partial unique index — plus a versioned JSON DTO for the subset
  (`{ v: 1, passages: [...] }`), a versioned `RcTiming` v2 with legacy v1 decode, an explicit
  Supabase type regeneration step, refusal to complete a session with missing attempt writes, and
  the `getQuestionHistory` / `rollingAccuracy` first-attempt mismatch.
- Phase 3 now restricts source discovery to `/^PT\d+-S\d+-LR\.json$/` **first**, so the build
  cannot re-ingest its own generated artifact on the next run.
- Phase 1 now carries the location through session expiry — `useUserPermissions:150` navigates to a
  bare `/auth`, discarding pathname, query, and hash.
- Selection-map rules completed: removal from a whole-passage selection demotes it to the explicit
  complement subset; removing a subset's last question removes the passage.
- Verification matrix gained the repository's own hard gates from `AGENTS.md` — typecheck, build,
  running-app evidence for any `src/components` or `src/pages` change, the full responsive matrix
  for picker work — and the counters are now specified as greppable structured warnings.
- Out of scope narrowed honestly, with a "previously out, now in" note: the RC player and results
  pages are in (Phase 4 threads the subset through them), and so are the LR question-loading call
  sites in analytics, homework, guided drills, bootcamps, and adaptive selection (Phase 3).

**Conceded and cut: teacher assignment (blocker 7).** Codex raised it twice and was right twice —
"specify an architecture" is a placeholder, not an architecture. No table, wire payload, ownership
lifecycle, RLS predicate, route discriminator, rollback branch, completion sync, or `has_drill_access`
behaviour has been chosen, and inventing them here would ship a placeholder as a spec. Joshua's
decision (same component, "Assign to <student>" instead of "Start") stands and is recorded; the
architecture gets its own grill and its own plan, blocked on Phase 5. The Goal paragraph still names
it as the destination, which is accurate — it is the destination, not this plan's deliverable.

## Round 3 — Codex (same session, read-only)

VERDICT: REVISE. Teacher-assignment cut accepted; 11 items remaining, four blockers. Full text preserved below.

The revision fixes the main ordering mistakes, but several contracts remain non-executable. Teacher assignment is now an acceptable scope cut, not an evasion; it should become a tracked follow-on before Phase 5 closes.

## Round 2 closure

| Item | Status |
|---|---|
| Phase 0 + `authReady` merged | Core issue addressed |
| Session model before picker | Addressed |
| Flags before attempt-RLS contraction | Ordering addressed; migration underspecified |
| Duplicate-first-attempt preflight | Partial |
| Lightweight index + two-stage search | Partial |
| Restricted build glob | Addressed |
| Session-expiry location | Partial |
| Versioned subset/timing DTOs | Partial |
| Selection removal rules | Addressed |
| `AGENTS.md` gates | Partial |
| Narrowed out-of-scope | Addressed |
| PT default alignment | Addressed; the rejection is sound |

The auth diagnosis is now correct: unresolved auth is the primary cause, and duplicate post-auth navigation is an amplifier. Gating on `authReady` before inspecting `user` really does repair the restored-session cold-load branch.

## Spec

1. **High — ADR 0007 still contradicts Phase 3.** Its title and original decision require per-PrepTest bodies, while the plan requires the 156 existing per-section bodies; the amendment changes only search contents. ([ADR 0007](/Users/joshuaf/ai-os/projects/lsatu/docs/adr/0007-lr-bank-splits-into-index-and-bodies.md:1), [plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:92))  
   **Fix:** Amend the ADR title, decision, and consequences to say per-section bodies throughout.

2. **Blocker — The saved-set payload cannot represent both modes.** Phase 4 defines an RC-only `{ passages: [...] }` DTO, but Phase 5 says migrated LR rows use “the same” payload; LR requires string qids. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:132), [savedSets.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/savedSets.ts:4))  
   **Fix:** Define a discriminated union such as `{v:1,mode:'lr',questionIds:string[]}` or `{v:1,mode:'rc',passages:[...]}`, with an expand/backfill/dual-read/contract rollout.

3. **Blocker — Missing-attempt enforcement is impossible as specified.** The database cannot determine expected questions when `questionIds:null`, because content lives only in static JSON, while completion remains a direct client update. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:129), [rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:118))  
   **Fix:** Snapshot resolved ordered question IDs at session creation and complete through a server RPC that verifies required attempts and freezes selection/config.

4. **High — Timing remains undefined despite claiming “stated defaults.”** No numeric reading/question defaults, bounds, or conversion for today’s custom seconds-per-passage setting are supplied. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:136), [rcSession.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcSession.ts:257))  
   **Fix:** State exact defaults, bounds, custom-input semantics, legacy conversion, and version every timing-union arm.

5. **High — Duplicate cleanup still races live writes.** An audit followed later by cleanup/index creation leaves a window in which the current select-then-insert code can create another duplicate; “adjudicate” also gives no winner rule. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:125), [rcProgress.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/api/rcProgress.ts:147))  
   **Fix:** Lock writes, deterministically rank and repair duplicates, install the constraint atomically, then use a locking insert RPC.

6. **High — The flag-table migration is not deployable yet.** It lacks a primary key, ownership RLS, disagreement/backfill rule, read/write cutover, and behavior for flags created before an attempt. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:122))  
   **Fix:** Specify a `(session_id, question_id)` key, ownership-through-session policies, deterministic backfill, upsert API, reader cutover, and final removal of `attempt.flagged`.

7. **Blocker — Two-stage search is still unbounded and race-prone.** A broad facet can require dozens or all 156 bodies; paging before body search misses matches, while paging afterward approaches a corpus download, and overlapping queries can resolve out of order. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:98), [ADR 0007](/Users/joshuaf/ai-os/projects/lsatu/docs/adr/0007-lr-bank-splits-into-index-and-bodies.md:36))  
   **Fix:** Define facet candidates → cancellable body search → union/dedupe → counts/paging, with debounce, a candidate ceiling, and explicit stem-only fallback above that ceiling.

8. **High — Phase 5 breaks existing RC deep links.** Retiring the builder removes `/rc?passages=…` and `/rc?count=…&start=1`, which are documented and actively produced today. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:175), [RC context](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/CONTEXT.md:105), [PracticeInsightStage.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/mainhub/PracticeInsightStage.tsx:318))  
   **Fix:** Keep `/rc` as a query-preserving compatibility adapter into RC picker/session mode and contract-test every legacy query form.

9. **High — Phase 5’s required Simple mode remains undesigned.** Preset chips are mandatory but explicitly unspecified, and “My weak types” needs history data the picker does not currently have. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:158), [plan risks](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:218))  
   **Fix:** Choose the concrete presets, their data sources, empty/error behavior, and saved-set reopen semantics before Phase 5 begins.

10. **High — Auth target validation and failure handling remain incomplete.** The current validator accepts backslash network-path forms and `/auth` self-loops; rejected `getSession()` can leave the new `authReady` gate spinning forever, and OAuth denial/error handling is not explicit. ([authRedirect.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/authRedirect.ts:3), [AuthContext.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/contexts/AuthContext.tsx:117))  
    **Fix:** Centralize parser-based same-origin validation and specify bounded, recoverable transitions for initialization failure, OAuth denial/error, timeout, and stale stored targets.

11. **Medium — Phase 0’s intrinsic-auth invariant can still be bypassed in development.** The existing local bypass runs before the anonymous-user check. ([ProtectedRoute.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/components/ProtectedRoute.tsx:59))  
    **Fix:** Require `authReady` and a user before applying the development flag bypass.

## Standards

- The matrix still omits relevant `npm run test` execution and the required `.claude/safe-push.sh` release path. **Fix:** Add both to the per-phase gates. ([AGENTS.md](/Users/joshuaf/ai-os/projects/lsatu/AGENTS.md:65))
- “Counters” implemented as transient `console.warn` calls are neither counters nor durable production observability. **Fix:** Rename them local diagnostics or emit aggregated events to a persistent error/telemetry sink.
- Phase 5 changes canonical routes but does not require updating `src/features/rc/CONTEXT.md`. **Fix:** Add context-document updates and compatibility-route tests to Phase 5.

VERDICT: REVISE
### Claude's response

Accepted all eleven plus all three standards items. Nothing rejected this round.

- **ADR 0007 retitled and rewritten**, not just amended: "lightweight index plus **per-section**
  bodies". Codex was right that leaving per-PrepTest in the title and decision meant the governing
  ADR contradicted the plan it governs.
- **Saved-set payload is now a discriminated union** — `{v:1,mode:'lr',questionIds:string[]}` or
  `{v:1,mode:'rc',passages:[...]}`. LR qids are strings and RC ids are numbers, so "the same
  payload" was never possible. Rollout stated as expand → backfill → dual-read → contract.
- **Missing-attempt enforcement made possible.** Codex is right that the database cannot know what
  a session owes when the subset is `null`, since content lives only in static JSON. Session
  creation now resolves `null` into the passage's actual ordered question ids and stores them, and
  completion runs through a server RPC that verifies required attempts and freezes selection and
  config. The client loses the ability to mark a session complete directly.
- **Timing has numbers.** `{ v: 2, mode: 'reading_plus_questions', readingSeconds: 210,
  secondsPerQuestion: 45 }`, chosen so a full seven-question passage is exactly `210 + 7×45 = 525s`
  — the 8:45 `RC_STANDARD_SECONDS_PER_PASSAGE` means today. "Standard pace" is therefore unchanged
  for whole passages and only subsets get shorter. Bounds and the 40/60 custom split are stated.
- **Duplicate repair no longer races live writes**: one atomic migration — lock, rank by
  `created_at` then `id`, demote losers, create the index, release — then a locking insert RPC so
  the race cannot return. "Adjudicate" now has a winner rule.
- **Flag table is deployable**: `(session_id, question_id)` primary key, ownership through the
  session, `bool_or(flagged)` backfill which is also the disagreement rule, flags allowed before
  any attempt exists, and a stated read/write cutover ending in dropping `rc_attempts.flagged`.
- **Two-stage search is bounded**: facets → candidates → ceiling (400 LR candidates ≈ 12 section
  files, 60 RC passages) → bodies → union/dedupe → *then* count and page. Above the ceiling,
  stem-only with a visible note. 250 ms debounce, generation token so a stale in-flight pass cannot
  overwrite a newer one, superseded passes aborted.
- **`/rc` survives as a query-preserving compatibility adapter.** The best catch of the round:
  `/rc?passages=…` and `/rc?count=…&start=1` are documented in the RC glossary and produced today
  by `PracticeInsightStage.tsx:318`. Retiring the route would have broken links already in the
  wild. Only the builder UI goes; every legacy query form is contract-tested.
- **Simple mode's presets are named** — LR: Hard Flaw, Recent PrepTests, Weaken + Strengthen,
  Conditional logic. RC: Comparative passages, Science, Hard passages, Inference questions. All
  resolve to facet combinations the index already supports. "My weak types" is explicitly excluded
  from the phase because it needs history the picker does not have. Saved-set reopen semantics
  stated.
- **Auth hardening**: parser-based same-origin validation replacing string checks that accept
  `/\evil.com` and permit an `/auth` self-loop; `AuthContext`'s existing 15s timer made the explicit
  ceiling so a rejected `getSession()` cannot spin the new gate forever; OAuth denial, error return,
  and stale stored targets each given a stated transition.
- **Dev bypass moved after the auth checks**, so `VITE_DEV_BYPASS_GATES` relaxes flags only.
- Phase 5 now updates `src/features/rc/CONTEXT.md`'s Routes table, since that is the phase where
  the canonical routes change.
- Gates gained `npm run test` and `.claude/safe-push.sh`. The right-hand column was renamed
  **local diagnostics, not telemetry**, and says so: they are prefixed `console.warn` calls, this
  product has no persistent error sink, and adding one is a separate decision. Codex was right that
  calling them counters overstated them.

## Round 4 — Codex (same session, read-only)

VERDICT: REVISE. 7 findings + 4 standards; Codex explicitly excluded SQL syntax, RPC signatures, component structure, batching, and caching as build-time concerns. Full text preserved below.

The revision is materially stronger, but four Round 3 items remain incomplete and several new contradictions appeared. These affect product behavior, security invariants, or migration correctness; they are not ordinary coding details.

## Spec

Round 3 items 1, 3, 6, 8, 10, and 11 are closed. Items 4, 5, 7, and 9 are not fully closed. Item 2’s union is fixed, but its migration introduces new ambiguity.

1. **Blocker — The search ceiling limits records, not fetched artifacts.** A normal `Weaken` facet produces 340 candidates under the 400 limit but spans 154 of 156 section files, so “bounded” search can still fetch essentially the whole bank; 60 RC passages can similarly span almost every PT body. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:198))  
   **Fix:** Enforce limits on distinct body files and estimated bytes as well as candidates, then verify actual request counts.

2. **Blocker — The timing contract is mathematically inconsistent.** `210 + n×45` preserves 525 seconds only for seven-question passages, despite claiming Standard remains unchanged for every whole passage; existing drillable passages contain 1–8 questions. Custom timing is also unrepresentable because one session-wide `secondsPerQuestion` cannot be derived separately from each passage’s question count. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:160))  
   **Fix:** Decide whether whole-passage budgets remain flat or vary by question count, then define a representable session-wide formula or persist per-passage timing allocations.

3. **Blocker — Attempt migration processes unsafe legacy rows before fixing ownership.** Current RLS permits an attempt whose `user_id` belongs to the caller but whose `session_id` belongs to someone else; flag backfill and duplicate ranking run before ownership is coupled, allowing such rows to alter another user’s flags or win first-attempt status. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:132), [current migration](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260806000000_rc_drilling.sql:35))  
   **Fix:** Audit and quarantine cross-owner attempts, install ownership enforcement, and only then backfill flags and adjudicate duplicates.

4. **Blocker — RPC-derived first-attempt status remains bypassable.** Step 25 retains append/select access while step 24 relies on an RPC, so direct inserts can still choose `is_first_attempt`; installing the unique index before callers move to the RPC also leaves old clients able to lose attempts to uniqueness errors. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:140))  
   **Fix:** Deploy server derivation first, revoke direct inserts or enforce derivation with a trigger, migrate callers, and only then clean and constrain the table.

5. **High — Preset names still are not preset specifications.** “Hard,” “Recent PrepTests,” and similar labels do not define exact difficulty values, PT boundaries, qtypes, or feature arrays, leaving materially different pools to the implementer. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:221))  
   **Fix:** Record the exact filter object for every preset and test its resolved pool.

6. **High — Saved-set compatibility remains ambiguous.** The schema now duplicates `mode` in a column and inside the payload without an equality invariant; additionally, legacy Smart Builder rows contain an untagged `ParsedConfig`, not picker filters, despite the promise that every saved Set restores its filters. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:207), [drillFilterCodec.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/drillFilterCodec.ts:4))  
   **Fix:** Make one mode discriminator canonical or constrain equality, and define Smart-Builder conversion or an explicit “selection restored; legacy filters unavailable” state.

7. **Medium — Legacy timing decoding is still implicit.** Existing JSON has no `v`, while the plan and tests call it “v1”; an implementation could accidentally test `{v:1,...}` without supporting real stored rows.  
   **Fix:** Explicitly define missing `v` as legacy v1 and test fixtures matching today’s unversioned production shape.

## Standards

- ADR 0007 still describes unrestricted body search, conflicting with Phase 5’s ceilings and stem-only fallback; it also says bodies load only when a drill starts while later requiring them for preview, journal, flagged, and search. **Fix:** Amend the ADR with the bounded-search rule and say bodies load whenever body fields are required. ([ADR 0007](/Users/joshuaf/ai-os/projects/lsatu/docs/adr/0007-lr-bank-splits-into-index-and-bodies.md:11))
- The verification matrix still labels its third column “Counters,” despite explicitly saying that term overstates local diagnostics. **Fix:** Rename it “Local diagnostics.” ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:247))
- Risks lines 271–273 still say presets are unspecified, reopening is undecided, and search needs a cap, contradicting completed Phase 5 decisions. **Fix:** Remove those stale bullets or replace them with residual measurement risks.
- The matrix does not test the newly accepted failure/security cases: unsafe auth targets, OAuth denial, rejected `getSession`, direct-attempt bypass, raw unversioned timing, or the physical body-file ceiling. **Fix:** Add those contract cases to the corresponding phase rows.

I did not treat exact SQL syntax, RPC signatures, component structure, batching mechanics, or cache implementation as plan defects; those properly belong in the build.

VERDICT: REVISE
### Claude's response

Accepted all eleven. One was my arithmetic error and is withdrawn in the plan text rather than
quietly patched.

- **Timing (blocker 2) — the claim was wrong and is retracted.** I wrote that
  `210 + n×45` leaves Standard pace unchanged for whole passages; it equals today's 525s only at
  *n* = 7, and drillable passages carry 1–8 questions. The plan now says so explicitly, keeps v2's
  varying budget as the deliberate improvement (a flat 8:45 hands a 4-question passage the same
  clock as an 8-question one), and flags that **redefining Standard pace is a product change
  Joshua signs off before Phase 4 ships**. Custom under v2 takes `readingSeconds` and
  `secondsPerQuestion` as two direct inputs, which removes the unrepresentable per-passage
  derivation Codex identified.
- **Phase 4 reordered and rewritten as four preconditions whose order is the point** (blockers 3,
  4). A: quarantine cross-owner attempts and couple ownership *first*, since every later step reads
  those rows. B: deploy server-side derivation and revoke direct inserts *before* any constraint —
  the unique index alone never made `is_first_attempt` trustworthy, and installing it under old
  clients would have lost attempts to uniqueness errors. C: flags off attempts. D: repair
  duplicates and constrain, now that nothing can create a new one.
- **Search ceiling is three limits, not one** (blocker 1): 400 LR candidates, 12 distinct section
  files, ~450 KB of body payload (RC: 60 / 8 / ~600 KB). Tests assert real request count and
  transferred bytes. Codex is right that a candidate count says nothing about what gets downloaded.
- **Presets are filter objects in a table**, not names (finding 5). "Hard" left the pool to the
  implementer.
- **Saved sets got an equality invariant** — DB CHECK `mode = payload->>'mode'`, so the column and
  the payload cannot disagree — plus an explicit "selection restored; original filters unavailable"
  state for legacy Smart Builder `ParsedConfig` rows, which do not hold picker filters at all
  (finding 6).
- **Unversioned timing decodes as v1**, with fixtures using today's real production shape rather
  than a synthetic `{v:1,…}` (finding 7).
- ADR 0007 amended twice more: bodies load **whenever a body field is required**, not only when a
  drill starts — false the moment a list surface needs a stimulus — and the second stage is
  documented as bounded, since an unbounded one is the corpus download the ADR exists to prevent,
  arriving one query later.
- Verification column renamed **Local diagnostics**. Matrix gained the failure and security cases:
  unsafe auth targets, OAuth denial, rejected `getSession()` at the 15s ceiling, stale stored
  target, dev bypass cannot admit an anonymous user, direct-insert bypass, raw unversioned timing,
  v2 budgets across 1–8 question passages, completion RPC refusing missing attempts, and the
  physical file/byte ceilings.
- Stale Risks bullets removed and replaced with residual ones: the pace redefinition needs product
  sign-off, the three ceilings are disk-size estimates awaiting first measurement, and "My weak
  types" is deferred rather than dropped.

## Round 5 — Codex (same session, read-only) — MAX_ROUNDS reached

VERDICT: REVISE. 6 spec findings + 2 standards. Codex confirmed the three-part search ceiling, revised pace behaviour, saved-set legacy UX, auth repair, ADR amendments, and the teacher-assignment scope cut as sufficiently specified. Full text preserved below.

The substantive Round 4 fixes are present, but the final plan still contains live-deployment paths that can lose writes. Those are genuine plan defects, not implementation choices.

## Standards

1. **Medium — RC’s grouped taxonomy has no rule for ungrouped features.** `Flip the Fact` and `Paraphrase a Line` have `group: null`; a renderer following the plan can omit them or expose a broken null heading. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:210), [rcTypes.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/lib/rcTypes.ts:283))  
   **Fix:** Define an “Other” group for null-valued features and assert every feature appears exactly once.

2. **Medium — “Asset-mismatch handling” has no defined contract.** The matrix requires a test but does not say how mixed-generation index/body assets are detected or whether the response is retry, merged-bank fallback, or visible failure. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:293))  
   **Fix:** Add a bank-generation/hash manifest and specify the required mixed-generation fallback behavior.

## Spec

1. **Blocker — Precondition B revokes inserts before migrating callers.** The stated RPC branch is `deploy RPC → revoke direct inserts → migrate callers`, which leaves the currently deployed client unable to record attempts. The trigger alternative is safe, but the plan still permits the unsafe branch. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:139))  
   **Fix:** Deploy compatibility enforcement first, migrate and verify RPC callers, then revoke direct inserts after legacy callers are gone.

2. **Blocker — The flag migration can lose changes during cutover.** A one-time backfill precedes writer migration, so an old client can toggle `rc_attempts.flagged` afterward and that update disappears when readers switch and the column drops. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:145))  
   **Fix:** Mirror/dual-write before backfill or perform a locked final reconciliation after stopping legacy writes and before switching readers.

3. **Blocker — Saved-set expand/backfill has the same race.** Old or cached clients can create or update only `question_ids` after the backfill, leaving `mode` and payload missing or stale when required constraints land. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:235))  
   **Fix:** Expand nullable, add compatibility dual-write/trigger behavior, backfill, migrate callers, reconcile, then enforce required fields and contract.

4. **High — Legacy RC session migration remains undefined.** Existing rows contain only `passage_ids`, while the new completion RPC requires resolved question IDs that the database cannot derive from static content; no application backfill or legacy decoder is specified. The new payload also duplicates `passage_ids` without naming the authority. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:158), [current schema](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260806000000_rc_drilling.sql:1))  
   **Fix:** Make the resolved payload canonical, backfill legacy sessions using the bank, dual-read during rollout, and derive or retire `passage_ids`.

5. **High — One exact preset references a nonexistent API.** `FEATURE_FAMILIES` is an array, so `FEATURE_FAMILIES.conditional.features` is invalid; the repository’s keyed export is `FEATURE_FAMILY_BY_ID`. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:258), [questionFeatureFamilies.ts](/Users/joshuaf/ai-os/projects/lsatu/src/lib/questionFeatureFamilies.ts:172))  
   **Fix:** Use `FEATURE_FAMILY_BY_ID.conditional.features` or enumerate the exact feature values.

6. **Medium — The timing wire contract still contradicts itself.** It says every arm gains `v`, but the canonical v1 examples omit `v`, conflating newly encoded v1 values with tolerated legacy input. ([plan](/Users/joshuaf/ai-os/projects/lsatu/plans/rc-lr-unified-picker.md:176))  
   **Fix:** Define canonical arms as `{v:1,...}` and reserve missing `v` solely for legacy decoding.

The three-part search ceiling, revised pace behavior, saved-set legacy UX, auth repair, ADR amendments, and teacher-assignment scope cut are otherwise specified sufficiently. Exact SQL locks, RPC signatures, batching, and cache mechanics properly belong in implementation.

VERDICT: REVISE
### Claude's response — final, unreviewed

All eight accepted and applied. The cap is reached, so **these edits have not themselves been
reviewed by Codex.** Recorded here so the next reader knows exactly which parts of the plan carry
a review and which do not.

The three blockers were one bug wearing three hats: attempt inserts, flags, and saved sets each
did a one-time backfill and then a cutover, and in all three a deployed client that keeps writing
the old way afterwards loses its writes. Rather than patch them individually the plan now states
**one governing rollout rule** for every schema change in Phases 4 and 5 — expand nullable →
compatibility dual-write → backfill → migrate callers → verify no legacy writers → locked final
reconciliation → enforce and contract — and each step names how it obeys it:

- Precondition B ships a **trigger** enforcing server-side `is_first_attempt` derivation alongside
  the RPC, so already-deployed clients keep recording attempts correctly; revocation of direct
  inserts moves to *after* callers migrate. The earlier order would have left every shipped client
  unable to record an attempt.
- The flag table **mirrors `rc_attempts.flagged` writes via trigger** before backfill, with a locked
  reconciliation before readers switch and the column drops.
- Saved sets dual-write old `question_ids` and the new payload; the `mode = payload->>'mode'` CHECK
  and the required-field constraints land **last**.

Also fixed:
- **Legacy RC session backfill defined** (finding 4). The database cannot resolve `passage_ids` into
  question ids because content is static JSON it cannot read, so a one-off application job does it
  from the bank; the RPC dual-reads during rollout, treating a payload-less row as "every question
  of every listed passage". Afterwards the resolved payload is canonical and `passage_ids` is
  derived from it, so the two cannot disagree.
- **`FEATURE_FAMILIES.conditional.features` was invalid** — it is an array; the keyed export is
  `FEATURE_FAMILY_BY_ID` (verified at `questionFeatureFamilies.ts:172`). Preset corrected.
- **Canonical v1 timing is written as `{v:1,…}`**; a missing `v` is tolerated legacy input only,
  never written back. Fixtures cover both shapes.
- **`group: null` RC features collect into "Other"** — `Flip the Fact` and `Paraphrase a Line` carry
  it (`rcTypes.ts:293,299`), and a naive group map would drop them or draw a `null` heading. A test
  asserts every feature and type renders in exactly one group.
- **Asset mismatch has a contract**: index, section bodies, and merged bank all carry the same
  build-generation hash in a manifest; a mismatched pair falls back to the merged bank and emits a
  diagnostic rather than serving mixed generations.
- Verification matrix gained the rollout-race cases: every schema step re-run with a simulated
  legacy writer still active.

## Resolution — deadlock at cap, not convergence

Five rounds, five REVISE verdicts, no APPROVED. This is recorded as a **deadlock at MAX_ROUNDS**,
not a convergence. The honest reading is that the verdicts were not repetitions of one unresolved
disagreement — each round's findings were strictly narrower than the last (Round 1: root cause and
architecture; Round 5: migration ordering and one wrong symbol), and Codex explicitly signed off
the search ceiling, pace model, auth repair, ADR amendments, and scope cut as sufficient. Only one
substantive disagreement was ever logged and it stands: the RC PrepTest range is a **default, not
an embargo** (Round 1, finding 6).

Claude's position: the plan is sound enough to build Phase 0 and Phase 1 from as written — those
were reviewed across all five rounds and are the smallest, most urgent, and best-specified part of
it. Phases 3, 4, and 5 carry unreviewed final edits, and Phase 4's migration ordering in particular
was rewritten in this last round with no adversarial pass over the rewrite. A sixth round, or a
fresh review of Phases 3–5 alone, is the cheap way to close that gap.
