# Testing Centre change 2: practice-test runs live in Supabase, and legs are tagged, not guessed

_Revised after Codex adversarial review rounds 1 and 2 (see plans/testing-centre-review-log.md)._

Priority: second. This is the foundation the score-history, review, and teacher-visibility
work (changes 3 and 5) stands on. **This plan also owns the pure remaining-time
reconstruction (`legRemainingSeconds` + `remainingMs` in the timer config) that reload
recovery needs** — review round 2 caught a circular dependency where this plan's browser
gate required change 4's math while change 4 required this plan's URL params. The
deadline math is pure and small; it lives here. Change 4 builds the hard stops, pause
removal, and RC wall-clock on top.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`.
- `src/integrations/supabase/types.ts` is auto-generated. Do not hand-edit it. If the
  new table/columns are not in it yet, confine `as` casts to the one new store module.
- SQL migrations live in `supabase/migrations/` as `<timestamp>_<slug>.sql`.

## Deploy gate (strict, decided in review round 2)

**The migration is a prerequisite for deploying this code, not a nice-to-have.** The
new insert payloads (attribution columns) and exact-match queries fail outright against
the old schema — there is no graceful degradation worth building. Sequence: write the
migration, apply it to the live Supabase project (via the Lovable-connected project),
verify the columns exist, THEN push the code. If you cannot apply the migration in this
environment, stop at the ready-to-apply state and say so explicitly; do not push code
that assumes the new schema.

**This change and change 4 ship together, in one deploy.** Reordering the program to
1 -> 2 -> 4 -> 3 (round 3) stops change 3 from minting official scores before clock
integrity exists, but it does NOT close the window on its own, because runs outlive
deploys: a run can start after change 2 lands, sit one or more legs under the old
resettable clock, survive the change-4 deploy in flight, and then receive an official
snapshot once change 3 lands. Ordering the deploys does not order the sittings. **Decision: changes 2 and 4 deploy as a single release. This is mandatory, not a
preference.** The alternative — a `clock_integrity` marker on runs created after change
4 — was considered and rejected: carrying it properly means adding the column and the
model field, threading a second distinct reason through change 3's `estimate` path, and
teaching change 5's trajectory and teacher surfaces to label or exclude those
nonstandard scores. That is a schema-and-surface change across three plans to support a
deploy split that buys nothing. Ship them together and no run can exist in the gap.

If for some reason they cannot ship together, STOP and re-plan rather than improvising a
marker — do not deploy change 2 alone and sort it out later.

## The problem

1. **A sitting exists only in one browser, and is not even scoped to an account.** Runs
   are stored purely in `localStorage` ([practiceTest.ts](src/lib/practiceTest.ts) ~lines 229-304)
   under keys containing only the run id, and `PracticeTestRun` has no owner field. A
   second account signing in on the same browser sees the first account's sittings and
   scores. Clearing site data deletes an in-progress test.
2. **Nobody but the student can ever see a practice-test score.** Joshua (teacher/admin)
   has no visibility into the single number his students care most about.
3. **Leg results are matched by heuristic, not identity.** `readLrLegResult`
   ([practiceTestRunner.ts](src/lib/practiceTestRunner.ts) ~lines 113-136) matches "same user, same pt, same
   section, completed after startedAt"; a standalone drill of the same section gets
   silently absorbed. `readRcLegResult` (~lines 144-178) has the same shape.
4. **An LR leg cannot survive a reload.** Full-section context travels only in
   `location.state` (Drill.tsx ~lines 133-145); reload `/drill` mid-leg and Drill
   redirects away.

## Schema reality check (do this before writing the migration)

The repo's migrations for `section_history` have drifted: `20251020135043_*.sql`
creates it with `section_mode NOT NULL` and no `mode` / `completed_at` / `user_id`;
`20260406070119_*.sql` has a differently-shaped `CREATE TABLE IF NOT EXISTS` (skipped
when the first ran) plus `ALTER ... ADD COLUMN user_id` (nullable, no default). The app
inserts `mode` and queries `completed_at`, so the LIVE schema is the authority.
**Introspect the live table first** (`information_schema.columns` via the Supabase
dashboard/MCP) and make the migration below converge it.

## The change

### Step 1 — migration

Create `supabase/migrations/<timestamp>_practice_test_runs.sql`.

**1a. Normalize `section_history` explicitly** (guarded so it converges any starting
point — this is the round-1/round-2 demand that a clean replay work):

**Add-backfill-then-default, in that order.** `ADD COLUMN ... DEFAULT` fills every
existing row with the default, which would overwrite history (`section_mode` values,
real completion times) before the backfill runs:

```sql
alter table public.section_history
  add column if not exists mode text,
  add column if not exists completed_at timestamptz,
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.section_history set mode = coalesce(mode, section_mode, 'full-section')
  where mode is null;
update public.section_history set completed_at = created_at where completed_at is null;
alter table public.section_history alter column mode set default 'full-section';
alter table public.section_history alter column completed_at set default now();
alter table public.section_history alter column section_mode drop not null;
```

Also tighten the INSERT RLS. **Supplementing is not enough and must not be done.**
PostgreSQL ORs permissive policies together, so adding a second policy that requires
`user_id = auth.uid()` leaves the existing class-only policy as a live bypass — the
weaker rule still admits the row. The composite FK below is moot if that path stays
open. Enumerate and DROP every legacy INSERT policy on the table, then create exactly
one that requires both predicates:

```sql
-- enumerate first; the migration must name each one it drops
select polname from pg_policy
  where polrelid = 'public.section_history'::regclass and polcmd = 'a';

drop policy if exists "<each legacy insert policy name>" on public.section_history;

create policy "section_history_owner_insert" on public.section_history
  for insert with check (
    user_id = auth.uid()
    and <the canonical class predicate the legacy policy used>
  );
```

Verify afterwards that `polcmd = 'a'` returns exactly one row for this table. If
introspection turns up an insert path that legitimately needs different attribution
(a service-role or admin importer), express it as its own explicit policy naming that
role — never by leaving the old class-only rule in place.

(Adjust to what introspection shows — e.g. skip statements for columns the live table
already has — but the committed migration must contain the full convergent set so a
clean replay produces the schema the code needs.)

**1b. The runs table.** Run ids are TEXT (the `newRunId()` fallback is not a uuid).

```sql
create table public.practice_test_runs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pt int not null,
  pace text not null,
  legs jsonb not null,
  current_leg int not null default 0,
  break_after_leg int not null,
  break_taken boolean not null default false,
  break_started_at timestamptz,
  status text not null check (status in ('in-progress','complete','abandoned')),
  revision int not null default 0,
  completed_at timestamptz,
  raw_correct int,
  raw_total int,
  scaled_score int,
  score_source text check (score_source in ('official-table','estimate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on public.practice_test_runs (user_id, status);
alter table public.practice_test_runs enable row level security;
```

The `unique (id, user_id)` exists solely as the target of the composite FKs below —
it makes cross-user attribution impossible at the schema level.

**`updated_at` trigger:** search migrations for an existing `set_updated_at` /
`handle_updated_at` function and reuse it; if none exists, create one here and attach.

**RLS — exact policies:**

```sql
create policy "pt_runs_owner_select" on public.practice_test_runs
  for select using (user_id = auth.uid());
create policy "pt_runs_owner_insert" on public.practice_test_runs
  for insert with check (user_id = auth.uid());
create policy "pt_runs_owner_update" on public.practice_test_runs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pt_runs_admin_select" on public.practice_test_runs
  for select using (public.has_role(auth.uid(), 'admin'));
```

`public.has_role(uuid, app_role)` exists (`20260415210932_*.sql`). **No DELETE policy
for anyone.** Terminal-state protection beyond RLS is enforced by the client-side
transition rules in Step 3 (all writes are status-filtered conditional updates); a
hostile owner editing their own row via the API can corrupt only their own history,
which is acceptable at this scale — do not build a transition-validating RPC for it.

**1c. Leg attribution — ownership-safe, idempotent:**

```sql
alter table public.section_history
  add column if not exists practice_test_run_id text,
  add column if not exists practice_test_leg int check (practice_test_leg >= 0),
  add constraint section_history_pt_run_fk
    foreign key (practice_test_run_id, user_id)
    references public.practice_test_runs (id, user_id),
  add constraint section_history_pt_pair_chk
    check ((practice_test_run_id is null) = (practice_test_leg is null));
alter table public.rc_drill_sessions
  add column if not exists practice_test_run_id text,
  add column if not exists practice_test_leg int check (practice_test_leg >= 0),
  add constraint rc_sessions_pt_run_fk
    foreign key (practice_test_run_id, user_id)
    references public.practice_test_runs (id, user_id),
  add constraint rc_sessions_pt_pair_chk
    check ((practice_test_run_id is null) = (practice_test_leg is null));
create unique index if not exists section_history_pt_leg_once
  on public.section_history (practice_test_run_id, practice_test_leg)
  where practice_test_run_id is not null;
create unique index if not exists rc_sessions_pt_leg_once
  on public.rc_drill_sessions (practice_test_run_id, practice_test_leg)
  where practice_test_run_id is not null;
```

The composite FK means a row can only attach to a run the SAME user owns; the pair
check closes the run-id-without-leg hole; the partial unique indexes make a duplicate
leg row impossible. (Verify `rc_drill_sessions.user_id` is uuid and non-null in the
live schema; adapt if not.)

**Two FK-bypass holes the review caught — close both:**

- `section_history.user_id` is nullable, and PostgreSQL's default `MATCH SIMPLE`
  skips composite-FK validation when any referencing column is NULL — so an
  attributed row with a null `user_id` would sail past the FK and consume a run-leg
  slot. Add: `alter table public.section_history add constraint
  section_history_attr_owner_chk check (practice_test_run_id is null or user_id is not null);`
- `rc_attempts` references sessions by `session_id` alone while its RLS validates only
  the attempt's own `user_id` — a user can attach attempts to another user's session.
  Add `unique (id, user_id)` on `rc_drill_sessions` and a composite FK
  `(session_id, user_id) references rc_drill_sessions (id, user_id)` on `rc_attempts`
  (verify `rc_attempts.user_id` exists and is set by the app; adapt if it is not).

**1d. RC first-attempt integrity** (round-2 finding: `recordAttempt` is
read-then-insert with no constraint, so racing writes can double-count):

Existing data may already hold duplicates (the live path is read-then-insert), and a
unique index build fails on them — dedupe first, deterministically, then index:

**Demote, do not delete.** A duplicate is a real attempt the student made; only its
`is_first_attempt` flag is wrong. Deleting it destroys RC attempt history that the
review surfaces legitimately show as a later attempt. And `ctid` is physical row
location, not chronology — ordering by it can retain the wrong row as "first". Rank
explicitly and demote the losers:

```sql
with ranked as (
  select id,
         row_number() over (
           partition by session_id, question_id
           order by created_at asc, id asc
         ) as rn
  from public.rc_attempts
  where is_first_attempt
)
update public.rc_attempts a
  set is_first_attempt = false
  from ranked r
  where a.id = r.id and r.rn > 1;

create unique index if not exists rc_attempts_first_once
  on public.rc_attempts (session_id, question_id)
  where is_first_attempt;
```

`order by created_at asc, id asc` makes the winner deterministic even when timestamps
tie. If `created_at` turns out not to exist on this table, introspection will say so —
fall back to `id` alone, never to `ctid`. Make the RC attempt insert conflict-safe
(on conflict do nothing / treat 23505 as already-recorded) where `is_first_attempt`
rows are written, and test the migration against a fixture containing duplicates,
asserting both that exactly one row per (session, question) keeps the flag AND that
no row was deleted.

**1e. Stale-run RPC** (used by change 5, created here so one migration carries all DDL):

```sql
create or replace function public.abandon_stale_practice_tests(
  exclude_ids text[] default '{}'
)
returns setof text language sql security invoker as $$
  update public.practice_test_runs
     set status = 'abandoned', revision = revision + 1
   where user_id = auth.uid()
     and status = 'in-progress'
     and updated_at < now() - interval '14 days'
     and not (id = any(coalesce(exclude_ids, '{}')))
  returning id;
$$;
```

Server `now()`, owner-scoped, terminal-respecting (filters on in-progress). The
`exclude_ids` parameter exists for change 5: a run whose dirty retry failed still looks
stale (its offline progress never landed to refresh `updated_at`), and abandoning it
server-side would let the terminal-wins reconcile destroy that progress. Change 5 passes
those ids here. The default keeps the no-argument call valid.

### Step 2 — the run model: owner, revision, and a mutation coordinator

In practiceTest.ts / a new coordinator:

- `PracticeTestRun` gains `userId: string` and `revision: number` (plus the optional
  terminal snapshot fields). Local keys become `lsatu:practice-test:<userId>:<runId>`;
  `listPracticeTestRuns(userId)` filters; a cached run whose `userId` mismatches the
  session is never listed or loaded. **Ownerless old-format keys are IGNORED, never
  adopted** — silently assigning them to whoever signs in next is the account-leak the
  review flagged. (They become unreachable; acceptable, the feature is days old.)
- **All mutations go through one coordinator** (`mutateRun(runId, transition)` in the
  new store) that loads the canonical run, applies the transition, increments
  `revision` exactly once per logical transition, saves locally, and schedules the
  remote save. Callers use the returned run; nothing else calls `savePracticeTestRun`
  directly. Sync metadata (`dirty`, `baseRevision` — the last server-acknowledged
  revision) lives OUTSIDE the revisioned payload, in a sidecar object under the same
  local key, so persistence bookkeeping never bumps `revision`.

### Step 3 — the server store

`src/lib/practiceTestStore.ts`:

- `saveRunRemote(run, baseRevision)` — INSERT on first save. Thereafter a conditional
  update: `.eq('id', id).eq('user_id', userId).eq('revision', baseRevision)`, and for
  any status transition additionally `.eq('status', <expected prior status>)` so
  `complete` and `abandoned` are terminal server-side: an in-progress write can never
  overwrite a terminal row. **Both failure shapes take the same recovery path**: a
  zero-row conditional update AND a 23505 on the INSERT (two devices racing the first
  save) → fetch the server row, reconcile, **rebase** to `serverRevision + 1`, retry
  once (round-2 finding: CAS against `run.revision - 1` deadlocks after two unsynced
  local saves; the base is what the server last acknowledged, tracked in the sidecar).
  A run that still cannot save stays dirty — never dirty-forever on a swallowed 23505.
- **Any transition to `complete` stamps `completed_at`** (the coordinator sets it with
  the status flip; change 3's finalizeRun later adds the score fields). A completed
  run without a completion date breaks every downstream surface.
- Reconcile rule (pure, unit-tested), in three cases — the distinction between the
  second and third is load-bearing and was missed until round 4:
  1. **Terminal beats non-terminal.** A terminal run (complete or abandoned) always
     beats an in-progress run regardless of revision.
  2. **Terminal statuses that CONFLICT: the server wins.** `complete` on one device
     versus `abandoned` on another must converge on what the server accepted first,
     or the loser stays dirty forever. The status is then immutable.
  3. **Terminal statuses that MATCH: reconcile normally by revision.** Two rows both
     `complete` are not a conflict — they are the same decision, and the newer one is
     usually a legitimate *enrichment* of the older: change 3's `finalizeRun` adds
     `raw_correct`/`raw_total`/`scaled_score`/`score_source`, and this change derives
     `completed_at` for legacy rows. Blanket "server always wins between terminals"
     would discard every one of those on the next reload and make change 3's
     finalization un-retryable in exactly the case it must be retryable. So: keep the
     already-committed terminal STATUS immutable, and reconcile the remaining fields
     by higher revision — but **enrichment is monotonic and never subtractive.**
     Selecting the whole higher-revision row would let a newer offline row that has no
     snapshot overwrite a server row that already carries `scaled_score` and
     `completed_at`, erasing an official score with a stale local copy. Once the server
     holds a non-null `completed_at` or score snapshot, those fields are immutable:
     reconciliation may FILL them when absent, never clear or replace them. Implement
     it as a field-level floor on exactly these terminal fields (the "never merge
     field-by-field" rule still governs everything else). Test: server row complete
     WITH a snapshot, local row complete at a higher revision WITHOUT one, reconcile,
     assert the snapshot survives.
  Between two non-terminal candidates, higher revision wins, then more legs with
  `completedAt`, then recency. Never merge field-by-field — case 3 still selects a
  whole row, it just selects on revision rather than reflexively on origin.
- **Saves are serialized per run, and `dirty` is cleared only by a matching
  acknowledgement.** Nothing in the scheduling above orders two in-flight saves, so an
  older save can acknowledge AFTER a newer save has already failed and re-marked the
  run dirty — clearing `dirty` on a mutation that never reached the server, which then
  looks synced forever. Two requirements: (a) hold a per-run promise chain so save N+1
  never starts before save N settles; (b) have every acknowledgement carry the revision
  it was sent with, and clear `dirty` only when that equals the current local revision.
  If the local revision has moved on, the run STAYS dirty and the newer revision is
  scheduled. These are two separate guarantees and need two separate tests — once saves
  are serialized, B cannot resolve before A, so a single interleaving test cannot cover
  both: (i) an ORDERING test asserting save B never starts until save A settles; and
  (ii) a STALE-ACKNOWLEDGEMENT test that delivers an acknowledgement carrying an older
  revision than the current local one and asserts the run stays dirty.
- Failure handling: failed remote save → sidecar `dirty: true`; Testing Centre and
  PracticeTestRun retry dirty runs on load; the resume list shows a quiet "not yet
  synced to your account" line on dirty rows. **Discard keeps a dirty local tombstone**
  (the abandoned run + sidecar) until the remote abandon transition is confirmed, then
  deletes it — otherwise a failed abandon resurrects on the next remote list.

Wire it:

- `TestingCentre.tsx`: load local, reconcile against `listRunsRemote()`, write winners
  back to both stores.
- `PracticeTestRunPage`: **always** load both local and remote and reconcile before
  rendering or mutating — not remote-only-on-local-miss.

### Step 4 — tag the leg sessions, in the URL, so legs survive reload

- **The pure deadline math lives here** (moved from change 4): add
  `legRemainingSeconds(leg, pace, now)` to practiceTest.ts (fresh leg ≈ full budget;
  past-deadline clamps to 0; untimed → null; future/garbage `startedAt` clamped to
  "now"), add optional `remainingMs` to `FullSectionConfig`'s timer shape, and extend
  `getTimerConfigForDrillRoute` ([drillRouteState.ts](src/lib/drillRouteState.ts) ~lines 91-117) so a
  present `remainingMs` overrides the mode-derived duration. `lrLegLaunch` computes
  `remainingMs` from the stamped leg. (Change 4 adds stamp-once, hard stops, and pause
  removal on top.)
- `lrLegLaunch`: navigate to `/drill?ptRun=<runId>&ptLeg=<i>` with config still in
  `location.state` for the fast path (change 1 already put `ptRun: {runId, legIndex}`
  in that state; the URL parameters are what survive a reload).
- **The reconstruction needs an asynchronous bootstrap boundary, and Drill.tsx does not
  have one today.** The outer `Drill` component ([Drill.tsx](src/pages/Drill.tsx) ~line 3999)
  constructs `TimerProvider` synchronously, and `DrillContent` resolves route state
  synchronously — so on a reload it sees no `location.state`, decides the route is
  invalid, and redirects before any asynchronous run fetch could reconstruct it. Adding
  an `await` inside the existing component does not fix this; the redirect has already
  happened. Restructure instead:
  - Add a parent bootstrap component that owns the async work: read `ptRun`/`ptLeg` from
    the URL, load the run via the store (local + remote, reconciled), and validate it
    (see the validation set below).
  - **Validate hard — `ptLeg` is student-editable.** Ownership, leg-in-range, and
    in-progress are not enough: a hand-edited `ptLeg` could start a future leg, restart
    a completed one, or open an RC leg through the LR runner, consuming that leg's
    single result slot. Require ALL of: run owned by the current user; run
    `status === 'in-progress'`; `ptLeg === run.currentLeg` (never an arbitrary index);
    the leg's `kind` matches the runner being entered (LR here, RC in RcPlayer); the
    leg has a valid `startedAt`; and the leg has no `completedAt`. Take the section
    number, passage set, and pace from the RUN, never from the URL — the URL supplies
    identity only. Any failure takes the existing redirect.
  - While that is pending, render the drill's existing loading state. Render NOTHING
    that redirects, and do not construct `TimerProvider` yet — a timer built from a
    mode-derived duration and then corrected once `remainingMs` arrives is precisely
    the clock leak change 4 exists to close.
  - Only once the run resolves, construct `TimerProvider` and `DrillContent` with the
    rebuilt `full-section` config (`remainingMs` from `legRemainingSeconds`) and
    `drillReturnTo` already set.
  - If validation fails, fall back to the existing redirect. If the URL carries no
    `ptRun` at all, this bootstrap is a pass-through and the standalone drill path is
    untouched — verify that explicitly, since every standalone drill renders through it.
- **LR resume identity**: `drillResumeKey` currently keys full sections by pt+section
  only, so a sitting, a standalone section, and a second sitting of the same PT collide
  and can hydrate each other's answers. Namespace the resume key for sitting legs with
  `userId:runId:legIndex`.
- **RC is get-or-create, not insert-always.** `rcLegHref` appends
  `ptRun=<runId>&ptLeg=<i>`. The RC session-creation path (`RcHubSurface.start()` /
  wherever `rc_drill_sessions` rows are inserted) writes the attribution columns when
  present and valid; on unique violation (23505) it must FETCH the existing session for
  that run+leg and resume/navigate to it — treating the violation as bare success gives
  the student no session to land in. The run/leg attribution is persisted on the
  session row and returned by the session-load path (`getSession` or equivalent), so
  RcPlayer can reach the authoritative run and leg without trusting query params —
  change 4's clock depends on this.
- Persistence: `persistSectionResults` (change 1) writes
  `practice_test_run_id` + `practice_test_leg`; unique violation = already recorded.
- Readback: exact match first, time-window heuristic only for pre-deploy runs. Store
  the matched row's id on the leg (`sessionId?: string`) for change 3.

### Step 5 — types

Regenerate `src/integrations/supabase/types.ts` through the normal codegen if
available; otherwise narrow row types with one documented cast at the top of
`practiceTestStore.ts` and a `TODO` naming the regeneration.

## Tests

- `src/lib/practiceTestStore.test.ts`: reconcile rule (terminal always beats
  in-progress, revision order among non-terminal, no field merging); CAS retry path
  (zero-rows → fetch → reconcile → rebase to serverRevision+1 → one retry); dirty-flag
  and tombstone behaviour; owner-mismatch rejection; ownerless-key ignore.
- Coordinator: one revision increment per logical transition; sidecar changes never
  bump revision.
- `legRemainingSeconds` pure tests; `drillRouteState.test.ts` for `remainingMs`.
- Readback: exact-match first, heuristic on miss, 23505 as success, RC get-or-create
  fetch on conflict.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

With the migration applied: start a sitting; confirm the runs row advances
(revision/updated_at) as legs finish; finish a leg and confirm attribution columns +
that a forced duplicate insert is rejected; reload `/drill` mid-LR-leg and confirm
reconstruction with a REDUCED clock; re-enter an RC leg and confirm it resumes the same
session rather than creating a second; open the run URL in a second profile as the same
user and confirm resume; sign in as a different user and confirm the first account's
runs are invisible; discard a run offline and confirm the tombstone syncs the abandon
when connectivity returns. Screenshot each.
