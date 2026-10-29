# Classroom shell — routing, links and shell-integrity audit

Date: 2026-08-03 · Method: live click-through as student `josh` (dev server, 1148×964) plus source trace of every rail destination in `src/App.tsx`, `src/lib/railCatalog.ts`, `src/components/classroom/shell/ClassroomLayout.tsx`.

Scope walked: Home · Notes and recaps · Assigned work · Drill · Bootcamps · Activities · Wrong answers · Flagged · Analytics · Messages · Schedule · Booking · Account · Whiteboard, plus the detail routes each of them opens.

Every item below is either **confirmed live** (seen in the browser) or **traced in source** — the label says which. Each carries a proposed fix and a falsification test: the specific thing to do that would prove the fix wrong if it did not hold.

---

## Verification caveat

`ProtectedRoute` short-circuits on localhost in dev (`isLocalDevAccessAllowed`, `src/components/ProtectedRoute.tsx:49`). Every gated route renders locally regardless of permissions, so **permission behaviour cannot be audited from a local run**. The rail's padlocks use real flags; the routes do not. See L19.

---

# HIGH PRIORITY

## H1 · The section list opens the wrong list from any detail route
**Confirmed live.** On `/classroom/item/<id>` I clicked **Assigned work** and the panel opened showing **Notes and recaps**; the rail's active item never moved off Notes.

Cause: `ClassroomLayout.tsx:787` — `activeSection = pathSection ?? selectedSection`. `sectionFromPath` pins `"notes"` for any `/classroom/item/*`, so the path always beats the user's click. Symmetrically, from a homework detail (`/classroom/:assignmentId`, pinned `"work"`) you cannot open Notes. Two of the three Classroom-group rail items are unreachable at any given time.

**Fix.** Flip the precedence to `selectedSection ?? pathSection`. The existing effect at `:789` already re-syncs `selectedSection` from `pathSection` on every `location.pathname` change, so navigation still snaps the rail to the right list — only an explicit click inside one route now wins.

**Falsify.** Open a note → click Assigned work: panel header must read "Assigned work" and the rail highlight must move. Then navigate to a homework detail: the rail must snap to "Assigned work" on its own. Add both to `ClassroomLayout`'s test file.

---

## H2 · "Whiteboard" points at the dead whiteboard
**Confirmed live.** The admin rail group (`ClassroomLayout.tsx:302`) sends Whiteboard to `/admin/board`. That page (`src/pages/AdminBoard.tsx`) is a bare `<Excalidraw theme="dark" />`: no save, no autosave, no session list, no student linkage, no title, hard-coded dark, and a back button reading "Main hub" pinned at `left-16 top-4` where it crowds Excalidraw's own menu.

The real whiteboard is `/teacher/whiteboard` (`TeacherSmartboard`): autosave, named sessions, template palette, per-student scoping.

**Fix.** Point the rail item at `/teacher/whiteboard`; replace the `/admin/board` route with `<Navigate to="/teacher/whiteboard" replace />`; delete `AdminBoard.tsx`; drop the stale `"/admin/board": "Whiteboard"` entry from `StudentShell.ROUTE_TITLES`.

**Falsify.** Click Whiteboard → URL is `/teacher/whiteboard`, a title field and Save control are present. Draw a shape, reload: the scene is still there. Hit `/admin/board` directly → redirected, no Excalidraw mounts from `AdminBoard`.

---

## H3 · Five of twelve rail items throw the user out of the shell
**Confirmed live** on Bootcamps, Activities, Analytics, Schedule, Booking. All five route under `StudentShell`, so the classroom rail is replaced mid-click by a different sidebar with a different item set (no Drill, no Flagged, no Analytics, no Activities) and different labels.

What the student then sees, stacked: `StudentShell`'s header, *plus* each page's own header carrying "Return to Main Hub", a high-contrast **Sign out** as the loudest element on the page, and a theme toggle. The Classroom design killed exactly that Sign-out prominence; it is still live one click away.

**Fix (staged).**
1. Move `/bootcamps`, `/activities`, `/analytics`, `/schedule`, `/booking` under the `ClassroomLayout` route. They render as ordinary stage content; `/journal`, `/flagged`, `/inbox` already prove the pattern.
2. Delete the self-drawn header (back link, Sign out, theme toggle) from each of those five pages — the rail already owns all three.
3. Once nothing routes through `StudentShell`, retire it with `MainhubSidebar` and `StudySidecar`.

**Falsify.** From `/classroom`, click each of the five: the rail stays mounted (no remount flash), the URL changes, there is no second sidebar, exactly one "Sign out" exists in the DOM and it is inside the rail's account menu, exactly one nav item is highlighted.

---

## H4 · Cold load shows the whole rail locked
**Confirmed live** on a cold `/flagged` load: every rail item rendered greyed with a padlock except Booking (the only item with no flag). It resolves a beat later.

Cause: `useUserPermissions` reports all flags false while `loading` is true, and `canAccess` in `ClassroomLayout.tsx:170` never consults `permissions.loading`.

**Fix.** Treat `loading` as "unknown, not denied": render items in a neutral state (no padlock, click deferred or ignored) until `loading === false`.

**Falsify.** Hard-reload `/journal` with cache disabled and the network throttled to Slow 3G, recording the tab. No padlock may appear on Home, Drill, or Messages in any frame. Add a unit test rendering the rail with `{ loading: true }` asserting zero `.classroom-nav-locked` nodes.

---

## H5 · Index pages tell you to pick from a list you cannot see
**Confirmed live at 1148px.** `/journal` renders "Choose an entry from the list", `/flagged` renders "Choose a flagged question from the list", `/classroom/recaps` renders "Choose a note or recap from the list" — and at that width the list column is not rendered at all. It is behind a trigger button that reads only as a section title.

The list column appears at ≥1280px (≥1400px for Wrong answers). A 13" laptop, or any window with a docked panel, lands under both.

**Fix.** At widths where the column is collapsed, the index route renders the list itself in the stage instead of the "choose from the list" line. At wide widths, behaviour is unchanged.

**Falsify.** At 1100px, `/journal` shows clickable entries with no extra click. At 1440px, the third column is present and the stage shows the instruction line, not a duplicate list. Check 1100 / 1279 / 1280 / 1399 / 1400 / 1600.

---

## H6 · The open section panel eats the first click on the rail
**Confirmed live.** With the panel open I clicked **Home** and nothing happened — the full-screen `.classroom-overlay-backdrop` consumed it and closed the panel; a second click was needed to actually navigate. The sidebar stays fully visible and undimmed behind the backdrop, so it looks live when it isn't. Every rail move from a panel costs two clicks.

**Fix.** Either inset the backdrop so it starts at the stage edge and never covers the sidebar, or close the panel on `pointerdown` capture without swallowing the event.

**Falsify.** Open Notes and recaps, then single-click Drill: URL is `/classroom/drill` after one click. Repeat for each rail item and for the mobile menu.

---

## H7 · 322 questions carry an unrecognised type; students see "Unknown"
**Confirmed live.** Console on load: `Found 322 questions with unknown types`, preceded by warnings for `Argument part`, `Must be true`, `Must be false`, `Necessary assumption`, `Parallel method of reasoning`, `Parallel flawed method of reasoning`, `PSA - Find the rule`, `Role of Statement`, `Except`. These are ordinary LSAT types in different casing/wording, not corrupt data. The consequence is visible: `/analytics` renders a flagged question tagged **Unknown**, and any by-type analytic silently under-counts.

Source: `src/lib/questionLoader.ts:738` — `normalizeQType` matches `CANONICAL_QTYPES` and `TYPE_SYNONYMS` case-sensitively before falling through.

**Fix.** Lower-case both sides of the canonical and synonym lookups, add the nine labels above to `TYPE_SYNONYMS`, and add a build/test assertion that no bundled question normalises to `Unknown`.

**Falsify.** Load `/classroom/drill`: zero `Unknown question type encountered` warnings and no `Found N questions with unknown types` line. `/analytics` flagged cards show a real type. The assertion fails the test run if a new bank introduces an unmapped label.

---

## H8 · "Assigned work" and the Home to-do disagree about what is assigned
**Confirmed live.** Home's To-do listed two guided drills. The Assigned work panel listed only "Intro to LR" and neither drill.

Cause: two independent builders. `buildWorkRows` (`classroomData.ts`) reads classroom_items + homework + TA. `useAssignedTodoFeed` reads homework + TA + guided + activities. Guided drills and activities exist in one list and not the other.

**Fix.** Build both from `useAssignedTodoFeed`, deduped by `(kind, refId)` — this is the F12 dedupe the Classroom spec called for and it was only half-applied.

**Falsify.** Assign one homework, one TA assignment, one guided drill and one activity to a test student. Home To-do and the Assigned work panel must show the same four rows in the same order. Complete one: both lists move it together.

---

## H9 · Duplicate assignments are indistinguishable
**Confirmed live.** Home and `/schedule` both show two rows reading exactly `First Sentence Conclusions · Guided drill · 6 questions · 30 min · Not started`. Nothing on screen separates them; `useAssignedTodoFeed` emits one row per assignment row with no dedupe and no disambiguator.

**Fix.** Dedupe by drill id, keeping the newest open assignment. If duplicates are ever legitimate, append the assigned date to the subtitle so the rows are distinguishable.

**Falsify.** With two assignment rows for the same drill in the DB, the list shows one row (or two with visibly different dates). Completing one leaves no phantom twin.

---

## H10 · Guided drills always return to `/schedule`
**Traced in source.** `useAssignedTodoFeed.ts` hard-codes `returnTo=/schedule` on every guided route. Start a drill from the Classroom home and finishing it drops you on `/schedule`, which is outside the shell (H3).

**Fix.** Set `returnTo` from the current location at click time rather than at row-build time.

**Falsify.** Start a guided drill from `/classroom`, finish it → back on `/classroom` with the rail intact. Start the same drill from `/schedule` → back on `/schedule`.

---

## H11 · Bootcamp assignments exit to a surface that calls the Classroom "Main Hub"
**Confirmed live.** The Assigned work row "Intro to LR" navigates to `/bootcamp/intro-to-lr` (via `resolveItemRoute`'s `bootcamp_module` case), a full-screen takeover with its own icon rail. Its home link's `href` is `/classroom` but its label reads **Main Hub** — a name the product retired. The same stale string appears as "Return to Main Hub" on Bootcamps / Analytics / Schedule and "Main hub" on `/admin/board`.

**Fix.** Rename every one of them to "Classroom" and sweep the codebase for the string.

**Falsify.** `grep -ri "main hub" src` returns no user-facing string. Visit the bootcamp, Bootcamps, Analytics, Schedule and the whiteboard: every back affordance reads "Classroom".

---

## H12 · The guided tour is dead code that cannot run
**Traced in source, four independent failures.**
1. `startTour()` is exported but never called in production code — only the test mocks reference it, so the `EVENT_START` listener never fires.
2. Six of thirteen steps target `/mainhub`, which is a permanent redirect to `/classroom/drill`; `onCurrentRoute` compares `location.pathname === step.path`, so those steps can never render.
3. The four `/classroom/drill` steps cannot render either — `GlobalOverlayMount` (`App.tsx:121`) returns `null` for any path starting `/classroom`, and `GuidedTour` is mounted inside it.
4. Anchors `[data-tour="mainhub-orbital"]` and `[data-tour="mainhub-quickdock"]` do not exist anywhere in `src`; the copy describes the retired orbital ring, top dock and quick dock.

Meanwhile `HelpSheet` still renders a **Replay tour** button when handed `onReplayTour`.

**Fix.** Decide, don't leave it: either delete `GuidedTour` and the Help replay affordance, or rewrite the steps against the classroom rail and mount the tour *inside* `ClassroomLayout` where its target surfaces live. Deleting is the honest default until onboarding is on the roadmap.

**Falsify.** If kept: Help → Replay tour walks every step, each with a visible spotlight on a real element, ending on `/classroom`. If deleted: `grep -r GuidedTour src` is empty and the Help sheet has no replay button.

---

# LOWER PRIORITY

## L1 · `/classroom/uploads` is an orphan that does nothing
**Confirmed live.** The route renders the heading "Your uploads" and nothing else — no upload control, no empty state. It is linked only from `StudySidecar` (`:599`), which lives in the *other* shell, so from inside the Classroom it is unreachable.
**Fix.** Add the submit control and empty state the Classroom spec specified, and give it a rail entry in the Classroom group — or delete the route.
**Falsify.** Reach uploads in one click from `/classroom`; submit a PDF; a row appears carrying its `processing_status`.

## L2 · `/classroom/recaps` is an orphan for the same reason
**Traced.** The rail's "Notes and recaps" opens a panel instead of navigating, and the only link to `/classroom/recaps` is in `StudySidecar:600`.
**Fix.** Make the rail item navigate to `/classroom/recaps` *and* open the panel.
**Falsify.** Click Notes and recaps → URL becomes `/classroom/recaps`; browser Back returns to `/classroom`.

## L3 · Section state is not in the URL
**Confirmed live.** Opening a list changes nothing in the address bar: the state cannot be linked, bookmarked, or backed out of, and Back from a note detail skips past the list entirely. Same fix as L2, generalised to all four sections.
**Falsify.** Open each section, copy the URL, paste into a new tab: the same section is open.

## L4 · `StudentShell.ROUTE_TITLES` is stale
**Confirmed live.** `/analytics` renders a header reading **"Workspace"** because the map has no `/analytics` entry; `/sets` is also missing; `/admin/board` is mapped but never renders inside that shell.
**Falsify.** `/analytics` header reads "Analytics", `/sets` reads its real title, no entry maps a route that shell never draws.

## L5 · Floating overlays leak onto classroom surfaces
**Confirmed live** on `/journal` and `/flagged`: the messenger bubble, corner notification and help button float over the classroom frame. `GlobalOverlayMount` suppresses by the `/classroom` path prefix, but `/journal`, `/flagged` and `/inbox` are drawn by the same `ClassroomLayout`.
**Fix.** Suppress by frame, not prefix — mount the overlays inside `StudentShell` rather than globally.
**Falsify.** No floating launcher appears on any route rendered by `ClassroomLayout`.

## L6 · The "New assignment" toast follows the student everywhere
**Confirmed live** on eight consecutive pages, overlapping the Analytics Practice button and the Booking help launcher.
**Fix.** Persist dismissal per notification id and cap the display duration.
**Falsify.** Dismiss once, then navigate five pages and reload: it does not come back.

## L7 · Assignment message template concatenates without punctuation
**Confirmed live** in the student thread: `New assignment: Intro to LR Foundational LR skills View in your Classroom:` followed by a button.
**Falsify.** Send a test assignment; the message reads as sentences with the title, subtitle and call to action separated.

## L8 · Debug output sits in a student thread
**Confirmed live:** `Journal verification 2026-07-27T09:46:24.277Z (About PT101-S2-Q25)`, visible to the student and marked Seen.
**Fix.** Keep verification messages out of student-visible threads; purge existing rows.
**Falsify.** No student-thread message matches `/^Journal verification \d{4}-/`.

## L9 · Internal build hash shown to students
**Confirmed live** on `/bootcamps`: `BUILD C73CB08D` under the page description.
**Fix.** Gate behind `is_admin` or `import.meta.env.DEV`.
**Falsify.** Signed in as a student against a production build, no build hash appears in the DOM.

## L10 · Four visual systems in one product
**Confirmed live.** Classroom = warm cream editorial. StudentShell = white/black utility. Drill hub (inside the classroom shell) = black space imagery captioned "REASONING INSTRUMENT 01". Booking = burgundy. The drill hub is the sharpest break because it sits *inside* the classroom frame.
**Fix.** Take the classroom system as the base and restyle the drill hub and booking onto its tokens. This is benchmark gate C5, suspended when the Classroom shipped; it is now due.
**Falsify.** Screenshot Home, Drill, Journal, Messages, Booking: background, border and type tokens all resolve from one scope; a squint test does not separate them into different products.

## L11 · Naming drift across the two navs
"Wrong answers" vs "Wrong Answer Journal" vs the `/waj` legacy path; "Drill" vs "Practice"; "Activities" vs "Activity Centre"; "Classroom" vs "Main Hub".
**Falsify.** One label per surface, identical in both navs and in every page title.

## L12 · A surface names itself twice
**Confirmed live** on `/journal`: "Wrong answers" appears in the collapsed-list trigger and again as the `h1`. The Classroom design's G4 gate is one name, once.

## L13 · Drill hub shows an empty module and mislabels notes as work
**Confirmed live.** "INSIGHT PREVIEW" renders a header and carousel dots with no content. "TODAY / NEXT UP" lists *notes* ("Notification test", "Test note", "Welcome to your classroom") with a **READY** badge and a **Start** action — they are reading material, not startable work.
**Fix.** Hide empty modules entirely; exclude non-actionable item types from the Next Up queue.
**Falsify.** With only notes assigned, Next Up is absent rather than populated; Insight Preview does not render until it has data.

## L14 · Analytics prints 0% where there is no data
**Confirmed live.** Difficulty levels 1, 2, 4, 5 show `0%` with no attempts; "Performance by Type" shows `Flaw 0% —`, `Method of Reasoning 0% —`.
**Fix.** Render an em dash or omit the tile until attempts exist. Truthful fallbacks over fabricated zeros.
**Falsify.** A brand-new student sees no percentage anywhere on `/analytics` until they have answered something.

## L15 · Activity Centre's back button double-hops
**Traced.** `ActivityCentre.tsx:22` navigates to `/foyer`, which redirects to `/classroom`. Point it at `/classroom` directly.

## L16 · React warning on every page load
**Confirmed live.** `` `ref` is not a prop `` from `StudentCornerBubble` → `AnimatePresence` → `PopChild`.
**Fix.** Forward the ref on the animated child.
**Falsify.** Console is clean of that warning on `/classroom`.

## L17 · Unknown classroom id may render blank — needs confirmation
**Unconfirmed.** On a cold load of `/classroom/<bogus-id>` the React root came back empty and the page rendered blank. I could not cleanly separate this from a browser-tool navigation error, so it is listed as suspected, not established. Separately and definitely: `ClassroomAssignmentView`'s not-found branch renders a heading with **no way back** — `ClassroomItemView`'s equivalent has a "Back to your room" button.
**Falsify.** Hard-load `/classroom/00000000-0000-0000-0000-000000000000` signed in, in a normal browser. Expect "Assignment not found" plus a back control. A blank page confirms the bug.

## L18 · `resolveItemRoute` has two gaps
**Traced.** `ClassroomItemView` redirects `weekly_plan_task` items through `resolveItemRoute`, which has no case for that type — it falls to `default` and returns the *current* URL, so the item never opens anything and the redirect effect re-fires on every render. And `lecture_video`, which the Classroom spec added to the type union, has no case either.
**Fix.** Add cases for both, or drop `weekly_plan_task` from the redirect list in `ClassroomItemView`.
**Falsify.** Create a `classroom_items` row of type `weekly_plan_task` and open it: content renders, the render count stays flat.

## L19 · The dev bypass hides every gating bug locally
**Traced.** `ProtectedRoute` returns children unconditionally on localhost in dev. Live consequence: the rail showed **Activities** padlocked while `/activities` rendered in full. That is correct in dev and invisible as a real problem, which is the danger — no permission regression can be caught before deploy.
**Fix.** Put the bypass behind an explicit env flag (`VITE_DEV_BYPASS_GATES=1`) so a plain local run exercises real permissions.
**Falsify.** With the flag unset, `/activities` renders `LockedModule` for a student without `has_activity_access`, matching the rail.

---

## Suggested order

1. **H1, H6** — two small edits in `ClassroomLayout`; they remove the two ways a click does the wrong thing.
2. **H2, H11, L4, L15** — the stale-route sweep; mechanical, no design decisions.
3. **H4, H5, L12** — the three defects a student on a 13" laptop hits on their first cold load.
4. **H7** — one normaliser fix that corrects every by-type number in the product.
5. **H8, H9, H10** — collapse the two assignment feeds into one.
6. **H3** — the shell unification; largest change, and it retires L5, L10 and half of L11 with it.
7. **H12** — decide the tour's fate before it rots further.

> Superseded by the revised order at the end of the second pass below.

---
---

# Second pass — 2026-08-03

Re-walked the same surfaces as a fresh run: `/classroom`, an item detail, `/classroom/recaps`, `/classroom/uploads`, `/classroom/account`, `/classroom/drill`, `/journal`, `/flagged`, `/inbox`, `/bootcamps`, `/activities`, `/analytics`, `/schedule`, `/booking`, `/admin/board`, `/teacher/whiteboard`, plus the redirect targets `/waj`, `/foyer`, `/mainhub`. Added two things pass 1 did not cover: **a 375px mobile pass** and **a dark-theme pass**. Signed in as student `josh` on `localhost:8080`.

## Method, and a correction to how pass 1 was verified

The browser tool intermittently drops clicks: the injected pointer event never reaches the page at all. It is not visible from the outside — the call returns success and nothing happens, which reads exactly like a dead control.

So every click this pass was gated on a capture-phase `pointerdown`/`click` listener installed on `document`. A click that produced **zero** events is a tool failure and was retried; a click that produced events but no navigation is a real defect. Only the second kind is reported.

This matters retroactively. Early in this pass the Home hero's "Start the drill" button appeared dead across two clicks — and it is not: instrumented, the click lands on `BUTTON.classroom-home-cta` and navigates correctly. **Any pass-1 finding of the form "I clicked X and nothing happened" was reported without this gate.** Exactly one such finding existed (H6), and it is re-confirmed below by the instrumented method, so nothing in pass 1 falls to this. But the method is the reason to trust the re-confirmation rather than the original.

Unchanged from pass 1: the dev bypass at `ProtectedRoute.tsx:49` means **no permission behaviour is observable locally**. Pass 2 found the concrete cost of that (N1, N2).

---

## Status of the 31 pass-1 findings

| # | Status this pass | Note |
|---|---|---|
| H1 | **Re-confirmed, instrumented** | On `/classroom/item/<id>`, clicking Assigned work opened a panel headed "Notes and recaps"; rail stayed on Notes |
| H2 | **Re-confirmed** | `/admin/board` mounts Excalidraw `theme--dark`, back button "Main hub", no title/save. `/teacher/whiteboard` has Title + Save now + student scoping |
| H3 | **Confirmed, one clause wrong** | See C2 |
| H4 | **Re-confirmed** | Whole rail padlocked except Booking during a load |
| H5 | **Re-confirmed** | At 1029px and at 375px: "Choose an entry from the list" with no list |
| H6 | **Re-confirmed, instrumented** | Click at Drill's own coordinates landed on `BUTTON.classroom-overlay-backdrop`; panel closed, URL unchanged. **Desktop only** — see C6 |
| H7 | **Re-confirmed, one more label** | Still 322. Add "Most strongly supported" to the list |
| H8 | **Re-confirmed, worse** | See C7 |
| H9 | **Re-confirmed** | Two identical rows on Home and on `/schedule` |
| H10 | **Now confirmed live** | Was traced-only. Launching from `/classroom` produced `/guided/a84153c7…?returnTo=%2Fschedule` |
| H11 | **Confirmed, scope much wider** | See N3 |
| H12 | **Decided, not re-verified** | Joshua's call: delete the tour and the Help replay button |
| L1 | **Re-confirmed exactly** | `/classroom/uploads` renders a breadcrumb and "Your uploads". Zero `input[type=file]` |
| L2 | **Re-confirmed** | `/classroom/recaps` reachable only by URL; rail item opens a panel instead |
| L3 | **Re-confirmed** | Opening a section leaves the URL at `/classroom` |
| L4 | **Re-confirmed** | `/analytics` still renders `h1` = "Workspace"; StudentShell sidebar still headed "Workspace" |
| L5 | **Re-confirmed** | Three `position: fixed` overlays on `/journal`, a ClassroomLayout route |
| L6 | **Re-confirmed** | Toast followed onto `/admin/board` and `/booking` |
| L7 | **Re-confirmed verbatim** | "New assignment: Intro to LR Foundational LR skills View in your Classroom:" |
| L8 | **Re-confirmed verbatim** | `Journal verification 2026-07-27T09:46:24.277Z (About PT101–S2–Q25)`, marked Seen. Posted **as the student**, not as the system |
| L9 | **Re-confirmed** | `BUILD 90444752` on `/bootcamps` |
| L10 | **Re-confirmed, +1 system** | Drill hub is pitch black inside the classroom frame; Teacher Workspace is a fifth chrome; `LockedModule` a sixth (N2) |
| L11 | **Confirmed live** | Classroom rail "Wrong answers" vs StudentShell "Wrong Answer Journal", same account, one click apart |
| L12 | **Re-confirmed, worse** | At 375px `/journal` shows "Wrong answers" three times. See N11 |
| L13 | **Partly stale** | See C3 |
| L14 | **Re-confirmed** | Seven `0%` on `/analytics`; the drill hub's Insight Preview now shows `0%` too |
| L15 | **Confirmed in source** | `ActivityCentre.tsx:22` still `navigate("/foyer")`; `/foyer` → `/classroom` verified live. Label is "Home", not "Classroom" |
| L16 | **Did not reproduce** | See C4 |
| L17 | **First half falsified** | See C1 |
| L18 | Traced only, unchanged | Not exercised; needs a DB row |
| L19 | **Confirmed, with consequences** | The bypass is what hides N1 and N2 |

---

## Corrections to pass 1

**C1 · L17 is wrong on its main claim.** `/classroom/00000000-0000-0000-0000-000000000000` does **not** render blank. The React root is populated and the stage reads "Assignment not found" inside the shell. The blank page in pass 1 was the browser tool, as suspected. The second half stands — the only control in the stage is the collapsed-list trigger, there is no back affordance — but the rail is mounted, so recovery is one click. **Downgrade to cosmetic**; it is now the weakest item on the list.

**C2 · H3's Sign-out clause is wrong for two of the five.** All five routes do leave the classroom rail — that part is exact, and `App.tsx:462-495` confirms they hang off `<Route element={<StudentShell />}>`. But `/booking` and `/activities` contain no "Sign out" and no "Return to Main Hub" in the page body at all. The self-drawn header with the loud Sign out is on **Bootcamps, Analytics and Schedule only**. H3's falsification test also asserts the one surviving Sign out lives "inside the rail's account menu" — it does not (N9). Rewrite both.

**C3 · L13's specifics have moved.** "Insight Preview renders a header and carousel dots with no content" is no longer true: it renders an ACCURACY TREND card. "TODAY / NEXT UP lists notes with a READY badge and a Start action" did not reproduce — the section now renders `TODAY` + `AUG 3` and nothing beneath it. The underlying fault (modules that render with nothing in them) stands; the symptoms in the write-up do not.

**C4 · L16 did not reproduce.** No `ref is not a prop` warning on `/classroom` or `/journal`. The cause is still in source — `ref={panelRef}` on a `motion.div` inside `AnimatePresence`, `StudentCornerBubble.tsx:216-218` — but that subtree only mounts when a live notification arrives, so the warning is conditional, not per-page-load. Keep it, restate it as conditional.

**C5 · H7 misses one label.** Add **"Most strongly supported"** to the nine already listed. Count unchanged at 322.

**C6 · H6 is desktop-only.** The mobile drawer at 375px navigates in one click and dims the page behind it properly. H6's falsification test says to "repeat for the mobile menu" — the mobile menu already passes, so that clause should be dropped rather than left as work.

**C7 · H8 is worse than "disagree".** The two lists are **disjoint**. Home's To-do showed two guided drills and not "Intro to LR"; the Assigned work panel showed "Intro to LR" and neither drill. Not one list missing a row — zero overlap.

**C8 · H3's step 1 is much smaller than it reads.** `App.tsx:409-458` is a single pathless `<Route element={<ClassroomLayout />}>`, and the five offenders are five sibling `<Route>` elements at 472-494. Step 1 is moving five JSX elements between two blocks. The real work is steps 2 and 3 (stripping the five self-drawn headers, then retiring `StudentShell`). Worth splitting: step 1 alone stops the shell swap and can ship on its own.

---

## New findings

### N1 · HIGH — The rail's padlocks and the routes' guards disagree; one route has no guard at all
**Traced in source, four cases.** `RAIL_CATALOG` (`src/lib/railCatalog.ts:42-55`) draws a padlock from a flag. The route does not always honour the same flag.

- **`bootcamps`** — rail gates on `has_bootcamp_access`. `App.tsx:492-494` renders `<Bootcamps />` with **no `ProtectedRoute` and no flag**. Every other student route is wrapped. A student who sees the padlock reaches the content by typing the URL, or by any link that points at it.
- **`home` / `journal` / `schedule`** — these pass `allowSignedIn` alongside their flags. In `ProtectedRoute.tsx:69-71`, `allowSignedIn && user` returns the children **before** the flag check at `:73`. The flags never run. Any signed-in user reaches `/classroom`, `/journal` and `/schedule` regardless of entitlement, while the rail keeps drawing their padlocks from those same flags.

So for four of twelve rail items the padlock is decorative. This is an access-control gap, not a UX inconsistency, and L19's dev bypass is precisely why no local run can see it.

**Fix.** Wrap `/bootcamps` in `ProtectedRoute flag="has_bootcamp_access"`. Decide per route whether `allowSignedIn` or the flag is the intent, and make the rail read from the same predicate the route uses — one `canAccess(itemId)` helper consumed by both, so they cannot drift again.

**Falsify.** For a student with every flag false: each padlocked rail item, entered by direct URL, renders the locked state — none renders content. Add a test that walks `RAIL_CATALOG` and asserts each item's route resolves through a guard on the same flags.

---

### N2 · HIGH — The locked state is a dark slab whose only escape is unreadable
**Corrected after implementation.** The first draft of this finding said the locked state "replaces the shell, rail and all". **That was wrong.** Both shells render their routes through an `<Outlet/>`, so `LockedModule` mounts *inside* the frame and the sidebar survives. Verified live once L19 made the real permission path reachable.

What is actually wrong, all confirmed on screen:

- `LockedModule.tsx` was `min-h-screen bg-zinc-900` — a full-viewport-height near-black slab painted inside a light stage. Not an escape from the shell, but a takeover of it, and a sixth visual system unrelated to the four in L10.
- **Its only action was invisible.** The button carried `text-zinc-300 border-zinc-700`, which assumes a dark surface, but shadcn's `outline` variant supplies `bg-background` — white in light theme. Measured: `rgb(212,212,216)` on `rgb(252,252,252)`, **1.44:1**. The single way out of a dead-end screen could not be read.
- Copy: "Premium Content Locked", "You do not have access to this module. Please contact administration." Names no one, offers no route to anyone, and the button read "Return to Main Hub".

Invisible on any local run (L19), which is how it survived a full pass.

**Fix.** Render the locked state as ordinary stage content inside `ClassroomLayout` so the rail stays mounted, and rewrite the copy through `wiki/teaching-voice.md` with a real next step — a link into Messages.

**Falsify.** With `VITE_DEV_BYPASS_GATES` unset (L19) and a student lacking `has_activity_access`, `/activities` shows the locked state **with the rail still mounted**, no `bg-zinc-900` full-screen element in the DOM, and a working link to Joshua.

---

### N3 · MEDIUM — "Main Hub" is in 19 places across 16 files, not the four H11 lists
`grep -rin "main hub" src` returns 19 hits in 16 files. H11 named four surfaces. The ones that actually reach a student and were missed:

- `LockedModule.tsx:25` — "Return to Main Hub", the most-seen instance of all (N2)
- `bootcamps/main-conclusion/.../WorkspaceShell.tsx:98,109` and `LeftRail.tsx:138,139,150` — the bootcamp takeover, twice each in label and `aria-label`
- `AdminDashboard.tsx:189`, `AdminInboxCommandCenter.tsx:227` — teacher-facing
- `journal/entry/JournalEntrySurface.tsx:278` — reachable via `pages/Journal.tsx`

H11's falsification test (`grep -ri "main hub" src` returns nothing user-facing) is the right test; its scope estimate was low by about 4×.

---

### N4 · MEDIUM — `src/pages/FlaggedQuestions.tsx` is orphaned dead code
Imported nowhere (`grep -rn "FlaggedQuestions" src` returns only its own file plus unrelated identifiers). `/flagged` is served by `FlaggedIndexView` inside the classroom shell (`App.tsx:429`). The orphan still carries its own page header, its own `h1` "Flagged Questions", and a "Return to Main Hub" button at `:117` — so it inflates the N3 count and will mislead the next person who greps for the flagged surface.
**Fix.** Delete it. **Falsify.** File gone, `npm run build` and `npm run typecheck` clean.

---

### N5 · MEDIUM — The retired hub paths land on Drill, not Home
`/mainhub` → `/classroom/drill` (`App.tsx:463`) and `/practice` → `/classroom/drill` (`:467`), both verified live. `/mainhub` was the **home** surface; anyone with an old bookmark, an old email link, or a stale PWA shortcut now opens the drill hub — the loudest, blackest page in the product — instead of their classroom.

`/practice` → drill is correct (the practice hub genuinely moved there). `/mainhub` → drill is not.

**Fix.** Point `/mainhub` at `/classroom`. **Falsify.** Load `/mainhub`: lands on `/classroom` with Home active in the rail.

---

### N6 · MEDIUM — Dark mode: today's day card is unreadable
`.classroom-home-day-today` in dark theme computes to `background: rgb(233,226,218)` with `color: rgb(179,172,164)` — cream on pale warm grey, roughly **1.75:1**. The floor is 4.5:1. In light mode the same card is dark-on-light and reads fine; only the background token flipped for dark, the foreground did not. It is the one light element in the whole dark week strip, so it also reads as a rendering error.
**Falsify.** In dark theme, computed contrast on `.classroom-home-day-today` ≥ 4.5:1. Add it to whatever contrast check the design system runs.

---

### N7 · MEDIUM — Dark mode: `/booking` stays pure white inside the dark shell
With the classroom theme set to Dark, the StudentShell chrome around `/booking` goes dark but the embedded booking card renders pure white with black text — a white slab in a black page. Consistent with L10 (Booking is its own visual system) and with C2 (it is not classroom-framed), but it is the most jarring instance and it appears the moment a student tries dark mode.
**Falsify.** Screenshot `/booking` in dark theme: no element with a near-white background larger than a control.

---

### N8 · LOW — Two floating overlays share the same anchor
`StudentCornerBubble` is `fixed bottom-24 right-6 z-50 w-[360px]` (`StudentCornerBubble.tsx:226-228`); the help FAB is `fixed bottom-24 right-6 z-40 h-11 w-11`. Identical anchor, so they overlap by construction whenever a notification is showing. Observed on `/booking`: the help "?" circle sits over the notification card's **Open** control.
**Fix.** Offset the bubble, or hide the FAB while the bubble is mounted. **Falsify.** With a notification showing, `elementFromPoint` at the centre of the bubble's Open control returns that control.

---

### N9 · LOW — Sign out is a one-click naked icon in the rail
`.classroom-icon-button` with `aria-label="Sign out"` sits permanently beside the profile trigger. It is **not** in the account menu — that menu holds Account, Customize layout and Appearance only. One click, no confirmation, always visible. The Classroom design's stated goal was to stop Sign out being a prominent affordance; it is currently a permanent one-click control with no undo. Fixing H3's falsification test (C2) means deciding this deliberately rather than by omission.

---

### N10 · LOW — The same student is "josh" in one surface and "Josh" in another
Classroom home and rail render **josh**; the drill hub greets **"Welcome back, Josh"** and the StudentShell profile block reads **Josh** — same account, same session, one click apart. Two different name sources.

---

### N11 · LOW — Surfaces name themselves two and three times
Beyond L12's `/journal`:
- `/journal` at 375px: "Wrong answers" **three times** — collapsed-list trigger, breadcrumb, `h1`
- `/activities`: "Activity Centre" (top bar) → "ACTIVITY CENTRE" (eyebrow) → "Your activities" (`h1`) — three, in two different names
- `/schedule`: **two `h1` elements with different text** — "Schedule" and "Study Schedule & Agenda"
- `/bootcamps`: two `h1` elements, both "Bootcamps"

The duplicate-`h1` cases are also an accessibility defect, not only a copy one.

---

### N12 · LOW — `/activities` renders inside a nav that has no Activities item
`/activities` is under `StudentShell` (`App.tsx:472`), whose sidebar is Classroom · Bootcamps · Messages · Wrong Answer Journal · Schedule · Booking. Activities is absent. A student who lands there cannot return to it from the navigation they are being shown. Dissolves with H3 step 1.

---

## Revised fix order

Two things changed the shape of this list. **N1 and N2 are the most serious findings in the document** and neither existed in pass 1 — both are permission-path defects that no local run can surface. And **H3's step 1 turned out to be a five-element move** (C8), not the large change it was ranked as.

1. **N1, N2, L19** — the permission path, as one piece of work. Put the dev bypass behind `VITE_DEV_BYPASS_GATES` first so the other two are observable at all, then close the `/bootcamps` gap and the `allowSignedIn` short-circuit, then bring the locked state inside the shell. Nothing else on this list can hurt a student the way an ungated route can.
2. **H1, H6** — unchanged from pass 1. Two small edits in `ClassroomLayout`, both re-confirmed instrumented.
3. **H3 step 1 only** — move the five `<Route>` elements from the `StudentShell` block into the `ClassroomLayout` block. Small, self-contained, and it kills N12 and half of L11 immediately. Steps 2 and 3 stay deferred pending Joshua's call on retiring `StudentShell`.
4. **The stale-name sweep — H2, H11, N3, N4, N5, L4, L15.** Now one job: 19 strings, one orphan file to delete, two redirect targets to correct, one whiteboard route to retire. Mechanical, no design decisions.
5. **H7** — one normaliser fix, plus "Most strongly supported".
6. **H8, H9, H10** — collapse the two assignment feeds. C7 raises the stakes: they are currently disjoint.
7. **H4, H5, L12, N11** — the cold-load and narrow-viewport set.
8. **N6, N7** — the dark-theme pass. Cheap, and dark mode is one click from every student.
9. **H12** — delete `GuidedTour` and the Help replay button. Decided 2026-08-03.
10. **Everything remaining** — L1, L2, L3, L5, L6, L7, L8, L9, L10, L13, L14, L16, L17, L18, N8, N9, N10.

---
---

# Implemented — 2026-08-03

Batches 1 to 3 of the revised order, plus what fell out of them. Typecheck clean; suite at 724 passing with the same 3 pre-existing failures that fail on a clean tree (`ConclusionTypeLab`, `page-six-switchboard`, `HelpSheet` — none touched here).

### L19 · the dev bypass is now opt-in
`ProtectedRoute.tsx` gates `isLocalDevAccessAllowed()` on `VITE_DEV_BYPASS_GATES === "1"`. A plain `npm run dev` exercises the real permission path. Documented in `.env.example`. This is what made N1 and N2 observable at all.

### N1 · the rail and the routes now share one predicate
- `/bootcamps` wrapped in `ProtectedRoute flag="has_bootcamp_access"` (`App.tsx`). It had no guard.
- `RailItem` gained `allowSignedIn`, mirroring the route prop, set on home/notes/work/journal/schedule/booking. The rail no longer padlocks doors the route opens for any signed-in user.
- `canAccess` in `ClassroomLayout` reads flags **and** `allowSignedIn`, and treats `permissions.loading` as unknown rather than denied — which also closes **H4** (cold-load padlocks), since it is the same three lines.
- `src/lib/railCatalog.test.ts` pins every rail item against the route table by reading `App.tsx`. Falsified before trusting it: removing the `/bootcamps` guard makes it fail with `rail padlocks "bootcamps" on has_bootcamp_access but its route has no ProtectedRoute`, and it caught a real mismatch while being written (`/booking`'s route declared `allowSignedIn`, the catalog did not).

### N2 · the locked state
Rewritten on tokens as ordinary stage content. No `min-h-screen`, no zinc. Contrast on the two actions measured live at **18.26:1** and **10.05:1**, up from 1.44:1. Copy through the teaching voice, with Messages as a real next step — offered only when the student has `has_chat_access`, so the one door we point at is not also locked. Verified as `josh`, who genuinely lacks `has_activity_access`.

### H3 · StudentShell is no longer routed
All six of its routes (`/sets`, `/activities`, `/analytics`, `/schedule`, `/booking`, `/bootcamps`) moved into the `ClassroomLayout` block; the bare redirects moved out to the top level. The `StudentShell` import is gone from `App.tsx`. **The file itself is untouched and still on disk** — deleting it, `MainhubSidebar` and `StudySidecar` is Joshua's call.

Each moved page lost the header it drew for itself (back link, Sign out, theme toggle), since the rail owns all three. Confirmed live on all five: rail mounted, zero "Sign out", zero "Main Hub", zero "Workspace".

Fell out of it: **L4** (`/analytics` no longer renders "Workspace"), **L15** and **N5** (`/mainhub` now goes to `/classroom` not the drill hub; Activities' `/foyer` double-hop deleted with its back link), **N12**, and the `/schedule` and `/activities` halves of **N11** (one name per surface: "Schedule", "Activities", "Analytics", "Bootcamps").

### Two regressions the move caused, both found and fixed
- **Analytics lost its `h1`** when its header went. Restored on the page — the rail is navigation, not the document heading.
- **Booking clipped.** The Cal.com card needed 677px inside a 611px column with `overflow-hidden`. `md:` was a fair proxy for "there is room" in a full-width shell and is wrong in a narrower stage, so it now uses the `@container` plugin already in the project: `@3xl` on the card itself. The classroom column caps at 720px so it always stacks there; `PublicBooking` is `max-w-4xl` (896px) so it keeps two columns. A viewport breakpoint could not get both right. Verified at 375 / 768 / 1029 / 1440: zero overflowing elements at every width.

### Batch 4 · the stale-name sweep — H2, H11, N3, N4, N5, L4, L15

`grep -ri "main hub" src` **returns nothing**, which is H11's falsification test. 19 strings across 16 files, plus two comments, all resolved.

- **Renamed on every live surface**, each of which already navigated to `/classroom` and only carried the retired label: the bootcamp takeover (`WorkspaceShell`, `LeftRail`), `JournalEntrySurface`, `AdminInboxCommandCenter`, `AdminDashboard`, `MainhubDock`, and **both Drill return buttons** — which pass 1 missed entirely. Drill's "Flagged Questions" also became "Flagged" to match the rail (part of L11).
- **H2 was already half-fixed upstream.** The audit said the admin rail sends Whiteboard to `/admin/board`; the teacher IA rebuild has since replaced that whole group with a single "Teacher Workspace" entry, so there is no Whiteboard rail item to repoint. Only the dead route remained: `/admin/board` now forwards to `/teacher/whiteboard` (verified live), and `AdminBoard.tsx` is gone.
- **N5** already done in batch 3; **L15** died with Activities' back link; **L4**'s live symptom died with the shell move, and its `ROUTE_TITLES` map went with `StudentShell`.

### Deletions — approved by Joshua, 2026-08-03

Ten files, all unreferenced at the time of removal:

`AdminBoard.tsx` · `FlaggedQuestions.tsx` (N4) · `MainhubScrollHint.tsx` · `GuidedTour.tsx` (**H12**, decided earlier) · `StudentShell.tsx` + test · `MainhubSidebar.tsx` + test · `StudySidecar.tsx` + test.

`GuidedTour` also took the Help sheet's "Replay tour" button with it — and confirming H12's diagnosis, **nothing ever passed `onReplayTour`**, so that button could not render for anyone. The prop is gone from `HelpSheet` and `HelpDialog`.

Left behind deliberately: `layoutPresets.ts` and `useLayoutPrefs.ts` are now dead (their only consumer was `MainhubSidebar`), flagged in a comment rather than removed, since deleting them was not part of what was approved.

### Not verified
The scroll-reveal blocks on `/analytics` sit at `opacity-0`. `document.visibilityState` is `hidden` in both the built-in pane and the backgrounded Chrome tab, which suspends IntersectionObserver delivery, and real Chrome is not signed in. Nothing in this diff touches `useScrollAnimation` or those classes, so this is near-certainly the hidden-tab artifact rather than a regression — **but it is unconfirmed, and worth a glance in a real signed-in window.**

---

# Implemented — 2026-08-03, second pass

Batch 4 of the revised order (H7) and batch 5 (H8, H9, H10). Typecheck clean. Suite at 888 passing with the same 4 pre-existing failing files, none of them touched here (`ConclusionTypeLab`, `page-six-switchboard`, `HelpSheet`, and `DeskPeopleSurface`, the last being new fallout from the concurrent teacher-desk work). The failure count fluctuates run to run (8 / 7 / 6), so some of those are flaky.

### H7 · question types — the audit undercounted this by an order of magnitude
The finding said "nine unmapped labels plus `Most strongly supported`". The bank actually holds **111 distinct spellings of 18 real types** across 158 hand-entered section files. Three layers were needed:

1. `SYNONYM_INDEX` folds case over the canonical types and every synonym.
2. `stripQTypeDecorations` removes trailing parenthetical tags (`Flaw (Flaw)`) and EXCEPT markers (`Weaken EXCEPT`, `Strengthen (EXCEPT)`).
3. ~45 new synonyms for longhand and 7Sage-style labels (`Argument Part` → Role, `Inference` → Must Be True, `Principle-PSA` → Principle-Strengthen).

That cleared the label side completely. The 78 left over all had *useless* labels (`"Unknown"`, `"Miscellaneous"`, `"Except"`) and were failing in `inferTypeFromStem`, whose worst bug was matching `requires` when the stem the LSAT writes is "an assumption **required** by" — ~15 questions on its own.

**Coverage is not correctness.** The first pass tripled coverage but dropped stem accuracy 80.4% → 79.0%, which exposed two pre-existing ordering bugs: `Flaw` was tested before `Parallel Flaw`, and `Strengthen` before `Principle-*`, swallowing ~330 questions into the broader bucket. Ordering the checks most-specific-first fixed both.

Live in the app: **`Found 5 questions with unknown types`, down from 322.** Stem inference **83.7% over 3245 scored, up from 80.4% over 2530**. `questionLoader.qtypes.test.ts` runs the real normalizer over the real bank and pins both the Unknown ceiling and the accuracy floor.

Open judgment call: EXCEPT questions file under their family, so a `Weaken EXCEPT` lands in Weaken. Right for drill filtering, but its credited answer is the one that does NOT weaken, so answer mechanics are inverted within that bucket. Flagged in a comment.

### H8 · the two feeds are now one — and the audit's prescribed fix was wrong
The audit said "build both from `useAssignedTodoFeed`". That would have **emptied** the Assigned work panel: the feed never read `classroom_items`, and for the test student the only work row is a `bootcamp_module` ("Intro to LR") that exists nowhere else.

Root cause confirmed against the live DB: `assignWork.ts` writes `classroom_items` with `source_table` of `homework_assignments`, `guided_drill_assignments`, `activity_assignments` or `bootcamps`, so the two feeds genuinely overlap — but for this student there are 4 classroom items (1 `bootcamps`, 1 `profiles`, 2 notes) and **zero** pointing at a guided drill. Hence disjoint rather than merely inconsistent.

`useAssignedTodoFeed` is now the single source and reads all five tables. Identity is `sourceTable:refId`; a classroom item that points at a source assignment overrides it, supplying the teacher's title and due date while `resolveItemRoute` sends it to the same destination the raw row would have used. A third bug fell out: `buildWorkRows` hardcoded `/classroom/item/:id` and never called `resolveItemRoute`, so every row took a needless hop through a generic detail page. `buildWorkRows` is now dead and flagged, not deleted.

Verified live: Home and the Assigned work panel show the **same two rows** — previously Home had the drill and no bootcamp, the panel had the bootcamp and no drill.

### H9 · duplicate assignments collapse
Confirmed with data before fixing: 2 `guided_drill_assignments` rows, **1 distinct `guided_drill_id`**, assigned 6 minutes apart, both `assigned`. Guided rows now collapse by drill id. An open assignment beats a completed one — hiding still-owed work because a later twin was finished would be worse than showing a stale date — and the newest wins within that. Live: `/schedule` shows one drill row, not two.

### H10 · a guided drill returns where it was launched from
The feed no longer bakes `returnTo` into the row. `routeWithReturnTo(route, pathname)` stamps it at click time. Verified live on the same assignment the audit traced: from `/classroom` → `?returnTo=%2Fclassroom`; from `/schedule` → `?returnTo=%2Fschedule`.

`useAssignedTodoFeed.test.ts` pins all three findings (11 tests). The H9 cases were falsified first — swapping the dedupe key back to the assignment id fails exactly those two and nothing else.

### H5 · index pages now show the list they tell you to pick from

The section-list column is hidden below 1280px, and below 1400px for Wrong answers, where it collapses behind a trigger that reads as nothing more than a section title. At those widths `/journal`, `/flagged` and `/classroom/recaps` each said "choose from the list" with no list anywhere on screen — which covers a 13" laptop and any window with a panel docked.

Each index view now renders the real list in the stage via a shared `StageIndexList`. Both copies always render and CSS shows exactly one, at the same two breakpoints the column itself uses, so there is no width measured in JS and nothing to re-run on resize. `display: none` also keeps the hidden copy out of the accessibility tree, so nothing is announced twice. Empty states are unchanged — when there is nothing to list, the explanatory copy still shows at every width.

**Falsified across the matrix the finding asked for**, reading the computed `display` of the column, the stage list and the hint at each width:

| width | column | stage list | hint | clickable rows on screen |
|---|---|---|---|---|
| 1100 | none | grid | none | 2 |
| 1279 | none | grid | none | 2 |
| 1280 | block | none | block | 2 |
| 1600 | block | none | block | 2 |

Never both, never neither, and never a duplicated list — the count stays at 2 on both sides of the boundary. `/classroom/recaps` matches at 1100 and 1600. `/journal` flips at its own boundary instead: column and stage list swap between 1399 and 1400.

Clicking an entry at 1100px navigates in one click (`/flagged` → `/flagged/PT118-S3-Q8`), which was the finding's falsification test.

Caveat: the test student has 0 journal entries, so `/journal`'s stage list could not be exercised end to end. Its breakpoint was confirmed at the CSS level with a probe node carrying the real classes inside the real `.classroom-root.classroom-root-journal`; `/flagged` and `/classroom/recaps` were confirmed with real rows.

### L12 · one name, once

The finding named the collapsed-list trigger and the `h1`. Both were fixed, and looking for the second one turned up a different culprit than the finding described.

The trigger printed `SECTION_TITLES[activeSection]`, so at narrow widths it repeated whatever the stage's `h1` already said. It now reads "Open the list" and keeps the section name in `aria-label` ("Open the wrong answers list"), where there is no adjacent `h1` to supply the context.

The remaining duplicate on `/journal` was **not** the trigger: `JournalViews`' `DetailHeading` hardcoded the dateline chip to "Wrong answers", and the index passed `title="Wrong answers"`, so the surface printed its own name twice in adjacent lines. `/flagged` and `/classroom/recaps` already avoided this by putting the *rail group* in the chip ("Review", "Classroom"), so the fix was to follow the convention already in the codebase: `kind` is now a prop defaulting to "Wrong answers" (right on an entry, where the `h1` is the question) and the index passes "Review".

Live at 1100px, `/journal` reads `August 3, 2026 | Review` · h1 `Wrong answers` · trigger `Open the list`, with exactly one visible "Wrong answers" node in the stage.

Not exercised: a journal *entry* page, since the test student has 0 entries. Those two call sites take the default `kind`, unchanged from before.

### N11 · closed, no code needed

Re-verified live rather than assumed. `/journal` at 375px now renders "Wrong answers" **once** (the `h1`), down from three — the L12 fix closed it. `/bootcamps` and `/schedule` each have exactly one `h1`; last session's removal of the pages' self-drawn headers closed those.

### N6 · dark-mode day card — real, but not what the finding described

The finding reported the whole card at **1.75:1** from `color: rgb(179,172,164)`. That colour is the card container's *inherited* `color`, which no rendered text uses: every text child overrides it. Measured against the real backgrounds, with `opacity` composited in (which `getComputedStyle().color` alone does not show):

| element | size | before | after |
|---|---|---|---|
| `MON` abbr | 9px | **4.01:1** | 5.63:1 |
| `3` date | 17px | 12.83:1 | 12.83:1 |
| `Open` label | 11.5px | 7.48:1 | 7.48:1 |

So one 9px label failed, not the card. Cause: the light rule mutes the abbreviation with `opacity: 0.6` over a dark background (4.83:1, passing); the dark rule flipped the background to cream and overrode only the colour, leaving the same 0.6 to drop it to 4.01:1. Dark now carries the de-emphasis in the colour instead, so the hierarchy still reads (abbr 5.63 < label 7.48 < date 12.83) with nothing under the floor. Light mode is untouched.

### N7 · booking in dark — fixed, and the root cause is architectural

Confirmed: a single 688×647 pure-white block, and it is our own component, not a Cal.com iframe.

The root cause is bigger than `/booking`. `html` carries `dark`, but `--card` at the root still resolves to `0 0% 100%`, because **`.dark` in `index.css` is a deliberate alias that mirrors `.light`** — same values, `color-scheme: light`, commented "reserved alias". The genuinely dark shadcn tokens sit on `:root`, which both classes override. Every shadcn surface in the app is therefore light by design, and the classroom only looks dark because `classroom.css` and `home.css` draw their own `html.dark` rules in raw hex. `.booking-holo` then overrides the tokens again with its own deliberately-light burgundy theme.

Making `.dark` a real dark theme would flip every shadcn surface in the app — admin, teacher, every dialog. That is a product decision, not an audit line item, so it is **left for Joshua**.

What shipped is scoped: a dark re-voicing of the burgundy palette under `html.dark .classroom-root .booking-holo`. `/book/:slug` is unaffected — it renders outside `.classroom-root` and clears the theme class anyway, verified live (`insideClassroom: false`, palette unchanged). Light mode `/booking` is unchanged (`--primary: 347 70% 27%`, white card).

`--primary` is 68% lightness rather than the light theme's 27% because the accent is used as *text* on the card: at 58% it measured 4.13:1. Every text colour on the card now clears the floor, lowest 5.35:1, with translucent backgrounds composited before measuring.

**Falsified as the finding asked:** no element with a near-white background larger than a control — the query returns an empty array.
