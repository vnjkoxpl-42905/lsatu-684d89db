# Student Access Tiers — implementation plan

Date: 2026-09-22
Status: APPROVED 2026-09-22; all seven stages built on branch feat/student-access-tiers
Owner: Jay 2
Source: `~/ai-os/brainstorms/2026-09-22-student-access-tiers.md` (full interview record)
Scope: the 13 `has_*_access` flags, a new tier layer above them, per-item assignment authorisation, the signup queue, and removal of the payment auto-grant.

---

## 1. What Joshua asked for

1. Three tiers he applies himself, like templates.
2. **Tier 1** — every feature on, indefinite.
3. **Tier 2** — he picks each feature, toggled individually, effect is instant.
4. **Tier 3** — strictly what he assigns, and nothing else.
5. A signup queue on his admin homepage with a checkmark / X per person.
6. Switch labels in plain English that say what they actually open.

## 2. Decisions locked in the grill (2026-09-22)

| # | Decision |
|---|---|
| 1 | A tier is a **template**. It sets the switches; the switches stay what the app checks. |
| 2 | **One tier per student.** No stacking. |
| 3 | **12 switches**, not 13 — the two Wrong answer switches merge. |
| 4 | Tier 1 = all 12 on, manual only, never expires. |
| 5 | Tier 1 is all-on **by definition**; turning any switch off relabels the student Tier 2. Label only, never access. |
| 6 | Tier 2 toggles persist as normal state. No snapshot is restored on leaving and returning. |
| 7 | Tier 3 = the floor plus assigned items only. |
| 8 | **The floor** = Classroom home, Messages, Schedule. |
| 9 | **Per item, never per feature.** Assigning one practice test must not open the Testing Centre. |
| 10 | Assigned work **authorises its own runner**, following the existing `BootcampGate` pattern. |
| 11 | **Access never changes by itself.** No expiry, no automatic upgrade or downgrade. |
| 12 | Payment no longer grants access. It raises a notification instead. |
| 13 | Signup queue lives on **both** Today and Students. |
| 14 | Queue holds new signups **and** everyone with no tier. |
| 15 | Checkmark assigns a tier. **X puts them on Tier 3**, which is functionally no access. |
| 16 | "No tier" = undecided. Same access as Tier 3, but sitting in the queue. |
| 17 | Migration: 19 → Tier 1, 6 → Tier 2 with toggles kept, 14 → Tier 3 **and they regain Messages and Schedule**. |
| 18 | A "practice test" means the **full sitting**. A section is a separate assignable kind. |
| 19 | Students never see tier names. |
| 20 | No history of tier changes. |
| 21 | Tiers control feature access only — nothing to do with pricing, rates or session length. |

## 3. What exists today (verified 2026-09-22)

- 13 boolean columns on `profiles`, **all defaulting to `true`**. A new signup gets the whole platform.
- `useUserPermissions` reads them; `ProtectedRoute` gates routes; `railCatalog` padlocks rail items. Admins bypass everything.
- `profiles` is in the `supabase_realtime` publication, so a switch change reaches an open tab immediately. **Joshua's "instant toggle" requirement is already satisfied.**
- `BootcampGate` is a working per-item gate: `/bootcamp/*` routes carry **no `ProtectedRoute` and no flag**, only an assignment check. This is the proven pattern Tier 3 copies.
- `grantStudentAccess.ts` fires on Stripe `checkout.session.completed` and switches on 9 of 13 flags automatically. This contradicts decision 11 and is removed in Stage 4.
- Per-feature toggle UI and Trial/Standard/Full templates already exist in `adminUsers.ts` and `AdminDashboard.tsx`, but `AdminDashboard` is **not mounted on any route**.
- `practice_test_runs` is self-started (`user_id` defaults to `auth.uid()`). There is **no** assignment path for a full practice test.

### The four mislabelled switches

| Label today | What it really gates | Target |
|---|---|---|
| Practice tests (`has_practice_access`) | `/sets` (saved Question Sets) | The Testing Centre |
| TA assignments (`has_ta_access`) | nothing — `/classroom/ta` uses `has_classroom_access` | TA worksheets |
| Wrong answers (`has_journal_access`) | `/journal`, opens if **either** journal flag is on | `/journal`, alone |
| Wrong answer journal (`has_waj_access`) | same page | retired |

## 4. Target switch set (12)

| Group | Label | Column | Gates |
|---|---|---|---|
| Practice | Drill | `has_drill_access` | `/drill`, `/rc*`, `/sets`, guided drill runners |
| Practice | Practice tests | `has_practice_access` | `/testing`, `/testing/test/:runId` |
| Practice | Activities | `has_activity_access` | `/activities*` |
| Practice | Bootcamps | `has_bootcamp_access` | `/bootcamps` index only |
| Review | Wrong answers | `has_journal_access` | `/journal*` |
| Review | Flagged questions | `has_flagged_access` | `/flagged*` |
| Review | Progress and history | `has_analytics_access` | `/analytics`, `/history` |
| Review | Export | `has_export_access` | export controls |
| Classroom | Classroom | `has_classroom_access` | classroom contents |
| Classroom | Messages | `has_chat_access` | `/inbox*` |
| Classroom | Schedule and booking | `has_schedule_access` | `/schedule`, `/booking` |
| Classroom | TA worksheets | `has_ta_access` | `/classroom/ta/:assignmentId` |

---

## 5. Build order

Stages 1–5 deliver a working tier system. Stage 6 is what makes Tier 3 mean what Joshua said. Stage 7 is the only genuinely new feature. Each stage is independently shippable and independently revertible.

### Stage 1 — Rewire the switches, merge the journal pair

**Code**
- `/testing` and `/testing/test/:runId`: `has_drill_access` → `has_practice_access`.
- `/sets`: `has_practice_access` → `has_drill_access`.
- `/classroom/ta/:assignmentId`: `has_classroom_access` → `has_ta_access`.
- `/journal`, `/journal/:qid`: drop the `has_waj_access` alternative, read `has_journal_access` only.
- `adminUsers.ts`: relabel per section 4, drop `has_waj_access` from the groups.
- `railCatalog.ts`: update the Testing Centre entry to `has_practice_access`.

**Migration — preserve effective access exactly**
```sql
UPDATE profiles SET
  has_practice_access = has_drill_access,              -- Testing Centre was drill-gated
  has_ta_access       = has_classroom_access,          -- TA route was classroom-gated
  has_journal_access  = has_journal_access OR has_waj_access;
```
`has_waj_access` is left in place but no longer read. Drop it in a later cleanup once the change has held.

**Known exception, and why it is safe.** Two students (Meghan Mullins, priyanka_nambiar@brown.edu) have Practice on and Drill off. Moving `/sets` under Drill means they lose saved Question Sets. A saved set without Drill is already a dead end — opening one launches `/drill`, which they cannot reach — so nothing usable is lost. No other student is affected.

**Verify.** Write a one-off script that computes every student's reachable routes before and after, and diff. The only permitted difference is the `/sets` case above.

### Stage 2 — The tier column and the template engine

**Migration**
- `profiles.access_tier text` — `NULL | 'tier_1' | 'tier_2' | 'tier_3'`, with a CHECK constraint. NULL means undecided.
- Add `access_tier` to `guard_profile_admin_fields()` so students cannot set it on their own row.
- **Drift trigger** (BEFORE UPDATE on `profiles`): if the row is `tier_1` and any of the 12 switches moves to false, set `access_tier = 'tier_2'`. Implemented in the database so it holds no matter which code path writes.

**Edge function** — `admin-manage-users` gains `set_tier`:
- `tier_1` → all 12 on.
- `tier_2` → leave switches untouched; record the label only.
- `tier_3` → floor on (`classroom`, `chat`, `schedule`), the other nine off.

**UI** — tier control on the Students page, in the expanded panel next to the existing access section. Selecting Tier 2 reveals the 12 toggles grouped as in section 4. Existing single-flag `toggle` action drives them; realtime already makes the effect instant.

### Stage 3 — Migrate the 41, change the defaults

**Migration**
```sql
-- Tier by current state, computed AFTER Stage 1's rewire
UPDATE profiles SET access_tier = 'tier_1' WHERE <all 12 on>;
UPDATE profiles SET access_tier = 'tier_3' WHERE <classroom only>;
UPDATE profiles SET access_tier = 'tier_2' WHERE access_tier IS NULL AND <not archived>;

-- The one deliberate widening (decision 17)
UPDATE profiles SET has_chat_access = true, has_schedule_access = true
WHERE access_tier = 'tier_3';

-- New signups start at the floor, undecided
ALTER TABLE profiles
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN has_chat_access      SET DEFAULT true,
  ALTER COLUMN has_schedule_access  SET DEFAULT true,
  ALTER COLUMN has_drill_access     SET DEFAULT false,
  -- ...and false for the remaining six
  ALTER COLUMN access_tier          SET DEFAULT NULL;
```

This is the change that finally closes the open front door: a stranger who signs up gets the floor and nothing else.

### Stage 4 — Payment stops granting access

- Remove the `grantStudentAccess` call from `booking-commerce-webhook/index.ts`.
- In its place, insert a `notifications` row (`type = 'payment_needs_tier'`) carrying the payer's email and amount.
- Delete `_shared/grantStudentAccess.ts` once nothing imports it.

**Risk worth stating plainly.** Until Stage 5 ships, a student who pays gets no access until Joshua acts. Stages 4 and 5 should ship together.

### Stage 5 — The signup queue

- Query: `profiles WHERE access_tier IS NULL AND archived_at IS NULL`, newest first, plus unread `type='signup'` notifications.
- One shared component rendered on **Today** and on **Students**.
- Per row: name, email, signup date, and two controls — a checkmark opening a Tier 1 / 2 / 3 picker, and an X that applies `tier_3`.
- Both write through `set_tier`, so the queue empties as decisions are made.

### Stage 6 — Per-item authorisation (this is what makes Tier 3 real)

A shared `<AssignmentGate>` modelled on `BootcampGate`: it checks that the signed-in student owns an assignment row of the right kind for the id in the route, renders the child if so, and otherwise falls through to the ordinary flag check. Admins bypass, as `BootcampGate` already does.

Applied to:
- `/section/:assignmentId` and `/classroom/:assignmentId` — homework and timed sections.
- `/classroom/item/:itemId` — the generic feed item.
- `/classroom/ta/:assignmentId` — TA worksheets.
- `/activities/:assignmentId` — Activities.
- `/guided/:assignmentId`, `/guided-drills/:slug` — guided drills.

**The hard part:** `/drill` is a shared runner behind `DrillLaunchGate`. It must accept a run that is authorised by an assignment rather than by `has_drill_access`. `launchDrill({kind:'assignment'})` already carries the assignment identity, so the gate reads that and authorises the single run — without opening `/drill` generally.

**Note on security.** These gates are route-level. The real protection on the data is RLS, which already scopes every assignment table by `student_id`. A Tier 3 student cannot read someone else's work regardless of this stage.

### Stage 7 — Assignable practice tests (new build)

The only part with no existing foundation.

- New table `practice_test_assignments`: `student_id`, `pt`, `assigned_by`, `assigned_at`, `unlock_at`, `status`, with RLS matching the other per-student assignment tables.
- A matching `classroom_items` row, `type = 'practice_test'`, so it appears in Assigned work like everything else.
- `TestingCentre` lists **only assigned PrepTests** for a student without `has_practice_access`, and the whole bank for one with it.
- `/testing/test/:runId` wrapped in `AssignmentGate`.
- The `practice_test_runs` INSERT policy must require either `has_practice_access` or a matching assignment row, so the API cannot be used to start an unassigned test.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Stage 1 silently changes who can reach what | Before/after reachability diff per student; only the documented `/sets` case may differ |
| Stage 3 changes column defaults — a mistake locks out every new signup | Ship behind Stage 5 so the queue exists to fix it, and test a real signup end to end |
| Stage 4 strands a paying student | Ship Stages 4 and 5 together, never 4 alone |
| Drift trigger fires on admin bulk updates and mass-demotes | Trigger checks for a transition to false on a `tier_1` row only; covered by a test |
| Tier 3 student hits a dead runner | Stage 6 covers all six routes at once; a partial Stage 6 reintroduces the exact bug this work exists to fix |

## 7. Open items, flagged not assumed

1. **Tier 3 drift.** Decision 5 covers Tier 1 only. If a Tier 3 student has a switch turned on beyond the floor, do they become Tier 2? Consistency says yes. **Not confirmed — needs Joshua.**
2. **Dropping `has_waj_access`.** Kept for now. Needs a follow-up cleanup once Stage 1 has held.
3. **Stage 7 sequencing.** Joshua declined to defer it. It is still the largest piece; if tiers are wanted sooner, this is the natural split point.

## 8. Out of scope

Student-visible tier names, tier change history, and any link between tiers and pricing, booking rates or session length — all explicitly declined (decisions 19, 20, 21).

## 9. Prerequisites outside this plan

1. The PR #130 migration is not applied to the live database.
2. The frontend is not published to lsatprep.study.

Both block anything here from being visible.

## 10. Build notes (2026-09-22)

Corrections found while building, against sections 3 and 5:

- **Defaults were already locked.** Live `profiles` defaults are Messages and Schedule on, everything else off, Classroom included. Section 3 said all true. Stage 3 therefore only moves the Classroom default to on.
- **Tier 3 drift answered by default.** Open item 1 took the consistent answer: any switch away from the Tier 3 floor relabels the student Tier 2, same as Tier 1. Enforced by `profiles_access_tier_drift()`.
- **Saved Sets moves for four students, not two.** Meghan Mullins and priyanka lose `/sets` (no Drill, so it was a dead end). Sandra and Ivory Johnson gain it (Drill on, Practice off). Verified with a per-student reachability diff over the 41-row snapshot.
- **The 14 Tier 3 students lose the TA-worksheets switch** (it followed Classroom). Their own assigned worksheets still open through `TAAssignmentGate`, so no reachable worksheet is lost.
- **Stage 6 is smaller than planned.** `/section`, `/classroom/:id`, `/classroom/item/:id` and `/guided/*` already open on Classroom, which Tier 3 keeps. Gated per item: `/activities/:assignmentId`, `/classroom/ta/:assignmentId`, `/drill`, `/rc*`, `/testing`, `/testing/test/:runId`.
- **Practice-test sittings live in the browser**, not in `practice_test_runs`, so the route gate is the real enforcement; the new insert policy is a backstop.
- **Archive and reset clear the tier** to undecided, so a returning student lands in the signup queue.

