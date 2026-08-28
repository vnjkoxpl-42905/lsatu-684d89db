# Testing Centre change 2: practice-test runs live in Supabase, and legs are tagged, not guessed

Priority: second. This is the foundation the score-history, review, and teacher-visibility
work (changes 3 and 5) stands on.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`.
- `src/integrations/supabase/types.ts` is auto-generated. Do not hand-edit it. If the
  new table/columns are not in it yet, confine `as` casts to the one new store module.
- SQL migrations live in `supabase/migrations/` as `<timestamp>_<slug>.sql`. A migration
  in the repo is NOT applied to the live project by pushing — applying it to the live
  Supabase (via the Lovable-connected project) is an explicit deploy gate. Flag it loudly
  in your final report; do not claim the feature works in production until it is applied.

## The problem

1. **A sitting exists only in one browser.** Runs are stored purely in `localStorage`
   ([practiceTest.ts](src/lib/practiceTest.ts) ~lines 229-304). The "not found" page says so out loud
   (PracticeTestRun.tsx ~lines 226-237). A student who starts on a laptop cannot resume on
   an iPad; clearing site data deletes an in-progress test; a finished score report is
   unreachable after the localStorage entry goes.
2. **Nobody but the student can ever see a practice-test score.** Joshua (teacher/admin)
   has no visibility into the single number his students care most about.
3. **Leg results are matched by heuristic, not identity.** `readLrLegResult`
   ([practiceTestRunner.ts](src/lib/practiceTestRunner.ts) ~lines 113-136) matches "same user, same pt, same
   section, completed after the leg's startedAt". If a student walks out of leg 2 and
   later drills that same section standalone, the sitting silently absorbs that
   standalone result. `readRcLegResult` (~lines 144-178) has the same shape (passage-set
   match in a 5-row window).

## The change

### Step 1 — migration

Create `supabase/migrations/<timestamp>_practice_test_runs.sql`:

```sql
create table public.practice_test_runs (
  id uuid primary key,                       -- client-generated (crypto.randomUUID)
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pt int not null,
  pace text not null,
  legs jsonb not null,                       -- the PracticeTestLeg[] verbatim
  current_leg int not null default 0,
  break_after_leg int not null,
  break_taken boolean not null default false,
  break_started_at timestamptz,
  status text not null check (status in ('in-progress','complete','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.practice_test_runs (user_id, status);
alter table public.practice_test_runs enable row level security;
```

RLS policies: owner can select/insert/update/delete own rows (`user_id = auth.uid()`);
plus an admin-read policy. **Copy the admin-read pattern from an existing table's
policies rather than inventing one** — inspect how `section_history` or the inbox
tables grant admin/teacher access in earlier migrations under `supabase/migrations/`
and mirror it exactly.

Leg attribution columns, same migration:

```sql
alter table public.section_history
  add column practice_test_run_id uuid,
  add column practice_test_leg int;
alter table public.rc_drill_sessions
  add column practice_test_run_id uuid,
  add column practice_test_leg int;
create index on public.section_history (practice_test_run_id);
create index on public.rc_drill_sessions (practice_test_run_id);
```

### Step 2 — a run store with a server half

Create `src/lib/practiceTestStore.ts` (keep [practiceTest.ts](src/lib/practiceTest.ts) as the
pure domain module; move/wrap the localStorage CRUD here or re-export it):

- `saveRunRemote(run)` — upsert to `practice_test_runs` (id conflict target). Fire on
  every `savePracticeTestRun` call site, best-effort: server failure must never block
  the sitting (mirror the existing try/catch philosophy of the local store).
- `listRunsRemote()` / `loadRunRemote(id)` — owner-scoped selects.
- Merge rule, one function with unit tests: given a local run and a remote run with the
  same id, the one whose progress is further along wins (`status === 'complete'` beats
  in-progress; else higher `currentLeg`; else more legs with `completedAt`; tiebreak
  `updated_at`/`createdAt` recency). Never merge field-by-field.
- Local store stays as write-through cache and offline fallback. After a successful
  remote read, refresh the local copy.

Wire it:

- `TestingCentre.tsx` resume list: load local synchronously (today's behaviour), then
  reconcile with `listRunsRemote()` when it resolves and re-set state.
- `PracticeTestRunPage`: on local miss, try `loadRunRemote(runId)` before rendering the
  "not on this device" page. That page's copy then becomes a genuinely rare case; keep
  it but soften to "This sitting could not be found."
- `deletePracticeTestRun` (discard): also set the remote row `status = 'abandoned'`
  (do not hard-delete server-side; history is data).

### Step 3 — tag the leg sessions

- `lrLegLaunch` (practiceTestRunner.ts ~line 52): add to `state`:
  `practiceTest: { runId: run.id, legIndex }` (pass the leg's index in). Drill.tsx
  threads it through to the section-history insert (`persistSectionResults` from change
  1) so the row carries `practice_test_run_id` + `practice_test_leg`.
- `rcLegHref` (~line 78): append `ptRun=<runId>&ptLeg=<i>` to the query string. In the
  RC session-creation path (follow where `rc_drill_sessions` rows are inserted from
  RcPlayer's config; search `from('rc_drill_sessions')`), write the two columns when the
  params are present. Validate: uuid-shaped `ptRun`, integer `ptLeg`, else ignore.
- Readback becomes exact-match first: `readLrLegResult` / `readRcLegResult` gain a
  primary query on `practice_test_run_id = run.id and practice_test_leg = legIndex`
  (still owner-scoped). Keep the existing time-window heuristic as fallback ONLY when
  the exact query returns nothing, so runs started before this deploy still score.
- Store the matched runner row's id on the leg when read back (`sessionId?: string` on
  `PracticeTestLeg`) — change 3 needs it for review links.

### Step 4 — types

Regenerate `src/integrations/supabase/types.ts` through the project's normal codegen
path if available in this environment. If not, define narrow row types inside
`practiceTestStore.ts` and cast there (`supabase.from('practice_test_runs' as never)`
patterns are NOT acceptable — use a typed helper with one documented cast at module
top). Leave a `TODO` naming the regeneration.

## Tests

- `src/lib/practiceTestStore.test.ts`: the merge rule (complete beats in-progress;
  further leg beats earlier; recency tiebreak), and that a supabase failure surfaces as
  a null/fallback rather than a throw (mock the client like `src/lib/*.test.ts` files do).
- Extend readback tests: exact-match query attempted first; heuristic only on miss.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

With the migration applied to the live backend: start a sitting, confirm a
`practice_test_runs` row appears and updates as legs finish (check via the network tab
or a select); finish a leg and confirm the `section_history` row carries the run id;
open the run URL in a second browser profile signed in as the same user and confirm it
resumes. Screenshot each.

## Explicit deploy gate

The migration must be applied to the live Supabase project before this ships. Until it
is, the code must degrade to today's local-only behaviour (all remote calls are
best-effort). State in the final report whether the migration was applied or is pending.
