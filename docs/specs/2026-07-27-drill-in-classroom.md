# Spec — Drill lives in the Classroom frame

Status: frozen for implementation. Written 2026-07-27.
Author: Claude (spec + review). Implementer: Codex.

---

## 0. Scope lock

This spec does exactly two things.

**Part A** — the Drill item in the Classroom rail stops swapping the student into a
different-looking product. The page it opens gets re-hosted inside the Classroom
frame, keeping the Classroom rail mounted. Its contents do not change.

**Part B** — a student who signs in lands on the Classroom instead of the old hub.

**Part C** — the Classroom rail gains an admin-only group, so the three
teacher destinations that only exist on the old sidebar don't become
unreachable as traffic moves off it.

**Part D** — the Classroom rail's items gain a locked state, so a student can see
what exists without the nav pretending they can use it.

Anything not named in sections 1, 3, 5, 7 or 8 is out of scope. Do not restyle,
refactor, retire, or "clean up" anything else while in these files. If a change
seems obviously worth making but is not specified here, leave it and note it.

---

## 1. The hard boundary — the LSAT question experience is frozen

The screen where a student actually answers LSAT questions **does not change in
any way.** Not visually, not behaviourally, not structurally.

Frozen files. These must have a **zero-line diff** when the work is done:

- `src/components/drill/official/OfficialQuestionPane.tsx`
- `src/components/drill/official/OfficialDrillFrame.tsx`
- `src/components/drill/official/OfficialDrillToolbar.tsx`
- `src/components/drill/official/OfficialSessionStrip.tsx`
- `src/components/drill/official/OfficialSmartDrillBar.tsx`
- `src/components/drill/official/OfficialAnswerNavigator.tsx`

Specifically unchanged: the passage/stimulus and its typography and white
background; the question stem; the five answer choices and their lettering,
spacing, hit areas, selection, elimination and correct/incorrect styling; the
two-column layout and its column widths; the dark strip across the top of the
screen; the toolbar with the highlighters, font-size control and timer; the
End / Explanation / Skip / Submit row; highlighting, flagging, keyboard
shortcuts, timing, and every write to `attempts`, `flagged_questions` and the
wrong-answer journal.

This surface is what a student trains against for hours and it is the part that
has to match the real exam. It is already right. Changing it has no upside and
large downside. **A diff that touches those six files is a failed
implementation, not a judgement call.**

`src/pages/Drill.tsx` is 3724 lines with no render-level test coverage. The only
permitted edit to it is the two-line navigation change in section 3.3. Nothing
else in that file moves.

---

## 2. The problem

Clicking **Drill** in the Classroom rail (`ClassroomLayout.tsx:173`) calls
`go("/drill")` with no route state and no query params. `Drill.tsx:330` requires
a mode:

```tsx
React.useEffect(() => {
  if (!state?.mode) { navigate('/mainhub'); return; }
```

So it bounces immediately to `/mainhub`. `/mainhub` renders `AcademyMainhub`
inside `StudentShell`, which is a different sidebar and a dark visual language.
The student clicks Drill and the entire product changes around them.

Two separate defects, and only one is being fixed here:

1. The rail button dead-ends. (fixed — Part A)
2. Drill escapes the Classroom frame during questions. (**not** fixed, and not a
   defect — a full-page takeover during questions is intended. See section 4.)

---

## 3. Part A — re-host the drill hub inside the Classroom frame

### 3.1 What the student gets

Clicking **Drill** keeps them in the Classroom: same rail, same position in it,
rail never unmounts. The centre of the page shows the drill hub content that
today lives at `/mainhub` — the hero with **Start Smart Drill**, the
PrepTest / Section / Question picker with question-text search, the **Practice
Tools** panel with **Full Section** and **Build a Set**, the insight/practice-volume
block, and the **Today / Next up** column.

From there, starting a drill takes over the full page for the questions, exactly
as it does today. Finishing or leaving returns them to the Classroom.

### 3.2 The content is visually identical — this is a re-host, not a restyle

**Decided explicitly: the panels stay dark.** Every card keeps its current
colours, layout, size, wording, imagery (including the Spline robot hero) and
behaviour. Nothing is re-themed to the Classroom's warm palette. The only thing
that changes is which page frame wraps them.

This is deliberate and it is understood that dark cards will sit against the warm
cream page and warm rail. Do not "fix" that. Do not introduce
`--classroom-*` tokens into this content. Do not adjust the dark surfaces for
contrast against the new background.

The cheapest correct implementation is to render the **existing**
`AcademyMainhub` component in the new route rather than copying its markup.
Reuse guarantees identical output and means one component to maintain.

`AcademyMainhub` depends on `useOrbitalActive` from `OrbitalActiveContext`. That
provider is mounted app-wide at `App.tsx:160`, above both shells, so the
component works unchanged inside `ClassroomLayout`. Verify this rather than
assuming it.

### 3.3 The changes

**a. New route inside the Classroom frame.** In `src/App.tsx`, add a branch to
the existing pathless `<Route element={<ClassroomLayout />}>` block (around
line 356) — the one described by
`docs/adr/0004-classroom-frame-is-one-pathless-layout-route.md`. Read that ADR
before touching routing.

Path: `/classroom/drill`, as a child of the existing `/classroom` route so it
inherits the `has_classroom_access` guard, plus its own
`has_drill_access` guard to match the rail item's existing gate.

**It must go inside the one existing `ClassroomLayout` route.** Adding a second
sibling route that mounts its own `<ClassroomLayout />` unmounts and remounts the
rail — the exact shell-swap this design exists to eliminate. This was built the
wrong way once already and caught only by a DOM-identity assertion.

`/mainhub` keeps working and keeps rendering `AcademyMainhub` in `StudentShell`.
Nothing else that links there is touched.

**b. Point the rail at it.** In
`src/components/classroom/shell/ClassroomLayout.tsx:173`, change the Drill
button's target from `/drill` to `/classroom/drill`. Nothing else in that file
changes. The item keeps its position under **STUDY**, its label, and its active
styling.

**c. Return to the Classroom on exit.** In `src/pages/Drill.tsx`, the two
`navigate('/mainhub')` calls at **line 332** and **line 3408** become
`navigate('/classroom')`. That is the entire permitted edit to this file.

- Line 332 is the no-mode bounce. After this change a student who somehow reaches
  `/drill` without a mode lands back in the Classroom rather than the old hub.
- Line 3408 is the exit path from the drill session.

Leave the existing leave-confirmation dialog exactly as it is — same copy, same
buttons, same trigger. Only the destination changes.

The score report, blind review and section-complete screens stay **exactly** as
they are, inside the full-page takeover. They are not moved into the Classroom
frame. They live in the same file as the drilling code and rebuilding them is not
worth the risk.

### 3.4 What is not being done

- The dark `/mainhub` page is **not** retired. Other surfaces still link to it.
  Retiring it is a separate job with its own blast radius.
- No new setup or configuration screen is built.
- `ModeSelector.tsx`, `TypeDrillPicker.tsx` and `ConfidenceSelector.tsx` have no
  importers and stay dead. Do not revive or delete them here.
- `/practice` is untouched and stays in `StudentShell`.
- The `Today / Next up` column stays on this page even though Classroom Home
  shows the same assignments. Duplication is accepted, decided explicitly.

---

## 4. Why the takeover during questions is kept

`App.tsx:329` states that question-doing stays outside the persistent shell, and
that stands. During questions the rail is gone by design: the student is doing
timed exam work and the surrounding furniture is a distraction. The complaint
being fixed is that *getting to* a drill threw them into a different product —
not that the exam screen is full-bleed.

So the shape is: **Classroom frame → full-page takeover for questions → back to
the Classroom frame.** The takeover is bookended, not eliminated.

---

## 5. Part B — sign-in lands on the Classroom

`src/lib/authRedirect.ts` is the single chokepoint for where a freshly
authenticated user lands, used by `Auth.tsx` (both the post-signin handler and
the user-watcher effect) and `ResetPassword.tsx`.

Change the default landing at **line 61** from `/mainhub` to `/classroom`.

Everything else in that function is preserved exactly:

- the `returnTo` / `next` short-circuit at the top still wins
- the onboarding gate still sends users with no `onboarding_completed_at` to
  `/onboarding`
- the fail-open behaviour on a failed profile lookup still falls through to the
  default landing — which is now `/classroom`

Update the function's doc comment, which currently names `/mainhub` twice, so it
does not go stale.

**Access check before you finish.** `/classroom` is guarded by
`has_classroom_access` with `allowSignedIn`. Confirm a signed-in user without
that flag still gets a sensible screen rather than a redirect loop or a blank
page, and report exactly what they see. If it is a loop or a blank, stop and
report — do not invent a fallback.

---

## 6. The old sidebar does not come along

`/mainhub`'s dark left sidebar is `src/components/mainhub/MainhubSidebar.tsx`,
rendered by `StudentShell` — it is **not** part of the page content. Rendering
`AcademyMainhub` inside `ClassroomLayout` means it never mounts. No code is
needed to remove it; do not add any.

Its student destinations are already covered by the Classroom rail. Verified:

| MainhubSidebar | Classroom rail | Route |
|---|---|---|
| Classroom | Home | `/classroom` |
| Bootcamps | Bootcamps | `/bootcamps` |
| Messages | Messages | `/inbox` |
| Practice Hub | Practice | `/practice` |
| Wrong Answer Journal | Wrong answers | `/journal` |
| Activity Centre | Activities | `/activities` |
| Schedule | Schedule | `/schedule` |
| Booking | Booking | `/booking` |

Nothing to migrate for students. The three admin-only entries are not covered —
that is Part C.

`MainhubSidebar` and `StudentShell` are **not** modified or deleted. `/mainhub`
and the other `StudentShell` routes keep using them.

---

## 7. Part C — admin group and account items in the Classroom rail

### 7.1 Wire the admin signal in first

`ClassroomLayout.tsx` has **no** admin signal today — it does not import
`useUserPermissions` at all, and every rail button renders unconditionally for
every user. Import the hook and use the bare expression `permissions.is_admin`,
exactly as `MainhubSidebar.tsx:56` does.

`is_admin` is **not** a `profiles` column. It resolves in
`useUserPermissions.ts:120-127` from the `user_roles` table where
`user_id = auth uid AND role = 'admin'`. Do not add a profile column, and do not
write a second admin check.

### 7.2 The admin group

Add one group holding three items, in the rail's existing format — a
`classroom-nav-group` div with a `<b>` heading and `classroom-nav` buttons
calling `go(path)`, matching lines 171-209. No new styling, no icons, no new
component.

| Label | Route |
|---|---|
| Teacher Workspace | `/teacher` |
| Reference Library | `/teacher/reference-library` |
| Whiteboard | `/admin/board` |

Visible only when `permissions.is_admin`. A non-admin must not see the group,
its heading, or a gap where it was.

**Why only three.** `/teacher` is the door to the whole teacher tree; everything
under it stays reachable through `TeacherShell`'s own nav once you are inside.
`/teacher/reference-library` and `/admin/board` are the two that do not hang off
that tree — and `/admin/board` is the sharp one: **`MainhubSidebar` is its only
link anywhere in the app.** Retiring that sidebar without this entry orphans the
page completely.

Do **not** add the other admin routes the sweep found. Listed in section 10 as a
follow-up.

### 7.3 Naming collision

The rail's existing group at line 204 is headed **Admin** but holds Messages,
Schedule and Booking — student-facing. Two groups called Admin is confusing.
Rename the existing group to **Support**; head the new one **Teaching**.
Group order: Classroom, Study, Review, Support, Teaching.

### 7.4 Account items — Profile and Settings

`/profile` and `/settings/layout` are reachable **only** from
`MainhubAccountButton.tsx` (lines 132 and 140), which lives in the old sidebar's
footer. Nothing else in the app links to either. As students stop passing through
`/mainhub`, both become unreachable — a student-facing hole, not an admin one.

Add **Profile** (`/profile`) and **Settings** (`/settings/layout`) to the
Classroom rail's existing profile block at the bottom (`classroom-profile`,
around line 212), which already holds the avatar, display name, theme toggle and
sign-out. Same place students already look for account controls, and it mirrors
what the popover did.

Match the existing controls in that block rather than introducing a new pattern.
Neither route has a guard, so no gating is needed.

Note but do not act on: `/settings/layout` edits `prefs.sidebar`, which only
`MainhubSidebar` consumes. It will have no visible effect on the Classroom rail.
Leave it reachable; flag it in your report.

---

## 8. Part D — locked items stay visible in the rail

### 8.1 The decision, and that it is deliberate

Rail items a student lacks access to are **shown in a locked state, not hidden.**

This is a deliberate override of two things, decided explicitly by Joshua on
2026-07-27:

- `MainhubSidebar` hides inaccessible items (`MainhubSidebar.tsx:95-100`)
- the project instruction against exposing actions a user cannot perform

**Do not "fix" this back to hiding.** A reviewer or implementer reading the old
sidebar or `CLAUDE.md` will be tempted to. The intent is that a student can see
what exists and what they could have.

### 8.2 Behaviour

Every rail item renders for every signed-in user. An item the student lacks the
flag for is:

1. **Faded out** — visibly de-emphasised against the unlocked items, using the
   existing `--classroom-*` tokens. It should read as unavailable at a glance,
   without needing to click it.
2. **Marked with a visible lock icon**, so the reason is obvious rather than
   looking like a rendering bug or a disabled-by-accident item.
3. **Not clickable.** No navigation, no hover state, no focus ring, no cursor
   change. Set `disabled` on the button and drop its `onClick` so it cannot be
   reached by mouse, keyboard, or screen reader activation.

It is a label, not a control. Nothing happens when a student interacts with it —
by design, it just shows them the feature exists.

Because locked items are unreachable from the rail, **no locked-screen routing is
needed and none should be added.** `LockedModule` still exists for anyone who
reaches a guarded route directly by URL; leave it exactly as it is. Do **not**
change `LockedModule.tsx:23`. An earlier draft of this spec called for that edit;
it is now explicitly out of scope.

The locked styling belongs in `src/components/classroom/classroom.css` alongside
`classroom-nav` / `classroom-nav-active`, using the existing `--classroom-*`
tokens. **`classroom.css` must not gain a `:root` block or an `@layer`** — there
is a standing check for this:

```bash
grep -nE ':root|@layer' src/components/classroom/classroom.css
```

Must return nothing.

### 8.3 Which flag gates which item

Authoritative names from `useUserPermissions.ts:23-37`. Use these exactly.

| Item | Flag |
|---|---|
| Home / Notes and recaps / Assigned work | `has_classroom_access` |
| Drill | `has_drill_access` |
| Practice | `has_practice_access` |
| Bootcamps | `has_bootcamp_access` |
| Activities | `has_activity_access` |
| Wrong answers | `has_journal_access` or `has_waj_access` |
| Flagged | `has_flagged_access` |
| Analytics | `has_analytics_access` |
| Messages | `has_chat_access` |
| Schedule | `has_schedule_access` |
| Booking | none — never locked |

`has_analytics_access` is confirmed to exist and is exactly what guards
`/analytics` (`App.tsx:405-407`). Earlier drafts of this spec were unsure; it is
settled.

`is_admin` unlocks everything, matching `MainhubSidebar`'s final clause.

The **Teaching** group from Part C is the one exception to visible-when-locked:
it is hidden outright from non-admins, not shown locked. Students should not see
teacher tooling exists.

---

## 9. Verification

Every item is a real run against the app. Reading the diff is not verification.
Dev server is on **port 8081** (8080 is occupied by something else that returns
200). Reuse the auth state at `.auth/state.json`; if it has expired the symptom
is a redirect to `/auth` and a 400 — re-mint with
`BASE_URL=http://localhost:8081 node .auth/save-session.mjs`.

**The frozen boundary — check this first:**

```bash
git diff --stat -- src/components/drill/official/
```

Must output nothing. Then confirm `src/pages/Drill.tsx` shows exactly two changed
lines, 332 and 3408, and nothing else:

```bash
git diff -- src/pages/Drill.tsx
```

**Rail identity — this cannot be checked by screenshot.** Stamp a unique
attribute on the rail's DOM node, navigate `/classroom` → Drill → back, and
assert the *same node instance* survives. A screenshot of two identical-looking
rails passes even when the rail unmounted and remounted, which is how this was
missed the first time. Follow the pattern in `.auth/verify-journal.mjs`.

Write a new `.auth/verify-drill.mjs` covering:

1. Clicking **Drill** in the rail lands on `/classroom/drill` and does **not**
   reach `/mainhub`.
2. The Classroom rail is still present, with Drill marked active, and it is the
   same DOM node as before the click.
3. The hub content is present: Start Smart Drill, Full Section, Build a Set, the
   PrepTest/Section/Question picker, and the Today column.
4. Start Smart Drill enters the full-page question screen and the rail is absent
   there.
5. Leaving the drill returns to `/classroom`.
6. `/mainhub` still renders in `StudentShell` and is unchanged.
7. `/classroom`, `/flagged`, `/journal`, `/practice`, `/bootcamps` all still work.
8. The old dark `MainhubSidebar` is absent from `/classroom/drill` — assert on
   its DOM absence, not on a screenshot.

**Parts C and D need two accounts, and cannot be verified from one session.**

As admin: the Teaching group renders with all three items, each navigating to the
right route; the renamed Support group still shows Messages, Schedule, Booking.

As a non-admin student: the Teaching group is entirely absent — heading included.
Then, with a profile that has some flags off, confirm the matching items are
still **present, faded, and carrying a lock icon** — not missing. Confirm they
are genuinely inert: clicking does nothing and the URL does not change; tabbing
through the rail skips them; the button carries `disabled`. Report the exact flag
state you tested against and what rendered.

Confirm `LockedModule.tsx` is unchanged:

```bash
git diff --stat -- src/components/LockedModule.tsx
```

Must output nothing.

Also confirm Profile and Settings are reachable from the rail's profile block,
and that `grep -nE ':root|@layer' src/components/classroom/classroom.css`
returns nothing.

If you cannot get a second account, **say so and mark Parts C and D unverified.**
Do not report them as working on the strength of the code.

Also run:

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
node .auth/verify-classroom.mjs && node .auth/verify-flagged.mjs && node .auth/verify-journal.mjs
```

Note: `.auth/verify-classroom.mjs` has a **known-stale** assertion —
`signOutVisible: false`, which inverted when the sign-out control was added to
the sidebar footer. If that is the only failure, it is pre-existing and not
caused by this work. Report it; do not silently fix it as part of this change.

`.auth/verify-classroom3.mjs` currently exercises the Drill button and captures
the bounce. Update its expectation to the new behaviour.

**Part B:** sign out, sign in, confirm the landing page is the Classroom. Then
confirm a `?returnTo=/flagged` on the auth URL still wins over the new default,
and that a user with no `onboarding_completed_at` still reaches `/onboarding`.

---

## 10. Found in passing — not in scope

Report these, do not fix them.

- **`TeacherShell.tsx:37` links to `/teacher/activities`, which has no route.**
  It falls through to `NotFound`. A live broken nav link, unrelated to this work.
- **`/admin/*` guards are inconsistent.** `/admin/drive-files`,
  `/admin/homework{,/new,/:setId}`, `/admin/guided-drills`,
  `/admin/bootcamp-reference-lab` and `/admin/intro-lr` have no `ProtectedRoute`
  at all. `/admin/library|ta|inspector` gate on `has_ta_access`, a
  student-assignable flag, rather than on admin. `/admin/board` gates on
  `has_classroom_access` — the nav is stricter than the route.
- **Admin routes with no navigation anywhere:** `/admin/inspector`,
  `/admin/guided-drills`, `/admin/lsat-knowledge-import`,
  `/admin/bootcamp-reference-lab`, `/admin/intro-lr`, `/admin/library`,
  `/teacher/templates`, `/teacher/session-ingest`, `/teacher/today`. Deliberately
  left out of the rail.
- **`/practice/sets`** has no rail entry; reachable in-page from Practice only.
- **`/mainhub` has no rail entry either** — reached only via `/`, `/foyer`, and
  `TeacherShell`'s back button. Retiring it is a separate job.
- **`prefs.dock`** in `layoutPresets.ts` is dead config, rendered as nav nowhere.
- **`.auth/verify-classroom.mjs`'s `signOutVisible: false`** assertion is stale
  and inverted since sign-out was added to the sidebar footer.

---

## 11. Commit

Do not commit until Joshua has seen it running. When approved, push with:

```bash
bash .claude/safe-push.sh
```

Raw `git push` is denied. Lovable commits to `main` concurrently, so the script's
fetch-and-merge is required.
