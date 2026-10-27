# My Work notes-first review log

## Implementation checkpoint: 2026-10-26

Joshua approved implementation and requested no instructor name in new interface furniture, higher-quality component consideration and restrained refinement. Codex implemented in the isolated branch. Final proof:129 tests/11files, typecheck, build/postbuild, diff check and browser matrix320-1440 pass. Independent Codex source review found no remaining high-confidence important defects. Exactly two Claude plan invocations were used; no Claude code inspection performed or claimed. Full scope, amendments, evidence and remaining limits are recorded in docs/verification/my-work-notes/README.md. No commit, push, merge, deployment or production data write.

2026-10-26: Codex host/planner, Claude independent plan reviewer. No model override requested; CLI configured default is unresolved until returned evidence. Plan: docs/plans/my-work-notes-first.md. Isolated branch codex/my-work-notes-plan-20261026 at eaf82e506bbeb3b5e86f1310f98bad3e818b926a. Scope: notes-first My Work redesign proposal, not app implementation. Maximum two Claude plan-review invocations/rounds. Code inspection remains required if a build is later authorized; no inspection opt-out. Run diagnostics outside checkout. User clarification: notes primary, assignments secondary, useful visual components and engaging navigation. Screenshot Teacher identity cannot prove student runtime behavior.

## Round 1
Result: C:/Users/Joshu/AppData/Local/Temp/claudex-np9serop/result.json
Observed model: claude-opus-5-5. Verdict REVISE.
{
  "verdict": "REVISE",
  "summary": "The direction is sound: put notes first, keep the archive visible, and keep URLs and permissions unchanged. The source already supports most of it. One thing is pinned down well: useClassroomItems returns every note in a single unpaginated query, so search over the full set is feasible. But several contracts the plan relies on don't hold in the current code, or are left unspecified in a way that would let defects ship. (1) Reordering the tabs changes where the rail sends a Reading-Center-only account while that account's access check is still pending. (2) The excerpt/search helper parses teacher HTML into a live-document element without sanitizing it, and the plan would run it on every note. (3) Back-navigation and state restoration have no mechanism. The existing Back buttons hard-navigate to /classroom/recaps, and that redirect drops all state. Deep-link entries have no archive history to restore. (4) The assigned-work count and status rules live inline in MyWorkList, so the panel's 'real count' fallback still needs a shared selector. (5) The app uses BrowserRouter, so the plan's unsaved-edit protection can't use useBlocker. Smaller gaps: stale index-based and landing-path tests, an undocumented reversal of the month-grouping decision, an ambiguous sort timestamp, and the question-bank cost of the new default landing.",
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "path": "src/components/classroom/shell/ClassroomLayout.tsx",
      "evidence": "ClassroomLayout.tsx:127-128 builds destinationPermissions with readingCenterChecking = readingCenter.isPending, and :248 calls destinationLandingPath('my-work', destinationPermissions) as soon as permissions.loading is false. It does not wait for the Reading Center check the way DestinationIndex does (StudentDestination.tsx:114). destinationLandingPath (destinationAccess.ts:131) falls back to tabs[0] when no tab is 'open'. Today tabs[0] is To do, so a Reading-Center-only student who clicks the rail while the check is pending still reaches MyWorkGate, which shows 'Checking…' and then the assignment. After the plan's reorder, tabs[0] is Notes. The same click goes to /my-work/notes, where ProtectedRoute flag='has_classroom_access' shows a lock page, which contradicts acceptance item 'A Reading-Center-only account still opens its allowed assignment destination'. Accounts with neither grant would also start landing on the Notes lock instead of MyWorkGate's lock and error-retry handling.",
      "fix": "Don't rely on tab order for the fallback. Add an explicit landing rule to destinationLandingPath for my-work: Notes when has_classroom_access or is_admin, otherwise /my-work/to-do (including the 'checking' and fully-locked cases). Or have the rail click wait for readingCenter.isPending the same way DestinationIndex does. Add destinationAccess and ClassroomLayout tests for readingCenterChecking=true with no classroom access, and for fully-locked accounts."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "noteExcerpt (ClassroomRouteViews.tsx:101-105) runs document.createElement('div').innerHTML = source on raw content_html, bypassing sanitizeClassroomHtml. A div created by the live document starts image loads and fires inline handlers when you assign innerHTML (e.g. <img src=x onerror=...>). Only <script>/<style> are removed, and only after the parse. Today this runs for one featured note. The plan's 'safe plain-text body' search and per-card excerpts would run it for every note on every recompute. That executes any authored inline handler, sidestepping the sanitizer's stated reason for blocking script (classroomData.ts:29-30). It also fetches every image in every note, and the code comments say there will be hundreds of notes within a year.",
      "fix": "Require an inert parser for excerpts and search text: new DOMParser().parseFromString(html,'text/html'), or a <template> element, or sanitizeClassroomHtml before extracting textContent. Compute the text once per item, memoized by id+updated_at. Add a test proving an <img onerror> in content_html neither runs nor triggers a fetch when the archive renders."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "Both Back buttons (ClassroomRouteViews.tsx:285 for the interactive-lesson iframe branch, and :346) call navigate('/classroom/recaps'). App.tsx:615 then redirects to /my-work/notes using only the current (empty) search. Any archive search, filter, batch or scroll state is lost. Notes are also opened from places with no archive history: AnnouncementBanner, AnnouncementsSection, ThisWeekSection, the ClassroomLayout panel (:699) and home cards, so navigate(-1) isn't safe. On top of that, /my-work/notes already uses ?note= for the personal notebook (MyWorkNotesPage.tsx:19), and setParams pushes history entries. The plan names neither how archive state is encoded nor how it coexists with ?note= and the 'My notes' view.",
      "fix": "Define the URL contract in the plan. For example, archive state goes in query params (q, filter, shown) on /my-work/notes, with a separate view=mine param for the personal notebook that keeps ?note=. Card links carry returnTo, matching the existing routeWithReturnTo pattern. Both detail Back buttons honour a validated same-origin returnTo and otherwise fall back to /my-work/notes. Use replace for keystroke-level search updates. Test Back from both branches and from a deep-linked entry."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "src/pages/MyWorkPage.tsx",
      "evidence": "The truthful assignment projection isn't in the hook. MyWorkList (MyWorkPage.tsx:27-29) filters Reading Center rows by readingCenterAllowed && refId==='library', filters other rows by generalAccess, and partitions by status==='completed'. It also labels counts as 'shown (list may be incomplete)' when failed (:47) and wraps routes in routeWithReturnTo (:56). The plan's fallback, 'ship the navigation link and real count only', still needs exactly this projection. Applying a raw rows.length from useAssignedTodoFeed would count completed rows and present a partial count as fact when any of its roughly seven sub-queries fails (useAssignedTodoFeed.ts:369).",
      "fix": "Extract the visible-row selector, plus the failed and evidenceWarnings semantics, from MyWorkList into a shared function used by both MyWorkPage and the Notes panel. Have the panel show a count only when !loading, and mark it as possibly incomplete when failed. Cover with a test that the panel and /my-work/to-do agree for the same fixture, including a failed sub-query."
    },
    {
      "id": "F5",
      "severity": "medium",
      "path": "src/App.tsx",
      "evidence": "App.tsx:6 and :286 mount <BrowserRouter>, not a data router, so react-router's useBlocker and usePrompt are unavailable. The plan's 'Protect unsaved edits on navigation/close' therefore can't intercept rail clicks, destination tabs, archive card links or browser back through the router. The current editor (MyWorkNotesPage.tsx:48-55, 105) also discards edits silently on Close and on choosing another note.",
      "fix": "Narrow the plan to what's achievable: a dirty-state confirm on the notebook's own Close, note-switch and view-toggle controls, plus a beforeunload handler. State explicitly that in-app navigation away via the rail/tabs is not guarded unless a router migration is approved. Alternatively, specify a local-draft autosave (keyed by user id and note id) so edits can't be lost."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "src/lib/destinationAccess.test.ts",
      "evidence": "Tests address tabs by index: destinationAccess.test.ts:78 asserts tabs[2] (currently Notes) is 'locked' under readingCenterChecking. After a reorder, the same assertion would hit a different tab. ClassroomLayout.test.tsx:100 expects the rail to land on '/my-work/to-do', and StudentDestination.test.tsx:51 asserts the label order. ClassroomLayout.test.tsx is not in the plan's verification list.",
      "fix": "Add src/components/classroom/shell/ClassroomLayout.test.tsx to the required test run. Rewrite index-based tab lookups to find tabs by path, so the reorder can't silently retarget an assertion."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "ClassroomRouteViews.tsx:473-479 records a prior design decision: read notes are grouped by month above 12 items because 'a student looks for \"the one after the February session\", not for a word'. The plan replaces this with search plus a flat newest-first grid and doesn't mention month grouping at all. Its 'no falsely inferred session groupings' rule doesn't cover month headings, which come from stored dates. The plan also says 'stored timestamp' without choosing created_at (used for sort, dates and month buckets today) or updated_at.",
      "fix": "State explicitly whether month headings are kept inside the grid or dropped, and why, since this reverses a documented decision. Specify created_at desc with id as the tie-breaker, and show that same date on cards so the order and the visible dates agree."
    },
    {
      "id": "F8",
      "severity": "low",
      "path": "src/hooks/useClassroomItems.ts",
      "evidence": "Student visibility is enforced only by RLS (visible_to_student and unlock_at, migration 20260506170411). The query (useClassroomItems.ts:63-69) and groupNotes/classroomNotes (classroomData.ts:77-114) do no client-side filtering by visibility, unlock or status. Admins bypass RLS, so an admin opening their own My Work sees hidden, future-unlock and draft or archived notes counted in the plan's 'real totals for available notes' and unread filter. That makes admin, teacher or fixture checks diverge from student truth beyond what the plan's 'teacher screenshot' caveat covers.",
      "fix": "Either have the archive selector exclude visible_to_student=false, future unlock_at and draft/archived rows, which matches the student RLS and is a no-op for students, or document that admin views can show extra items and require that count acceptance comes from a student account or student-shaped fixtures."
    },
    {
      "id": "F9",
      "severity": "low",
      "path": "src/contexts/QuestionBankContext.tsx",
      "evidence": "BANK_FREE_PREFIXES (QuestionBankContext.tsx:53-59) exempts '/classroom/recaps', where loading the bank was measured at about 1.8MB and 59 requests. But that path now only redirects to /my-work/notes, which isn't exempt. Making /my-work/notes the default My Work landing puts that load on the most common entry, which runs against the plan's goal of showing the archive immediately.",
      "fix": "After grepping the new Notes subtree (archive component, assignment panel, useAssignedTodoFeed) for questionLoader as the file's own rule requires, add '/my-work/notes' to BANK_FREE_PREFIXES, or record why it can't be added."
    },
    {
      "id": "F10",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "Opening a note calls markNoteRead and then invalidates ['classroom-items'] (ClassroomRouteViews.tsx:208-221). If the student had the Unread filter on, the note they just read disappears on Back. A restored scroll offset then points at a shifted list, and the 'unread' count changes under them. The plan requires that Back 'restores search/filter/position' but doesn't define behaviour for that case.",
      "fix": "Specify that the scroll position is restored by anchoring to the opened note's card (or its nearest neighbour if it's now filtered out), not by pixel offset. Add a test for opening from the Unread filter and coming back."
    }
  ],
  "coverage": [
    "Read the plan text in full",
    "src/lib/destinationAccess.ts (tabs, tabAccess, destinationLandingPath, locks)",
    "src/pages/StudentDestination.tsx (tab rendering, DestinationIndex wait logic)",
    "src/components/classroom/shell/ClassroomLayout.tsx (rail landing at :127-128 and :248, sectionFromPath, notes side panel)",
    "src/pages/MyWorkNotesPage.tsx (personal notebook, ?note= param, save/close behaviour)",
    "src/components/classroom/ClassroomRouteViews.tsx (ClassroomItemView, Back navigation, noteExcerpt, FeaturedNote, ClassroomRecapsView, month grouping)",
    "src/components/classroom/classroomData.ts (NOTE_TYPES, sanitizeClassroomHtml, groupNotes, read state)",
    "src/lib/markNoteRead.ts (read-state writes and invalidation)",
    "src/hooks/useClassroomItems.ts (identity filter, no pagination)",
    "src/hooks/useAssignedTodoFeed.ts (grep: composition and failed flag)",
    "src/pages/MyWorkPage.tsx and src/components/MyWorkGate.tsx (assignment projection and gates)",
    "src/App.tsx routes 595-645 and router type",
    "supabase/migrations classroom_items student select policy (grep)",
    "src/contexts/QuestionBankContext.tsx denylist",
    "Grep of /my-work, /classroom/recaps, /classroom/item callers and existing test references"
  ],
  "limitations": [
    "Couldn't run tests, typecheck, build or a browser, so no runtime behaviour is claimed",
    "Didn't read StageIndexList, myWorkNotes.css, the classroom CSS, CONTEXT-MAP.md, the ADRs or design/methods.md, so the visual and composition claims weren't independently checked",
    "Didn't read journalService (listPages, updateMyNotePage) or the personal-notes RLS, so the 'another user's notes remain inaccessible' boundary wasn't verified",
    "Read useAssignedTodoFeed.ts only through grep, so its full row and status semantics weren't traced",
    "Didn't confirm the deployed Supabase max-rows setting, so I couldn't check whether a large classroom_items result could be silently truncated",
    "Couldn't verify the plan's SHA256 hash"
  ]
}

## Round 2 final
Result: C:/Users/Joshu/AppData/Local/Temp/claudex-v9nkgs_x/result.json
Observed model: claude-opus-5-5. Verdict APPROVED. Two of two invocations used. Plan hash: 1af6f19da41112bf2e1b4b623b3d5a07c76c5a50d2973ec63f912a710a7b89b5
{
  "verdict": "APPROVED",
  "summary": "This revision resolves all ten round-1 findings (F1–F10). F1: explicit My Work landing rule with pending/denied cases kept on MyWorkGate. F2: excerpts extracted from sanitized inert template content, plus a browser proof of no side effects. F3: archive URL keys, a validated returnTo and both Back branches defined. F4: a shared assignment selector; the link-only fallback shows no count. F5: control confirmations plus account-keyed session drafts, without useBlocker. F6: shell tests and path-based tab assertions. F7: month headings kept, created_at desc / id asc. F8: admin vs student evidence separated. F9: question-bank audit before exempting /my-work/notes. F10: anchor or neighbour restore when returning from Unread. I confirmed the new defect evidence in source. classroom.css:5043-5057 hides .classroom-stage-index at 1280px and wider, and sectionFromPath (ClassroomLayout.tsx:72-98) returns null for /my-work/notes, so the side column at :1200-1204 never renders there. Wide My Work therefore shows only the featured note and the stage hint ('All 4 read'), which matches the screenshot. The plan's dedicated, always-visible archive class addresses this without touching other StageIndexList consumers. Three low-severity implementation cautions remain (query-key and pagination stability, draft-key edges, panel rows without returnTo). None of them is a material defect in the plan's contract.",
  "findings": [
    {
      "id": "R2-1",
      "severity": "low",
      "path": "src/hooks/useClassroomItems.ts",
      "evidence": "The plan allows changing useClassroomItems to exhaustive paginated retrieval. That hook is shared by useAssignedTodoFeed, useTodayFocus, ClassroomLayout's section panel, Schedule, Bootcamps and ClassroomItemView. Its current order (priority desc, due_at asc, created_at desc; :67-69) has no unique final key, so range pagination can duplicate or skip rows across page boundaries. Separately, markNoteRead's refresh invalidates only the ['classroom-items'] key prefix (ClassroomRouteViews.tsx:213). A separate notes-only query under a different key would keep stale unread state after Back.",
      "fix": "If pagination is added, append .order('id') as a unique tie-breaker, keep the existing output order for every consumer, and dedupe by id. Any new notes-specific query should use a key under ['classroom-items', user.id, ...] so the existing invalidation still covers it."
    },
    {
      "id": "R2-2",
      "severity": "low",
      "path": "src/pages/MyWorkNotesPage.tsx",
      "evidence": "Drafts are keyed by user ID plus note ID, but new notes use the sentinel note id 'new' (MyWorkNotesPage.tsx:39, 66-72). After createPage succeeds, choose(page.id) switches the key, which can leave the 'new' draft behind and resurrect it on the next New note. A recovered draft for an existing note can also predate a newer server edit made on another device, and saving it would silently overwrite that edit.",
      "fix": "Clear the 'new' draft key after a successful create. Store the server updated_at alongside each draft. When the server version is newer, label the draft as conflicting and require an explicit choice before saving. Optionally clear the user's drafts on sign-out for shared devices."
    },
    {
      "id": "R2-3",
      "severity": "low",
      "path": "src/components/classroom/shell/ClassroomLayout.tsx",
      "evidence": "On /classroom/item/:id, sectionFromPath returns 'notes' (:80-85), so at 1280px and wider the legacy side SectionList renders. Its rows navigate to /classroom/item/<id> with no returnTo (:699). A student who opens a second note from that panel loses the archive state, and Back falls back to plain /my-work/notes. That is safe and covered by the plan's fallback, but it doesn't meet 'Back restores search/filter/position' in that path.",
      "fix": "Either carry the current validated returnTo through panel row links on detail routes, or explicitly scope the restore guarantee to entries opened from the archive and test the fallback path."
    }
  ],
  "coverage": [
    "Re-checked the revised plan against round-1 findings F1–F10 and the host dispositions",
    "src/components/classroom/classroom.css:5030-5069 (stage-index hide rule and breakpoints)",
    "src/components/classroom/shell/ClassroomLayout.tsx:60-99, 640-725, 1180-1220 (sectionFromPath, section panel rows, side column render condition)",
    "Round-1 reads still applicable: destinationAccess.ts, StudentDestination.tsx, MyWorkNotesPage.tsx, ClassroomRouteViews.tsx, classroomData.ts, markNoteRead.ts, useClassroomItems.ts, MyWorkPage.tsx, MyWorkGate.tsx, App.tsx routes, QuestionBankContext.tsx, classroom_items RLS migrations",
    "Grep of existing returnTo validators (authRedirect.parseSafeReturnTo, reviewReturnTo, safeRcReturnTo, routeWithReturnTo) for reuse feasibility"
  ],
  "limitations": [
    "No tests, typecheck, build or browser run; live computed styles and signed-in student behaviour not verified",
    "StageIndexList.tsx, myWorkNotes.css, CONTEXT-MAP.md, ADRs and design/methods.md not read",
    "journalService and personal-notes RLS not inspected; the cross-user notebook isolation claim is not independently verified",
    "Deployed Supabase max-rows setting not inspected",
    "Plan SHA256 not independently computed",
    "This was the final permitted review invocation; implementation will need its own fresh code review"
  ]
}
Host dispositions: R2-1 accepted as implementation caution: retain query-key invalidation and stable shared ordering with unique ID and deduplication. R2-2 accepted: clear new-draft sentinel and require explicit conflict choice for newer server versions. R2-3 accepted: propagate validated returnTo across legacy detail-side rows. These are implementation cautions, no alteration of the approved plan. Actual UI and student runtime remain unverified. No application files changed. Plan awaits Joshua design approval before build. No further Claude invocation authorized in this phase.
