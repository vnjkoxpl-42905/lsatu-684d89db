# Plan: RC access repair + one unified LR/RC question picker

_Locked via grill-with-docs — by Claude + Joshua, 2026-08-17; revised after Codex review Rounds 1–5 (cap reached; see the review log). Terms per `src/features/rc/CONTEXT.md`, `src/components/drill/CONTEXT.md`, `src/pages/teacher/CONTEXT.md`, and `CONTEXT-MAP.md` (amended 2026-08-17: **Set** now means the group you assemble in both contexts; a passage's positional sense became **Position**). Governing ADRs: `docs/adr/0006-rc-selection-is-question-grain.md`, `docs/adr/0007-lr-bank-splits-into-index-and-bodies.md`._

## Status

**Phases 0 and 1 are built and verified (2026-08-17).** Phases 2–5 are planned, not built; Phases 3–5 carry final revisions Codex has not reviewed (see the review log's Resolution).

## Goal

Reading Comprehension content is present and correct — 59 PrepTests, 1,602 drillable questions, a full player, a search page, a results page — and a student essentially cannot get to it. Repair the access defects, then replace the two divergent selection surfaces (`RcSearch` and the LR `QuestionPicker`) with **one picker in the drill hub** carrying an LR/RC mode toggle and a simple/advanced toggle, building a **Set** in either mode. Along the way, stop shipping 5.53 MB of question bank to every page.

Teacher assignment — the same component mounted in the teacher workspace with "Assign to \<student\>" in place of "Start" — is the agreed destination but **not this plan's deliverable**. It is deferred to a follow-on plan blocked on Phase 5; see Key decisions for why.

## What the audit found (evidence, 2026-08-17, dev server + live browser)

**Access**

1. RC has no entry in `RAIL_CATALOG` (`src/lib/railCatalog.ts:50`). The only in-app doors are Drill → Practice Tools → "Reading Comprehension" and one `navigate("/rc")` in `src/components/mainhub/PracticeInsightStage.tsx:395`.
2. **Every deep link to a flag-gated route bounces to `/classroom`.** Reproduced on cold loads of `/rc`, `/rc/search`, `/drill`. Isolated proof: cold-loading `/auth?returnTo=%2Fjournal` also lands on `/classroom`.
3. `src/components/ProtectedRoute.tsx:43` tests `!user` without consulting `authReady`, while `useUserPermissions` reports `loading: authReady && !!user && query.isPending` — false before auth resolves. So "auth not yet resolved" reads as "signed out" and the route redirects to `/auth`. `allowSignedIn` routes (`/journal`) cold-load fine; flag-gated ones do not. **This is the primary cause.**
4. Downstream amplifier: `redirectAfterAuth` then fires more than once from `src/pages/Auth.tsx:275`. Stack trace captured — call 1 honours `?returnTo=` and pushes the right route, call 2 reads a now-empty `window.location.search`, so `getSafeReturnTo()` returns null and `src/lib/authRedirect.ts:30` pushes `/classroom` over it. The observed double-invoke is React StrictMode and therefore dev-only; the missing guard is not.
5. **`ProtectedRoute` renders protected content to anonymous users.** The `!user` check at line 65 runs only when `requireAdmin || flags.length > 0`. `App.tsx:526` mounts `<ProtectedRoute allowSignedIn><Booking /></ProtectedRoute>` with no flag, so `flags.length === 0`, the guard is skipped, and execution falls through to the unconditional `return <>{children}</>`. Found by Codex, verified. Unrelated to RC and more urgent than any of it.
6. `RcHub` defaults `preptestMax` to `RC_PREPTEST_DEFAULT_MAX` (148); `RcSearch` defaults to `RC_PREPTEST_MAX` (159). The two RC surfaces disagree.

Per `src/features/rc/CONTEXT.md`, **RC assignment is a link** (`/rc/drill?passage=<id>`), so defects 2–4 break RC assignment end to end.

**Cost**

7. `public/data/_bank.generated.json` is 5,527,682 bytes and loads on every page under `/*` because `QuestionBankProvider` wraps that subtree in `src/App.tsx:397`. Measured on a cold `/classroom` load: 5.68 MB across 26 `/data` requests, on a page that renders no questions. `mergeExplanationSidecars()` adds one fetch per PrepTest and attaches explanations to 1,249 questions, also on every page.
8. Picker interaction cost, measured in dev: 62 ms long task for one quick chip; 97 ms to open Question Features (112 options rendered flat). `getLRDrillContextualOptionCounts` runs six full passes over 3,964 questions per filter change, allocating a `Set` per question per pass.

**Divergence** — LR groups question types by `CANONICAL_QTYPES.groups` and features by `FEATURE_FAMILIES`, shows live per-option counts, hides zero-count options, supports multi-select, preview, saved sets, and paging. `RcSearch` has none of it: a flat chip wall, no counts, one "Open" per row, a raw `<table>` with inline styles instead of shadcn, a hard 200-result cap, and keyword matching against question stems and passage titles only. The taxon data RC needs **already exists and is discarded**: every entry in `RC_QUESTION_TYPES` carries a `family` (`src/features/rc/lib/rcTypes.ts:259`), and `RcSearch` calls `RC_QUESTION_TYPES.map(t => t.name)`.

Also found: 5 LR questions carry unroutable types (`"Unknown"` ×2, `"Miscellaneous"`, `"Except"` ×2) and cannot be reached through the type filter.

## Approach

Phases ship in order. Each is releasable on its own and leaves the product in a working state.

### Phase 0 — the auth gate (ships alone, first)

The anonymous-render hole and the `authReady` gap are **one change**, not two. Splitting them
would make `ProtectedRoute` decide "is this user anonymous?" before auth has resolved, which
either flashes protected content or bounces a restored session through `/auth`.

1. Make `ProtectedRoute` block on `!authReady` with the existing neutral spinner, before any
   `user` decision.
2. Make `ProtectedRoute` **intrinsically authenticated**: once `authReady`, no user means
   redirect, for every shape of the component. `allowSignedIn` means "signed in is enough",
   never "no one needs to be signed in". No `public` escape hatch is added, because nothing
   in `App.tsx` needs one — public pages (`/auth`, `/book/:slug`, `/trust`, `/unsubscribe`)
   are not wrapped at all.
3. Audit every `ProtectedRoute` usage in `App.tsx`. `App.tsx:526` (`/booking`) is the flagless
   case found; confirm there are no others.
4. Move the local dev bypass (`ProtectedRoute.tsx:59`) **after** the `authReady` and user checks,
   so `VITE_DEV_BYPASS_GATES` relaxes flags only — never authentication itself.
5. **Proof:** anonymous hits on all three shapes — flagless + `allowSignedIn`, flagged,
   `requireAdmin` — reach `/auth`; a restored session cold-loading `/rc` never sees `/auth`.

### Phase 1 — deep links survive every arrival path

5. Give **one** controller sole ownership of post-auth navigation. Today `handleSubmit`
   redirects manually *and* the user-watcher effect redirects; `skipAutoRedirectRef` guards
   only the first. The replacement is a state machine with an explicit terminal failure
   branch, not a boolean — a bare one-shot guard strands the user on "Redirecting…" when
   `getUser()` returns nothing.
6. Always leave `/auth` with `replace: true`. The captured stack trace shows a `push`, which
   leaves `/auth` in history and creates a Back-button loop.
7. **Persist `returnTo` across the OAuth round trip.** A React ref cannot survive a full-page
   redirect to Google, and the outbound leg stores only `oauth_pending` (`Auth.tsx:387`), not
   the target. Write a validated target to session storage before departure; consume it
   atomically on callback.
8. **Carry the location through session expiry.** `useUserPermissions:150` navigates to a bare
   `/auth`, discarding pathname, query, and hash. Capture and validate the current location
   before the expiry sign-out and feed it to the same state machine.
9. Make auth initialization idempotent and cancellable in `AuthContext` so one cold load emits
   one resolution.
10. **Centralize target validation.** `getSafeReturnTo()` accepts backslash network-path forms
    (`/\evil.com`) and permits an `/auth` self-loop. Replace the string checks with
    `new URL(target, location.origin)`, requiring same origin and rejecting any `/auth` target.
11. **Bound every failure transition.** A rejected `getSession()` must not leave the new
    `authReady` gate spinning forever — `AuthContext`'s existing 15s safety timer becomes the
    explicit ceiling, resolving to signed-out. Specify recoverable states for OAuth denial,
    OAuth error return, initialization failure, timeout, and a stored target older than
    `OAUTH_PENDING_MAX_AGE_MS` (discarded, not followed).
10. **Proof:** cold `/rc/drill?passage=<id>` renders that passage, through each of password
    sign-in, Google round trip, and an expiry bounce.

### Phase 2 — RC gets a front door (small, independent)

11. Add `rc` to `RailItemId`, a `RAIL_CATALOG` entry under `study` with
    `flags: ["has_drill_access"]`, and a case in `ClassroomLayout`'s exhaustive behaviour
    switch — three coordinated edits, **pointing at the existing `/rc`**. It must not wait on
    an RC-mode route that does not exist yet. Repoint it in Phase 5.
12. Point `DEFAULT_RC_SEARCH_FILTERS.preptestMax` at `RC_PREPTEST_DEFAULT_MAX` so both
    surfaces open on the same range. Explicitly a **default, not an embargo** — the slider
    still reaches 159 by design, matching `rcTypes.ts:304`.
13. Keep `railCatalog.test.ts`'s route/flag pairing pinned.

### Phase 3 — bank split (ADR 0007, as amended)

14. **Restrict source discovery first.** `build-question-bank.mjs:28` accepts every top-level
    JSON except two named files, so any new artifact it emits would be re-ingested as a
    section source on the next build. Match `/^PT\d+-S\d+-LR\.json$/` before adding outputs.
15. **Define the body grain as per-section**, matching the 156 files that actually exist. Not
    per-PrepTest — those bundles do not exist, and inventing them means a second pipeline.
16. **Stamp the artifacts with a generation id.** The index, the section bodies, and the merged
    bank are written together and must be read together; a browser holding a cached index against
    newly deployed bodies is the failure mode. Every artifact carries the same build-generation
    hash in a small manifest. On mismatch the loader falls back to the merged bank, emits a
    diagnostic, and does not silently serve a mixed pair.
17. Extract **one pure normalization pipeline** — canonical qtypes, qids, repaired text,
    difficulty defaults, today derived at runtime in `questionLoader` — shared by index
    generation, body loading, and the existing fallback, with parity tests asserting all three
    produce identical questions.
18. **The index stays lightweight: facets plus stem, no stimulus, no choices.** Per the ADR
    amendment, keyword search is two-stage — stems match from the index instantly, and
    stimulus/choice matching runs over the already-filtered result set by loading those bodies
    on demand. A query with no facets searches stems only and says so.
19. Introduce **distinct, non-assignable types** — `LRQuestionIndexEntry` and `LRQuestion`. A
    partial index object reaching the player as a playable question is the failure this phase
    exists to prevent.
20. Inventory **every** synchronous consumer of `questionBank.getAllQuestions()` /
    `getQuestion()` — 17 components use `useQuestionBank`, 28 files import from
    `questionLoader` — and require `await loadBodies(qids)` on every player and review path.
    This necessarily touches guided drills, bootcamps, analytics, homework, and adaptive
    selection; see the narrowed scope note below.
21. Stop mounting `QuestionBankProvider` over the whole `/*` subtree.
22. Replace the six full-bank passes in `getLRDrillContextualOptionCounts` with a single pass
    accumulating all six facets, over the index.
23. **Proof:** cold `/classroom` fetches no question bank; index/body/fallback parity passes;
    a body-load failure degrades visibly rather than producing an empty queue.

### Phase 4 — RC session model (ADR 0006) — **before the picker, not after**

A picker that can select question-grain before sessions can persist a subset would ship a
Start button that silently widens the selection back to the whole passage. The data model
lands first. The four preconditions run in this order and the order is the point: each one
makes the next safe.

**One rollout rule governs every schema change in Phases 4 and 5**, because all three of them
(attempt inserts, flags, saved sets) have the same shape and the same failure: a deployed client
keeps writing the old way after a one-time backfill, and those writes vanish at cutover. The order
is always **expand nullable → compatibility dual-write → backfill → migrate callers → verify no
legacy writers remain → locked final reconciliation → enforce and contract.** Never revoke or
constrain before callers have moved; never backfill once and assume it holds.

24. **Precondition A — quarantine cross-owner attempts, then couple ownership.** Today's RLS
    (`20260806000000_rc_drilling.sql:35`) admits an attempt whose `user_id` is the caller but whose
    `session_id` belongs to somebody else. Every later step reads these rows, so they go first:
    audit for `attempt.user_id <> session.user_id`, quarantine what is found, then enforce
    ownership-through-session server-side. Only then can a backfill or an adjudication run without
    a foreign row flipping another student's flag or winning first-attempt status.
25. **Precondition B — server derivation before any constraint, compatibility before revocation.**
    Deploy the locking insert RPC that derives `is_first_attempt` server-side **and a trigger that
    enforces the same derivation on direct inserts**, so the currently deployed client keeps
    recording attempts correctly without knowing the RPC exists. Then migrate callers to the RPC,
    verify no direct inserts remain, and only then revoke direct insert rights. Revoking first —
    which an earlier draft of this plan permitted — would have left every already-shipped client
    unable to record an attempt at all. The constraint alone never made `is_first_attempt`
    trustworthy; the trigger is what does.
26. **Precondition C — move flags off attempts, deployably.** `setAttemptFlag()`
    (`rcProgress.ts:190`) UPDATEs stored attempts, so contracting `rc_attempts` to append/select
    would remove a live feature. New table `rc_question_flags`, primary key
    `(session_id, question_id)`, RLS granting the owner of the referenced session only. Backfill as
    `bool_or(flagged)` per `(session_id, question_id)` — that is also the disagreement rule when a
    question's attempts disagree. A flag may be set before any attempt exists, so the table
    references the session, not an attempt. Rollout follows the governing rule, and a plain
    backfill-then-cutover is specifically wrong here: an old client toggling `rc_attempts.flagged`
    after the backfill would have its change silently dropped when readers switch and the column
    goes. So — create the table, **mirror `rc_attempts.flagged` writes into it with a trigger**,
    backfill, switch writes to upsert, switch readers, take a locked final reconciliation once no
    legacy writer remains, then drop `rc_attempts.flagged`.
27. **Precondition D — repair duplicates, then constrain.** With derivation server-side and direct
    inserts revoked, no new duplicate can appear. One migration, atomically: lock, rank duplicate
    `is_first_attempt = true` rows per `(session_id, question_id)` by `created_at` then `id`
    ascending, demote all but the winner, create the partial unique index, release.
28. Contract `rc_attempts` RLS from `FOR ALL` to append/select.
29. **Snapshot the resolved question list at session creation.** The database cannot compute which
    questions a session owes when the subset is "the whole passage", because content lives only in
    static JSON. So session creation resolves that into the passage's actual ordered question ids
    and stores them. Completion then runs through a server RPC that verifies every required attempt
    exists and freezes selection and config; a session with missing writes cannot complete, and the
    client loses the ability to mark one complete directly.

    **Legacy sessions need an application-side backfill.** Existing `rc_drill_sessions` rows carry
    only `passage_ids`, and the database cannot resolve those into question ids because the content
    is static JSON it cannot read. So a one-off application job resolves them from the bank and
    writes the payload; the RPC dual-reads during rollout, treating a row with no payload as
    "every question of every listed passage". After the backfill the **resolved payload is
    canonical** and `passage_ids` is derived from it, not a second source of truth — otherwise the
    two can disagree about the same session.
30. **Define the persisted contract explicitly.** `Map<passageId, null | Set<questionId>>` is the
    in-memory shape, not a wire format. Persist
    `{ v: 1, mode: 'rc', passages: [{ passageId, questionIds: number[] }] }` — resolved, never
    `null`, per step 28. The saved-set payload is the **discriminated union** of this and its LR
    arm, `{ v: 1, mode: 'lr', questionIds: string[] }` (LR qids are strings, RC ids are numbers, so
    one shape cannot carry both). The payload carries `mode` and the column exists for querying, so
    a DB CHECK enforces `mode = payload->>'mode'` — one canonical answer, not two that can
    disagree — but that CHECK lands **last**. Rollout follows the governing rule: expand `mode` and
    payload nullable, dual-write both old `question_ids` and the new payload, backfill, migrate
    callers, reconcile once no legacy writer remains, then make the fields required and add the
    CHECK. Enforcing required fields while a cached client still writes `question_ids` alone would
    reject its writes outright.
    Legacy rows whose `filter_state` holds a Smart Builder `ParsedConfig` (`drillFilterCodec.ts`)
    rather than picker filters cannot have their filters restored. They open in an explicit
    **"selection restored; original filters unavailable"** state — the question ids still work, the
    filter panel opens empty, and the UI says why rather than showing a wrong filter set.
31. **Version the timing union, with numbers — and admit the budget now varies.** Every arm gains a
    `v`. Canonical v1 is **written** as `{ v: 1, mode: … }`; a stored config with **no** `v` is
    tolerated legacy input that decodes as v1 and is never written back in that shape. The two are
    not the same thing, and fixtures must cover both — today's real unversioned production rows and
    newly encoded `{v:1,…}` ones.
    - v1 keeps flat semantics forever: `{ v: 1, mode: 'unlimited' }` and
      `{ v: 1, mode: 'per_passage_budget', secondsPerPassage }`. Existing sessions are never
      reinterpreted.
    - v2: `{ v: 2, mode: 'reading_plus_questions', readingSeconds: 210, secondsPerQuestion: 45 }`.
      Per-passage allowance is `readingSeconds + askedCount × secondsPerQuestion`.

    **The earlier claim that this leaves Standard pace unchanged was wrong** and is withdrawn:
    `210 + n×45` equals today's 525s only at *n* = 7, and drillable passages carry 1–8 questions.
    Under v2 a whole passage's budget varies with its question count — a 5-question passage gets
    435s, an 8-question one 570s. That is the deliberate improvement rather than a side effect,
    since a flat 8:45 hands the same clock to a 4-question passage and an 8-question one. It does
    mean **"Standard pace" is redefined and its student-facing copy changes**, which Joshua signs
    off before Phase 4 ships rather than discovering afterwards.

    Custom under v2 takes `readingSeconds` and `secondsPerQuestion` as two direct inputs, so it is
    representable session-wide with no per-passage derivation. Bounds: `readingSeconds` 60–900,
    `secondsPerQuestion` 15–300. (`RC_SECONDS_PER_QUESTION_BUDGET = 75` is untouched — it prices the
    results-page pace delta, not the clock.)
32. Update the stale local `rcSupabase.types.ts` **and** regenerate `integrations/supabase/types.ts`
    as an explicit step.
33. Teach `buildItems()` to honour the subset while the passage still renders in full; thread the
    subset through player init, resume, review, `RcResults` (which rebuilds every question today),
    scoring, and **Drill Misses**, which recreates sessions from passage IDs.
34. **Fix the first-attempt mismatch this exposes:** `getQuestionHistory()` includes review attempts
    while `rollingAccuracy()` claims first attempts only. Separate first-attempt analytics from
    all-attempt review history.

### Phase 5 — the unified picker

35. Extract the LR picker's machinery — grouped taxon menus, contextual counts with zero-count
    hiding, per-facet clear, selection, preview, spec line — into a mode-agnostic core taking
    a taxonomy descriptor and a result-row renderer.
36. Supply the RC taxonomy from data that already exists: types grouped by
    `RC_QUESTION_TYPES[].family` under `RC_QUESTION_TYPE_FAMILIES`, features by
    `RC_FEATURES[].group`, plus topic, format, framework, difficulty, PT range.
    **`group: null` collects into an "Other" group** — `Flip the Fact` and `Paraphrase a Line`
    carry it today, and a renderer that maps groups naively would either drop them or draw a `null`
    heading. A test asserts every entry in `RC_FEATURES` and `RC_QUESTION_TYPES` appears in exactly
    one rendered group.
37. Two toggles, deliberately unalike in form: **LR ↔ RC** switches mode; **Simple ↔ Advanced**
    switches depth. Simple shows preset chips, keyword search, live match count. Advanced is a
    superset — nothing disappears when you expand.
38. RC selection normalizes to `Map<passageId, null | Set<questionId>>`. Rules, all of them:
    "Add passage" and "Add matched questions" are separate labelled actions; adding a passage
    that already holds a subset **promotes** it to `null`; adding a question to a `null`
    passage is a no-op; **removing a question from a `null` passage demotes it to the explicit
    complement subset**; removing the last question of a subset removes the passage; switching
    modes warns before discarding a non-empty basket.
39. A **Set** is single-mode: LR or RC, never mixed.
40. **Two-stage search, bounded and cancellable.** Order is fixed: facets narrow to candidates →
    if the candidate count is at or below the ceiling, fetch those bodies and match → union and
    dedupe stem hits with body hits → *then* count and page. Paging before the body pass would
    miss matches; paging after an unbounded pass approaches a corpus download. The ceiling is
    **three limits, all enforced**, because a candidate count says nothing about bytes: at most 400
    LR candidates, at most **12 distinct section files**, and at most **~450 KB** of body payload
    (RC: 60 passages, 8 PrepTest files, ~600 KB). Tests assert the actual request count and
    transferred bytes, not just the candidate number. Above any limit, search runs stem-only and
    the UI says so with a "narrow the filters to search full text" note. Input is debounced 250 ms,
    each pass carries a generation token so an older in-flight result is discarded rather than
    overwriting a newer one, and a superseded pass is aborted.
41. Paging in both modes, replacing RC's silent 200-cap.
42. **Saved sets need their schema first.** `user_saved_sets` stores `question_ids text[]` with
    no mode and no passage/subset representation, and every saved set launches `/drill`. Add a
    required `mode` and the same versioned selection payload as Phase 4, migrate existing rows
    as LR, dispatch save / open / duplicate / launch by mode.
43. Retire `RcHub`'s **builder UI**, but keep `/rc` as a **query-preserving compatibility
    adapter** into the picker in RC mode. `/rc?passages=1188,1201&reveal=…&timing=…` and
    `/rc?count=…&start=1` are documented in `src/features/rc/CONTEXT.md` and produced today by
    `PracticeInsightStage.tsx:318`; retiring the route would break links already in the wild.
    Contract-test every legacy query form. `/rc/search` redirects likewise. Preserve history and
    resume, update the returns `RcPlayer` and `RcResults` hard-code, then repoint the Phase 2
    rail entry.
44. **Update `src/features/rc/CONTEXT.md`'s Routes table and assignment-link section** as part of
    this phase — the canonical routes change here, and the glossary is the thing that says what
    they are.
45. **Simple mode's presets are specified as filter objects, not names.** A label like "Hard"
    leaves the pool to the implementer, so each is recorded exactly and its resolved pool pinned by
    test:

    | Preset | Mode | Filter |
    |---|---|---|
    | Hard Flaw | LR | `{ questionTypes: ['Flaw'], difficulties: [4,5] }` |
    | Recent PrepTests | LR | `{ prepTests: [140…159] }` |
    | Weaken + Strengthen | LR | `{ questionTypes: ['Weaken','Strengthen'] }` |
    | Conditional logic | LR | `{ questionFeatures: FEATURE_FAMILY_BY_ID.conditional.features }` |
    | Comparative passages | RC | `{ formats: ['Comparative'] }` |
    | Science | RC | `{ topics: ['Science'] }` |
    | Hard passages | RC | `{ passageDifficulties: [4,5] }` |
    | Inference questions | RC | `{ questionTypes: ['Inference'] }` |

    Each resolves against the index alone, needs no new data, and is asserted non-empty. "My weak
    types" is explicitly **not** in this phase: it needs per-student attempt history the picker does
    not have. A saved Set re-opens with filters and selection restored, editable, saveable over and
    duplicable — except legacy Smart Builder rows, which open in the "original filters unavailable"
    state defined in Phase 4.

## Key decisions & tradeoffs

- **One picker, two modes** rather than bringing `RcSearch` to parity as a second surface. The two had already drifted into different products.
- **RC selection is question-grain** (ADR 0006), overriding the previous glossary line. The expensive answer — a schema change, a `buildItems` filter, a new pace model — chosen because per-question remediation is the request that comes up most.
- **Set wins the naming collision**; RC's positional sense becomes **Position**.
- **Split the LR bank rather than only scoping the provider** (ADR 0007). Scoping alone leaves the drill, journal, and flagged surfaces each paying 5.5 MB.
- **Keyword search leaves the index** (ADR 0007 amendment, 2026-08-17). An index carrying stimulus and choices measured ~5.07 MB / 1.44 MB gzip against the bank's 5.53 MB / 1.47 MB — it would have *been* the bank. Search is two-stage instead: stems from the index instantly, stimulus/choices/passage bodies over the already-filtered set. Cost: no instant full-corpus full-text search, which the product never promised.
- **Simple/advanced is a toggle**, per Joshua. Recorded objection: hiding the taxonomy costs students the browsing path by which they work out *what* to drill. Mitigated by preset chips, not a bare search box, on the simple side.
- **The picker lives in the drill hub only**, per Joshua. Recorded objection: burying RC inside a surface called "Drill" is part of why it was unfindable. Mitigated by the Phase 2 rail entry.
- **Phase 0 is one change, not two.** The anonymous-render hole cannot be fixed before the `authReady` gate without either flashing protected content or bouncing restored sessions.
- **The session model precedes the picker.** Reversed after Codex Round 2: shipping question-grain selection before sessions can persist a subset would give students a Start button that silently widens their selection back to the whole passage.
- **The PT range is a default, not an embargo** (Codex finding 6, partially rejected). Codex is right that initializing a slider at 148 withholds nothing, but `rcTypes.ts:304` says "held back **by default**". Making it an embargo is a product change Joshua has not asked for. The defect is the disagreement between the two surfaces.
- **Teacher assignment is cut to a follow-on plan** (Codex finding 11, twice raised, conceded). Joshua's decision stands — same component, "Assign to \<student\>" instead of "Start" — but the architecture behind it is undesigned: no table, wire payload, ownership lifecycle, RLS predicates, route discriminator, rollback branch, completion sync, or behaviour for a student without `has_drill_access`. `AssignableItem` has no RC or Question Set branch, `classroomItems` would route a `drill` item into the LR runner, RC sessions are student-owned, and `src/pages/teacher/CONTEXT.md` says Assign pushes a persisted Library item rather than an ephemeral basket. Those are grill questions for Joshua, not decisions to invent here. Writing "specify an architecture" into a plan twice is how a placeholder ships as a spec. It gets its own plan, blocked on Phase 5.

## Verification matrix

A browser landing check catches almost none of this. Required before any phase is called done:

| Phase | Contract tests | Local diagnostics |
|---|---|---|
| 0 | Anonymous hits every `ProtectedRoute` shape: flagless+`allowSignedIn`, flagged, `requireAdmin`; restored session cold-loads a gated route without seeing `/auth`; dev bypass cannot admit an anonymous user | auth redirect source |
| 1 | Unresolved-auth cold load; single resolution per load; `returnTo` through password, OAuth, and expiry legs; Back-button after sign-in; unsafe targets rejected (`/\evil.com`, absolute cross-origin, `/auth` self-loop); OAuth denial and error return; rejected `getSession()` resolves signed-out at the 15s ceiling; stale stored target discarded | auth redirect source |
| 2 | `railCatalog.test.ts` route/flag pairing; both RC surfaces open on the same range | — |
| 3 | Index/body/fallback parity; stem-only vs second-stage body match; source-glob rejects generated artifacts; **mismatched build-generation** index/body pair falls back to the merged bank rather than serving a mixed pair; index and body types are not mutually assignable | index fallback, body-load failure |
| 4 | Every schema step re-run with a simulated legacy writer still active — trigger keeps direct inserts correct before revocation, flag mirror loses no toggle, saved-set dual-write loses no row; legacy session with only `passage_ids` backfills and dual-reads; cross-owner attempt quarantined before backfill; direct client insert cannot set `is_first_attempt`; duplicate first-attempt rejection; flag writes after RLS contraction; **raw unversioned** stored timing decodes as v1 while newly written v1 carries `v`; v2 budget for 1–8 question passages; completion RPC refuses a session with missing attempts; subset through resume, review, results, scoring, Drill Misses | duplicate-attempt rejection, dropped attempt write |
| 5 | Every `RC_FEATURES` and `RC_QUESTION_TYPES` entry renders in exactly one group, `group: null` under "Other"; saved-set union dispatch incl. legacy LR and Smart Builder rows; `mode` CHECK equality; selection-map add/promote/demote/remove/mode-switch rules; every legacy `/rc?passages=` and `/rc?count=` query form; stem-only fallback above **each** of the three ceilings, asserted on real request count and bytes; out-of-order search result discarded; every preset resolves non-empty; paging | search ceiling hit |

Gates that apply to **every** phase, per `AGENTS.md`:

- `npm run typecheck`, `npm run test`, and `npm run build` clean. `vite build` uses esbuild and ships type errors silently, so typecheck is not optional.
- Release goes through `.claude/safe-push.sh`, never a raw `git push` — Lovable auto-commits to `main` mid-session and a raw push races it.
- Any change under `src/components/` or `src/pages/` viewed running in the app with a screenshot or DOM check as evidence — never reported done on the diff alone.
- Picker work is responsive work: narrow, mid, wide, and sidecar-docked, verified **before** pushing.

The right-hand column above is **local diagnostics, not telemetry** — structured `console.warn` calls with a stable prefix so a failure is greppable in a session rather than silent. This product has no persistent error sink; adding one is a separate decision, and calling these "counters" would overstate what they are.

## Risks / open questions

- **Unverified in production.** The `redirectAfterAuth` double-fire was traced under React StrictMode, which is development-only. The bounce is certain in dev; whether `lsatprep.study` reproduces it needs a check against the live site. The `authReady` gap and the anonymous-render hole are production defects regardless.
- Phase 3 changes body access from synchronous to awaited across 17 components and 28 importing files. Largest regression surface in the plan.
- Phase 4 touches live tables and contracts RLS on a table with possibly-corrupt existing rows. Migration ordering against Lovable's auto-deploy needs care, and the duplicate audit must run against production data, not a local copy.
- The 5 unroutable LR question types are unresolved: retype them, add an explicit "Unclassified" bucket, or exclude them. Never backfill a tag to make the data look complete.
- **Redefining Standard pace is a product change, not a technical one.** Phase 4 makes a whole passage's budget vary with its question count. Joshua signs off the new student-facing copy before it ships.
- Second-stage search latency is bounded but unmeasured. The three ceilings are estimates from file sizes on disk; the first real measurement may move them.
- "My weak types" as a preset is deferred, not dropped — it needs per-student attempt history the picker does not have.

## Out of scope

Narrowed after Codex Round 2 — the earlier list excluded work the plan actually requires.

**Genuinely out:**

- The RC player's interaction design, annotations, and the adaptive *algorithm* (its data correctness is in scope — see Phase 4 step 30).
- Guided drill, bootcamp, and Activity Centre *features*. Their question-loading call sites are in scope for Phase 3 and must be migrated; nothing else about them changes.
- Any change to RC content, tags, or the conversion pipeline. The 548 source questions without answer choices stay excluded.
- Flipping TypeScript strict mode.
- The Lovable/GitHub sync model.
- Teacher assignment, deferred to its own plan (see Key decisions).

**Previously listed as out, now in:** the RC player and results pages (Phase 4 threads the subset through both), and the LR question-loading call sites in analytics, homework, guided drills, bootcamps, and adaptive selection (Phase 3).
