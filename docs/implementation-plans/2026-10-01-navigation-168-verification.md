# Navigation/access #168 verification (Claude slice)

Date: 2026-10-01
Baseline: 411267d3f4e899ee1228410decaf2578bc2da9b7 (branch `codex/navigation-access-168`)
Status: Repaired on 2026-10-02. Historical builder checks below are superseded by the host repair record at the end. Whole #168 acceptance remains open.

## Route matrix

Navigation hints live in `src/lib/destinationAccess.ts`. Nested route gates remain the authority for access. Assignment-aware exam tabs stay reachable so TestingCentreGate can check actual assignments.

| Destination | Bare URL lands on | Tabs (route gate) |
|---|---|---|
| Home `/classroom` | itself | allowSignedIn (classroom flag for coursework children) |
| My Work `/my-work` | first open tab, else To do | To do, Completed, Notes & recaps: `has_classroom_access` |
| Practice `/practice` | Drills; without drill: Overview, whose gate checks flags and assignments | Drills: `has_drill_access`. Overview/All Exams: TestingCentreGate. Attempts: allowSignedIn |
| Review `/review` | To review | To review: allowSignedIn. Wrong answers: `has_journal_access`. Flagged: `has_flagged_access` |
| Progress `/progress` | Overview | Overview, History, Topics: `has_analytics_access` |
| Library `/library` | first open tab | Lessons: activity/bootcamp/drill/analytics. Activities, Bootcamps: `has_classroom_access`. Admissions: requireAdmin |
| Schedule `/schedule` | itself | allowSignedIn |

- **Direct link and reload:** each tab is its own route, wrapped in its parent `ProtectedRoute allowSignedIn`. A reload re-resolves auth, then permissions, then the tab's gate.
- **Signed out:** the user goes to `/auth?returnTo=<path+query+hash>`.
- **Active state:** the rail sets `aria-current="page"`. The tab row marks the owning tab on nested pages: `/practice/drills/runs/:id` lights Drills, and `/practice/exams/:pt` lights All Exams.
- **Query and hash:** bare destination URLs and legacy redirects carry both through.

## Defects found and fixed

1. **Stale proof test.** At baseline, `railCatalog.test.ts` still expected Library Activities to be gated on `has_activity_access`. The tier-defaults change (5b5d5b0) deliberately moved it to `has_classroom_access`. I updated the test to match that policy. The policy itself is unchanged.
2. **Locked rail items hid their explanation.** My Work and Progress rendered as `disabled` buttons with no text, even though their routes admit any signed-in account and the destination page explains each lock. A keyboard student could not focus them at all. Now:
   - Rail destinations are always navigable.
   - A padlock, a "(locked)" screen-reader label and a title appear only when every non-staff section is locked.
   - The rail and the Account layout preview use the same predicate (`railItemLocked`).
3. **The Library padlock was wrong for the current tiers.** The rail locked Library on `has_activity_access`/`has_bootcamp_access`, which tier defaults no longer grant, so a Classroom (Tier 2) student saw a lock on a destination they could open.
4. **Bare destination URLs landed on locked tabs.** For example, `/library` on a Classroom-only account opened a locked Lessons page. `DestinationIndex` now opens the first tab the account can use, waits while permissions are unresolved, and keeps the query and hash. The rail now uses the same landing logic, and intentionally opens Overview for an account with practice access but no drill access, otherwise Attempts.
5. **Locked tabs gave no visible reason.** The only explanation was a `title` tooltip. Destination pages now show a visible note ("Sections with a lock aren't in your plan right now. If that looks wrong, message Joshua."), and each locked tab is tied to it with `aria-describedby`. The staff-only Admissions tab says "open to Joshua only" and doesn't trigger the plan note.
6. **Legacy redirects dropped context.** `/waj` bounced through `/journal` and lost its query and hash. `/foyer`, `/mainhub`, `/profile` and `/settings/layout` dropped their queries, and `/bootcamp/structure(-v2)(/*)` took two hops through `/bootcamps`. All of these now go to the canonical target in one hop with the query and hash kept. An explicit target parameter still wins, so `/settings/layout` always opens `section=layout`. A test asserts that no `RedirectWithSearch` target is itself a redirect source, so no redirect can loop.
7. **Quick access shortcuts disappeared from keyboard order.** Locked Messages and Find a question used `disabled`, which removes them from the tab order. They now use `aria-disabled`: still focusable and inert, with a "(locked for your account)" label.
8. **Rail preference migration race.** If a second tab or device migrated between the read and the guarded write, the compare-and-swap correctly refused, but the hook then showed an error. It now re-reads and adopts the newer stored layout, so it neither migrates twice nor fails.
9. **Stale rail preference save.** A save built on a cached layout could overwrite a newer layout saved from another device, because the compare-and-swap only covered the gap between that save's own read and write. A save now refuses when the stored v2 layout differs from the layout the edit was based on, then reloads.
10. **Minor:** `/classroom/admissions` was briefly classified as a "work" section before its redirect fired. It is now excluded.

## Changed files

- `src/lib/destinationAccess.ts` (new): route matrix, tab access, landing path, lock state, active tab.
- `src/lib/destinationAccess.test.ts` (new, 45 tests).
- `src/pages/StudentDestination.tsx`: uses the matrix, adds `DestinationIndex` and the visible lock note.
- `src/pages/StudentDestination.test.tsx` (expanded) and `src/pages/StudentDestination.routes.test.tsx` (new). The routes test composes ProtectedRoute exactly as App.tsx does and covers auth loading, signed out, permission loading, denied, entitled, admin Admissions, and revoked states.
- `src/App.tsx`: legacy redirects and destination index routes only.
- `src/components/classroom/shell/ClassroomLayout.tsx` and `ClassroomLayout.test.tsx` (new, 8 tests): rail locks, shortcuts, `aria-current`, and mobile menu Escape and focus return.
- `src/components/classroom/classroom.css`: `.classroom-nav-dimmed` and `.student-destination-locked-note` only.
- `src/components/classroom/account/RailLayoutEditor.tsx`: preview uses the shared lock predicate.
- `src/hooks/useRailPrefs.ts` and its test: migration race and stale-save fixes, with 5 new tests.
- `src/lib/railCatalog.test.ts`: stale policy assertion fixed, and tab paths now read from the matrix.
- `ProtectedRoute.tsx`, `preserveRedirectLocation.ts`, `authRedirect.ts` and `useDialogOverlay.ts` are unchanged. No defect was found in them that justified an edit.

## Commands and results

- Proof command (`StudentDestination`, `railCatalog`, `preserveRedirectLocation`, `authRedirect`, `useRailPrefs`, `ProtectedRoute`): 6 files, 75/75 passed. At baseline it was 1 failed and 62 passed (the stale railCatalog assertion).
- Additional: `destinationAccess.test.ts`, `StudentDestination.routes.test.tsx` and `ClassroomLayout.test.tsx` all passed. Combined with the overlapping files, that is 90 + 8 tests.
- `npm run typecheck`: clean.
- `npx eslint` on the changed files: 0 errors and 4 warnings, all of them already present at baseline.
- `npm run build`: passed, and postbuild reported OK across 769 dist files. The build regenerated `public/data/_bank.generated.json`, `public/data/finder-address-index.json` and `supabase/functions/mcp/index.ts`. That is generated churn, not part of this change: don't stage it.

## Unverified and remaining

- **Browser and responsive matrix: unverified.** Starting the Vite dev server was denied by the headless permission configuration (`npx vite --port 8168 --strictPort`). No running UI, screenshot or measured viewport was produced. The host still needs to run the narrow, 1024, 1280, 1440 and docked-pane checks against a real signed-in student and admin. The new CSS wraps text and adds no fixed widths, but that is reasoning, not a measurement.
- `RcRedirect` (`/rc` → `/classroom/drill` → `/practice/drills`) is still two hops. It sits in `src/features/rc`, outside this file ownership.
- The ProtectedRoute test fixture gates `/review/to-review` on journal, flagged or drill access, while App.tsx registers it as allowSignedIn and the page enforces its own access. I left this alone and am noting the mismatch only.
- No real accounts or data were touched. Tier presets in the tests are fixtures built from `docs/verification/student-tier-defaults.md`.

## Host corrections on 2026-10-02

### Final completion pass (supersedes the earlier correction below)

Removed the duplicate shell denial panel. TestingCentreGate and ProtectedRoute remain the only content gates; assignment-aware exam navigation defers to the route instead of diverting assigned students to Attempts. Dedicated rail-note CSS uses a nonnegative margin. LockedModule now gives neutral unavailable-access wording, with staff-only wording from ProtectedRoute, rather than inferring a pause from a missing Classroom flag. Four route integration regressions exercise actual gates for assignment exceptions, unassigned denial and local bypass. Host independently passed 145 tests across nine files, typecheck and scoped lint (zero errors, four existing warnings). Production build and browser/release results are recorded in the host verification record. Original builder browser limitations below are historical. Whole #168 acceptance remains open until its broader checks are satisfied.

Codex fixed the primary Practice Exams link to target Attempts when Overview is unavailable, with three rendered regressions. Fresh Opus inspection then found misleading paused-access copy on newly reachable locked tier destinations. Codex added an active-tab denial panel with neutral account-access wording and staff-only Admissions wording, plus Tier 3 regressions, and a visible locked-shortcut explanation. Actual host browser checks and final proof are recorded separately in C:/Users/Joshu/dev/ai-os/research/2026-10-02-navigation-168-host-verification.md. Whole #168 and production acceptance remain open.
