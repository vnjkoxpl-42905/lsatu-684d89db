# Build log — Drill in the Classroom frame

Spec: `docs/specs/2026-07-27-drill-in-classroom.md` (frozen)
Builder: Codex `gpt-5.6-sol`, medium reasoning. Session `019fa36e-625e-78d1-9ad8-db29017e7736`.
Reviewer: Claude. Rounds used: 1 (no fix round needed).
Date: 2026-07-27.

## Round 1 — Codex build

Seven files changed, one verify script added, one updated. Codex ran typecheck,
build and the unit suite itself and reported them passing. It drove the running
app at 1680×906 and observed the rail surviving Classroom → Drill.

It explicitly declined to claim Parts B, C and D worked from runtime
observation, on the grounds that it had neither a controlled admin account nor a
controlled non-admin account. That refusal was correct and is the reason this
build needed only one round.

### Deviation Codex reported

Two files outside the spec's key-paths list were modified:
`src/pages/AcademyMainhub.tsx` and `src/components/mainhub/TodayFocusPanel.tsx`.

The spec was incomplete. `AcademyMainhub` hardcodes `returnTo: "/mainhub"` on
Start Smart Drill and on the question picker, and `TodayFocusPanel` does the
same for guided drills and resume. Hosting the hub at `/classroom/drill` without
touching them means a student starts a drill from the Classroom and is returned
to the dark hub on exit — the exact defect this release exists to remove.

Codex threaded an optional `drillReturnTo` prop through both, defaulting to
`/mainhub`. `/mainhub` behaviour is byte-identical; only the new route passes
`/classroom`.

## Claude's verdict — accepted

### Hard constraints, re-run by Claude, not taken from Codex's report

| Check | Result |
|---|---|
| `git diff --stat -- src/components/drill/official/` | empty |
| `git diff --stat -- src/components/LockedModule.tsx` | empty |
| `grep -nE ':root\|@layer' src/components/classroom/classroom.css` | empty |
| `src/pages/Drill.tsx` | exactly 2 lines, both `/mainhub` → `/classroom` |
| `npm run typecheck` | clean, exit 0 |

The frozen LSAT question surface is untouched.

### Live verification (Claude, dev server on 8081)

- Clicking Drill lands on `/classroom/drill`.
- **Rail identity survives.** A `data-probe` attribute stamped on the rail node
  before navigation was still present after — the same DOM node, not a
  look-alike remount. This is the assertion that a screenshot cannot make and
  that a previous release got wrong.
- The old `MainhubSidebar` is absent.
- The hub content renders: Start Smart Drill, the three pickers, Practice Tools,
  Today. Dark panels against the warm rail, as decided.
- The third column does not open, and Drill shows as the active rail item.
- **Part D confirmed live:** on the test account `Activities` renders faded,
  carrying a lock icon, with `disabled` set — while every other item is
  unlocked. Gating is real, not theoretical.
- **Part C partially confirmed:** the Teaching group is correctly *absent* on
  this non-admin account.

### Not verified

- **Teaching group visible to an admin.** The test account is not an admin, so
  only the negative case was observed.
- **Part B end to end.** The redirect default is changed and reads correctly,
  but a real sign-out/sign-in cycle was not performed.
- `.auth/verify-drill.mjs` was written but not executed.
- A signed-in user *without* `has_classroom_access` was not tested. See risk
  below.

### Risk accepted knowingly

`authRedirect` now lands every authenticated user on `/classroom`, and the rail
gates Home / Notes / Assigned work on `has_classroom_access`. A signed-in user
without that flag therefore lands on a page whose entire rail is inert. The
route itself carries `allowSignedIn`, so they are not locked out of the app, but
their navigation is dead. Not observed in practice; flagged rather than fixed
because fixing it is a product decision, not a bug fix.

### Pre-existing failures, not caused by this work

`src/pages/Practice.test.tsx` fails 2 tests (`supabase.rpc is not a function`).
Confirmed identical on a stashed clean tree. Untouched.
