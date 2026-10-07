# Handoff — the drill work is built and merged but is NOT in production

Written 2026-07-28. For whoever picks this up next.

## One-line problem

The code is correct and on GitHub `main`. Production is not building from
GitHub `main`. Lovable is building from its own internal commit line, which has
diverged and does not contain our work.

**This is a deploy/sync problem, not a code problem. Do not re-implement the
feature.**

## Evidence

| Fact | Value |
|---|---|
| GitHub `main` HEAD | `47e01240` |
| Our feature commit | `37320c9f` |
| Is `37320c9f` on `origin/main`? | **YES** (`git merge-base --is-ancestor` confirms) |
| Lovable's `latest_commit_sha` | `f06dd91b` |
| Does `f06dd91b` exist in the GitHub repo? | **NO** — `git cat-file -t f06dd91b` → *Not a valid object name* |

That last row is the whole story. Lovable is deploying a commit that does not
exist on GitHub at all.

Live DOM probe against `https://lsatprep.study/classroom` confirms prod is
running pre-change code — the rail's fourth group is still headed **Admin**
(ours renames it **Support**), there is no **Teaching** group, and no rail item
carries a locked state.

Calling `deploy_project` on the Lovable connector did **not** help. It bumped
`updated_at` and later moved `latest_commit_sha` to `f06dd91b`, but that came
from Lovable's own editing session (`last_edited_at` 2026-07-28T00:24), not from
GitHub. Deploying publishes Lovable's state; it does not pull from GitHub.

## What the goal is

Clicking **Drill** in the Classroom rail should keep the student inside the
Classroom frame at `/classroom/drill`, with the warm Classroom rail still
mounted, showing the drill hub content (Start Smart Drill, the PrepTest /
Section / Question pickers, Practice Tools, Today) in the centre.

Today in production it instead navigates to `/drill`, which has no mode, so
`Drill.tsx` bounces to `/mainhub` and the whole product changes around the
student — different sidebar, dark visual language.

Sign-in landing on `/classroom` is **already fixed and live** — that part works.
Only the Drill button is still wrong.

## What it must look like — the target design

### Reference documents, in order of authority

1. `docs/specs/2026-07-27-drill-in-classroom.md` — **the frozen spec.** Written,
   reviewed and signed off before any code. This is the authority on what is in
   and out of scope. Committed as `d2e7b8a5`.
2. `docs/specs/2026-07-27-drill-in-classroom-BUILD-LOG.md` — what was actually
   built, what was verified live, what was not, and the risk accepted.
3. `docs/adr/0004-classroom-frame-is-one-pathless-layout-route.md` — **read
   before touching routing.** Explains why the frame must be one pathless layout
   route and what breaks otherwise.
4. `src/components/classroom/CONTEXT.md` — glossary; the flag vs wrong-answer
   distinction.

If those files are missing from the tree you are working in, they exist on
GitHub `main` at `47e01240`. Their absence is itself a symptom of the sync
problem described above.

### The wrong behaviour (what production does today)

Clicking **Drill** in the Classroom rail navigates to `/drill`. That route
receives no mode, so `Drill.tsx:330` bounces to `/mainhub`. `/mainhub` renders
`AcademyMainhub` inside `StudentShell`, which mounts `MainhubSidebar` — a
completely different left rail reading *Classroom, Bootcamps, Messages, Practice
Hub, Wrong Answer Journal, Schedule, Booking* against a white page chrome.

The student clicks one rail item and the entire product changes around them.
That is the defect.

### The right behaviour

Clicking **Drill** navigates to `/classroom/drill` and the student **stays in
the Classroom**:

- The warm Classroom rail remains on the left — *the same DOM node*, not a
  re-render of a similar-looking rail. Groups read **Classroom / Study / Review /
  Support**, plus **Teaching** for an admin.
- **Drill** shows as the active rail item.
- The third column (the section list) does **not** open.
- The centre of the page shows the drill hub content: the hero with **Start
  Smart Drill** and the Spline robot, the **PrepTest / Section / Question**
  picker with question-text search, the **Practice Tools** panel with **Full
  Section** and **Build a Set**, the insight/practice-volume block, and the
  **Today / Next up** column.
- `MainhubSidebar` is **absent from the DOM entirely.**

### Deliberate design decisions that look like bugs but are not

**The hub panels stay dark.** They are not re-themed to the Classroom's warm
cream palette. Dark cards sitting against a warm rail and cream page is the
intended, decided outcome — Joshua chose this explicitly. Do not "fix" the
contrast, do not introduce `--classroom-*` tokens into `AcademyMainhub`, and do
not adjust its surfaces. This is a **re-host, not a restyle.**

**Locked rail items are visible, not hidden.** An item the student lacks the
flag for renders faded, carrying a lock icon, with `disabled` set — inert, not
clickable, no hover, no focus. This deliberately overrides both `MainhubSidebar`
(which hides such items) and the "no dead buttons" line in `CLAUDE.md`. Joshua
decided this on 2026-07-27. Do not revert it to hiding.

**`/mainhub` still exists and still works.** It was not retired; other surfaces
link to it. Seeing the old dark hub when you type `/mainhub` directly is correct
behaviour, not evidence of a failed deploy.

**The full-page takeover during questions is kept.** Once a drill actually
starts, the LSAT question screen takes over the whole page and the rail goes
away. That is intended and was decided explicitly. Only the hub *before* the
questions lives in the Classroom frame.

### The hard boundary

The LSAT question-answering screen **does not change in any way** — not
visually, not behaviourally, not structurally. These six files must show a
zero-line diff:

```
src/components/drill/official/OfficialQuestionPane.tsx
src/components/drill/official/OfficialDrillFrame.tsx
src/components/drill/official/OfficialDrillToolbar.tsx
src/components/drill/official/OfficialSessionStrip.tsx
src/components/drill/official/OfficialSmartDrillBar.tsx
src/components/drill/official/OfficialAnswerNavigator.tsx
```

`src/pages/Drill.tsx` is 3724 lines with no render-level test coverage; it may
change **exactly two lines** (332 and 3408, `/mainhub` → `/classroom`).

A diff touching those six files is a failed implementation, not a judgement
call. This surface is what a student trains against for hours and it has to
match the real exam. It is already right.

---

## What is already built (do not rebuild)

Commit `37320c9f`, spec `docs/specs/2026-07-27-drill-in-classroom.md`, build log
`docs/specs/2026-07-27-drill-in-classroom-BUILD-LOG.md`.

- `/classroom/drill` added inside the single pathless `ClassroomLayout` route
- rail's Drill button retargeted to `/classroom/drill`
- rail gains a Support group (renamed from Admin), an admin-only Teaching group,
  and Profile / Settings in the footer
- inaccessible rail items render faded, lock-marked and `disabled`
- `AcademyMainhub` / `TodayFocusPanel` gained an optional `drillReturnTo` prop
  defaulting to `/mainhub`, so drills started from the Classroom return there
- `Drill.tsx` changed exactly two lines (`/mainhub` → `/classroom`)

Verified working on `localhost:8081`, including a DOM-node-identity probe proving
the rail survives the navigation rather than remounting.

**Frozen and must stay frozen:** the six files under
`src/components/drill/official/` have a zero-line diff. The LSAT
question-answering screen must not change in any way.

## The actual task

Get Lovable to build from GitHub `main` at `47e01240` or later.

Things to establish, in order:

1. Does this Lovable project have GitHub sync configured as **two-way**, or only
   Lovable → GitHub? If it is one-way, every terminal push has this problem and
   it is not specific to this change.
2. Is there a pull / sync / "import from GitHub" action in the Lovable editor?
   That is the likely fix.
3. What is in `f06dd91b`? It came from a Lovable chat session around
   2026-07-28T00:24. It may contain work that only exists inside Lovable and
   would be lost by a hard re-sync — check before overwriting anything.

## Warnings

- Lovable is the declared source of truth for this project; GitHub `main` is
  normally the mirror. A naive "force GitHub onto Lovable" could destroy
  Lovable-only work. Establish what `f06dd91b` contains first.
- Never force-push to `main`.
- If Lovable-only commits and our commits both need to survive, the standing
  playbook is: take Lovable's state, then re-port our commit on top. Save a
  patch first with `git format-patch -1 37320c9f -o /tmp/`.

## Recovery path if Lovable cannot be made to pull

The whole feature is one commit. Re-porting it is cheap; re-implementing it is
not.

```bash
cd /Users/joshuaf/ai-os/projects/lsatu
git format-patch -1 37320c9f -o /tmp/          # save it before anything else
git show --stat 37320c9f                       # the eight files
```

Expect shape drift — Lovable renames functions and moves logic — so re-read each
file before applying rather than trusting line numbers. The eight files touched:

| File | Change |
|---|---|
| `src/App.tsx` | `/classroom/drill` route inside the existing pathless `ClassroomLayout` block |
| `src/components/classroom/shell/ClassroomLayout.tsx` | rail target, Support/Teaching groups, locked states, Profile/Settings |
| `src/components/classroom/classroom.css` | locked styling, footer sizing, full-width hub hosting |
| `src/lib/authRedirect.ts` | landing `/mainhub` → `/classroom` |
| `src/pages/AcademyMainhub.tsx` | optional `drillReturnTo` prop |
| `src/components/mainhub/TodayFocusPanel.tsx` | propagates `drillReturnTo` |
| `src/pages/Drill.tsx` | exactly two navigation lines |
| `docs/specs/…-BUILD-LOG.md` | the build record |

## How to verify it actually works — do not trust a screenshot

Two rails that look identical pass a screenshot check even when the rail
remounted. A previous release shipped this bug and it was caught only by a DOM
probe. Run this in the browser console on `/classroom`:

```js
document.querySelector('.classroom-sidebar-card').dataset.probe = 'x';
// click Drill, then:
document.querySelector('.classroom-sidebar-card').dataset.probe;
// must still be 'x'. Missing = the rail remounted = the route is wired wrong.
```

Then confirm `location.pathname === '/classroom/drill'`, that the rail groups
read Classroom / Study / Review / Support, and that `MainhubSidebar` is absent.

`.auth/verify-drill.mjs` exists locally and automates this, but has never been
run. `.auth/` is git-ignored, so it will not be present in a fresh clone.

## Still unverified even locally

- The **Teaching** group rendering for an admin. Only the negative case was
  observed — the test account is not an admin.
- A real sign-out / sign-in cycle for the `/classroom` landing.
- A signed-in user **without** `has_classroom_access`. They now land on
  `/classroom` while the rail gates Home, Notes and Assigned work on that flag,
  so their entire rail would be inert. Not observed; flagged because fixing it
  is a product decision.
