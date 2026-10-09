# Spec — warm the drill page, and make it exist in exactly one place

Status: **frozen for implementation.** Written 2026-07-28.
Author: Claude (spec + review). Implementer: Codex.
Supersedes the `Drill.tsx` two-line freeze in
`docs/specs/2026-07-27-drill-in-classroom.md` — see Part 2.4.

> **Visual supersession, 2026-07-28:** the route, state, return-path, asset, and
> official-question boundaries in this document remain authoritative. Its
> frozen visual treatment of the Drill landing hero, Practice/Insight stage,
> Today panel, Analytics stage, and Drill-specific Classroom rail is superseded
> by `docs/specs/2026-07-28-drill-reasoning-observatory.md`, pending Joshua's
> approval. Do not implement the new visual proposal until it is approved.


## Context

`/classroom/drill` renders the drill hub inside the Classroom frame and the rail
survives the navigation. Two things are still wrong.

**1. The page behind the blocks is cold.** The rail is warm cream
(`#fdf8f3`/`#faf1e8`, `#f3e3d6` hairlines) while the drill stage is
`var(--classroom-page)` — pure `#ffffff`. That white field against the cream rail
is the remaining seam.

**2. The same hub is served at two routes.** `AcademyMainhub` renders at both
`/classroom/drill` and `/mainhub`. The old route still carries `StudentShell`
and its 240px sidebar, so a student can still land in the old-looking product.

Joshua reviewed three surface mockups and chose to keep the blocks exactly as
they are. This plan therefore changes the field behind them and the routing
around them, and nothing else.

---

## Hard boundary — do not touch

**The blocks are frozen.** No colour, gradient, shadow, border, glass fill,
opacity or layout value inside them changes.

- `src/components/mainhub/TodayFocusPanel.tsx` — the six `TYPE_TONE` gradient
  maps (~lines 93-98) stay byte-identical, the eclipse raster stays, the
  starfield, beams, glow and vignette stay. Only the `drillReturnTo` default
  string changes.
- `src/components/mainhub/PracticeInsightStage.tsx` — colours untouched; only
  the `/mainhub?stage=analytics` href check at line 57 changes.
- The hero in `src/pages/AcademyMainhub.tsx` — the Spline robot
  (`prod.spline.design/kZDDjO5HuC9GJUM2`), its blue radial glow, its alpha mask,
  `Spotlight fill="white"`, the `bg-zinc-950` card and every `bg-white/[0.0x]`
  fill stay exactly as they are. **The hero stays dark by decision.**
- `src/components/ui/splite.tsx`, `src/components/ui/spotlight.tsx` — shared with
  `MainhubAvatarFab` and `/practice`. Do not edit.
- The six `src/components/drill/official/*` files — still frozen.

**Two strings that look like routes but are public asset paths. Do not rewrite
them.** A find-and-replace on `/mainhub` silently breaks both:

- `/mainhub/joshua-robot-avatar.png` — `src/components/inbox/MessageBubble.tsx:61`
- `/mainhub/today-eclipse.png` — `src/components/mainhub/TodayFocusPanel.tsx:101`

**`StudentShell` is not retired.** It still draws `/practice`, `/analytics`,
`/inbox`, `/schedule`, `/booking`, `/bootcamps`, `/activities`. Moving those into
the Classroom frame is a separate, larger job.

---

## Part 1 — warm the drill field

### 1.1 A warm page token

In `src/components/classroom/classroom.css`, add one variable alongside the
existing block (lines 2-19) for the warm field, with a dark counterpart in
`html.dark .classroom-root` (lines 34-49).

Do **not** redefine `--classroom-page`. The Classroom's reading surfaces (Home,
Notes, Flagged, Wrong answers) must stay exactly as they are.

### 1.2 Apply it to the drill stage only

Extend the existing drill block at `classroom.css:465-472`. Set the stage
background to the warm token, and give `.classroom-column` real padding — today
it is `max-width: none; padding: 0`, which is why the blocks run edge to edge and
the white reads as a gap rather than a page.

**The inset matters as much as the colour.** A visible warm margin on all four
sides is what makes the dark blocks read as embedded rather than floating.

`classroom.css` must not gain a `:root` block or an `@layer`:

```bash
grep -nE ':root|@layer' src/components/classroom/classroom.css   # must print nothing
```

---

## Part 2 — one route

### 2.1 Retire `/mainhub`

`src/App.tsx:396` stops rendering `AcademyMainhub` and becomes a redirect:

```tsx
<Route path="/mainhub" element={<Navigate to="/classroom/drill" replace />} />
```

**Judgement call, flagged:** Joshua said "it shouldn't exist." A redirect rather
than a deletion still means the hub renders in exactly one place — the route
table has one real surface and `/mainhub` is only a signpost. It is kept because
the PWA `start_url` is `/foyer` → `/mainhub`, bookmarks exist, and roughly forty
call sites reference it; a bare delete turns every one I miss into a dead end.
If Joshua wants it gone outright, delete the route after the call sites are
repointed and verified, as a second step.

Also repoint the two existing redirects:
- `src/App.tsx:191` `/foyer` → `/classroom`
- `src/App.tsx:329` `/` → `/classroom`

### 2.2 Simplify `AcademyMainhub` to a single mode

With one route, the `chromeless` fork added earlier is dead weight. Remove the
prop and the non-chromeless branch (the cold `#f7f8fb` panel, slate border,
rounded corners, drop shadow and white gradient wash at `AcademyMainhub.tsx`
~607-620). The component always renders bare. Change `drillReturnTo`'s default
from `/mainhub` to `/classroom`.

### 2.3 Repoint every navigation target

Replace `/mainhub` with `/classroom` in every `navigate()` / `<Link to>` /
guard-redirect call site. This is the bulk of the work — roughly forty sites.
Representative paths, all the same mechanical change:

- Student surfaces: `Profile.tsx` (×2), `Booking.tsx`, `Schedule.tsx`,
  `Inbox.tsx`, `Analytics.tsx`, `Bootcamps.tsx`, `FlaggedQuestions.tsx` (×2),
  `SettingsLayout.tsx`, `NotFound.tsx`, `Onboarding.tsx` (×2)
- Components: `LockedModule.tsx:23`, `JournalEntrySurface.tsx:275`,
  `AdminInboxCommandCenter.tsx:226`
- Bootcamp rails: `main-conclusion/components/workspace-shell/WorkspaceShell.tsx:97`,
  `.../LeftRail.tsx:129`
- Admin + teacher guards: `AdminDashboard.tsx` (×2), `AdminBoard.tsx`,
  `admin/TeachingLibrary.tsx`, `admin/StudentHub.tsx`, `admin/Homework.tsx`,
  `admin/HomeworkNew.tsx`, `admin/HomeworkDetail.tsx`, `admin/DriveFiles.tsx`,
  `teacher/TeacherShell.tsx` (×2), `teacher/desk/TeacherDeskPreview.tsx:330`

Drill-hub internals point at the hub, not at Classroom home:
- `SmartLRTrainingCard.tsx:169` `smartDrillReturnTo` → `/classroom`
- `TodayFocusPanel.tsx:313` `drillReturnTo` default → `/classroom`
- `insightSlides.ts:29` `ANALYTICS` → `/classroom/drill?stage=analytics`, and the
  matching `startsWith` check at `PracticeInsightStage.tsx:57`

### 2.4 `Drill.tsx` — the earlier two-line boundary is superseded

The previous spec froze `Drill.tsx` to exactly two changed lines. That no longer
holds and this plan overrides it explicitly. Seven further sites change, all
`/mainhub` → `/classroom`:

- six `drillReturnTo || '/mainhub'` fallbacks (~2397, 2409, 2423, 2467, 2501, 2548)
- `handleNavigation`'s union type and its `onEnd` call (~2289, 3203)

Nothing else in that 3724-line file moves. It still has no render-level test
coverage, so the diff must be read line by line.

### 2.5 Route-gated widgets

Six components hide themselves on `/mainhub` and must now key off
`/classroom/drill`, or they will appear on top of the drill hub:

`FloatingMessenger.tsx` (`HIDDEN_ROUTES` and the `onMainhub` orbital logic at
~106), `FloatingTAWidget.tsx:17`, `FloatingWhiteboard.tsx:22`,
`FloatingHelpButton.tsx:16`, `StudentCornerBubble.tsx:36`, `AdminChatHub.tsx:39`.

Remove the `"/mainhub": "Home"` entry from `StudentShell.tsx:41`.

### 2.6 Disable GuidedTour

Its seven steps are pinned to `path: "/mainhub"` and were written for the old
shell. Stop it starting (`StudentShell.tsx:16` calls `hasSeenTour`/`startTour`).
Leave the file in place; reviving it against the Classroom frame is its own job.

### 2.7 Tests and verify scripts

Update the fixtures that assert the old route: `drillRouteState.test.ts:31`,
`SmartLRTrainingCard.test.tsx:92`, `AcademyMainhub.test.tsx:145`,
`StudentShell.test.tsx`, `MainhubSidebar.test.tsx`.

`.auth/save-session.mjs:41` waits for `/\/mainhub/` after login — it must wait
for `/classroom` or session minting breaks. `.auth/verify-drill.mjs:88`,
`verify-journal.mjs:153`, `verify-classroom.mjs:62`, `verify-flagged3.mjs:73,79`
use `/mainhub` as a regression target; repoint them.

---

## Verification

Dev server on **8081**: `./node_modules/.bin/vite --port 8081 --strictPort`, run
from the repo root — `npx vite` resolves a different vite and serves 404s. The
browser session expires; **Joshua signs in, not Claude.**

1. Warm field: `/classroom/drill` shows a warm, continuous surface behind the
   blocks with no white seam at the rail edge or page bottom.
2. Blocks pixel-unchanged — prove by diff, not eye:
   ```bash
   git diff -- src/components/mainhub/TodayFocusPanel.tsx   # only the drillReturnTo default
   git diff --stat -- src/components/ui/splite.tsx src/components/ui/spotlight.tsx  # empty
   ```
3. The Spline robot still loads against its dark hero.
4. **The two asset paths still resolve** — the Joshua avatar renders in a message
   thread and the eclipse image renders in the Today panel. This is the
   find-and-replace trap; check it explicitly.
5. `/mainhub` redirects to `/classroom/drill`; `/` and `/foyer` land on
   `/classroom`.
6. Rail identity survives `/classroom` → Drill, by DOM probe not screenshot:
   ```js
   document.querySelector('.classroom-sidebar-card').dataset.probe = 'x';
   // click Drill, re-read dataset.probe — must still be 'x'
   ```
7. Walk the repointed back-buttons: Profile, Booking, Schedule, Inbox,
   Analytics, Bootcamps, Settings all return to `/classroom`.
8. No floating widget (messenger, TA, whiteboard, help) overlays the drill hub.
9. No guided tour fires for a fresh account.
10. `grep -rn "navigate(\"/mainhub\")\|navigate('/mainhub')" src/` returns nothing.
11. `npm run typecheck` clean; `npx vitest run` no new failures — note
    `src/pages/Practice.test.tsx` already fails 2 tests on a clean tree
    (`supabase.rpc is not a function`), unrelated.
12. Push via `.claude/safe-push.sh`. Then confirm Lovable actually deployed:
    its `latest_commit_sha` must move. It builds from its own
    `lovable-sync-*` branch, so a push alone does not reach production.

---

## Known, deliberately not fixed

- The drill blocks ignore `html.dark` entirely — hardcoded dark islands in a
  themed shell. Re-theming them was considered and declined.
- `StudentShell` still draws seven routes with the old sidebar, so the shell
  still swaps when a student clicks Practice from the Classroom rail.
- `TeacherShell.tsx:37` links to `/teacher/activities`, which has no route.

---

## Follow-up spec to write separately

Notes and visuals should embed resources inline, jeffsu-style — a bare `<figure>`
in the prose flow, no panel chrome. Do not bundle it here. Research already
established:

- `sanitizeClassroomHtml` (`classroomData.ts:18`) uses DOMPurify's default
  profile, which **strips `<iframe>` entirely** — video embeds in notes are
  silently deleted today. Needs `ADD_TAGS: ["iframe"]` plus a `src` allow-list.
- `classroom.css:783-797` puts a 1px border and 8px radius on every prose image
  plus a redundant double-centering breakout. That border is the chrome to drop.
- `classroom.css:820-826` gives iframes `min-height: 360px` and a border; should
  be `aspect-ratio: 16/9`, borderless.
- The in-prose callout shares a selector with `.classroom-callout`
  (`classroom.css:807-818`); splitting them matters.
- `720px` is the measure, duplicated in four places including the sanitizer's
  hardcoded `sizes` and a useless single-candidate `srcset`.
- `content_markdown` is dumped into one `<p>` unparsed
  (`ClassroomRouteViews.tsx:138-152`) — a latent bug.
- `src/lib/taPdf.ts` consumes the same sanitized HTML, so markup changes reach
  the PDF path.
