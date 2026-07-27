# Wrong answers, rebuilt in the Classroom frame

Build spec. Written by Claude, implemented by Codex, reviewed by Claude.
Supersedes the Classroom redesign spec that previously occupied this file
(frozen at commit `680fcfd4`, shipped in `0c475437`).

## 0. Scope lock

Read this first and treat it as binding.

**Only the Wrong answers surface changes.**

- `src/components/StudentShell.tsx` is **not edited**. Not one line.
- `/flagged`, `/classroom` and every `/classroom/*` route must **behave** exactly as they do now. Flagged shipped in `7e6d5676` and is not up for revision.
- **One deliberate exception, and only one:** the rail is shared, so adding the active state and `›` chevron to the "Wrong answers" nav item makes that item look slightly different on every Classroom route, `/flagged` and `/classroom` included. That is intended and consistent with how Flagged already renders. Nothing else outside the journal may change, visibly or otherwise.
- The journal entries query must be **journal-scoped**. `SectionList` runs its hooks on every section, so an ungated `useJournalEntries` would fire a fetch on `/flagged` and the Classroom sections too. Gate it the same way the section branch is gated.
- `/mainhub`, `/practice`, `/bootcamps`, `/analytics`, `/inbox` and every other StudentShell page must render byte-identically.
- `src/lib/wajService.ts`, `src/lib/wajNotesService.ts` and `getWrongAnswerSmartRows` are **read, not rewritten**. The data layer is correct; do not refactor it.
- **No database migration.** Nothing in this build deletes a journal entry.
- The dead Notion-era code in `journalService.ts` (`journal_pages`, `journal_databases`, `journal_views` and their types/mappers, roughly 78% of the file) is **left alone**. It is unreachable and it is not this release's problem. Do not delete it, do not tidy it.
- Do not add dependencies.
- Do not flip TypeScript strictness settings.

If the spec appears to require breaking any of the above, stop and say so rather than proceeding.

## 1. Why

`/journal` is the last Review surface still mounted inside `StudentShell`. Clicking "Wrong answers" from the Classroom rail tears the whole page down and rebuilds it inside a different shell with a different rail, so the rail visibly changes underneath the student. Flagged already solved this; this is the same problem, one surface later.

Unlike Flagged, this one **cannot be re-parented**. `JournalEntrySurface` is a three-pane `ResizablePanelGroup` whose auto-collapse thresholds are measured against the viewport:

```ts
const AUTO_COLLAPSE_AT = 2140;
const AUTO_EXPAND_AT   = 2280;
```

and whose panel minimums total 75% of the container (rail 12 + centre 45 + review 18). Inside any reading column both side panes collapse permanently and the student is left with the question and two chevrons. Lowering the constants does not fix it, because the min-size floor is also wrong. The resizable machinery is removed, not retuned.

## 2. Target layout

Four fixed columns. No resizable panes, no collapse thresholds, no `ResizablePanelGroup`.

```
┌────────┬──────────┬─────────────────────┬──────────┐
│ CREAM  │ ENTRIES  │  PT80-S2-Q14        │ REVIEW   │
│ RAIL   │          │                     │          │
│        │ PT80 S2  │  Stimulus           │ How did  │
│ Home   │ PT91 S1  │  (full width)       │ you do?  │
│ Notes  │ PT77 S3  │                     │ [W][U][C]│
│ Work   │          │  Stem               │          │
│        │ ⌕ search │                     │ Date     │
│ REVIEW │          │  A ............     │ Summary  │
│ Wrong ‹│          │  B ............     │ Wrong    │
│ Flagged│          │  C ............     │ reasoning│
└────────┴──────────┴─────────────────────┴──────────┘
```

The question is **vertical**: stimulus on top, then the stem, then A–E stacked. This replaces today's `lg:grid-cols-[minmax(0,50fr)_minmax(0,50fr)]` side-by-side split, which is a viewport breakpoint and would not stack in a narrow column anyway.

Responsive. Concrete breakpoints, because the frame's existing one does not fit four columns:

- The frame hides `.classroom-section-list` at `max-width: 1279px` ([classroom.css:1014](src/components/classroom/classroom.css#L1014)). Four columns are already too tight well above that.
- **Below 1400px (journal only):** the entries column folds into the section overlay. This is a journal-scoped override, so it must move the `classroom-section-trigger` and the overlay to the same 1400px threshold **for the journal route only** — the trigger cannot appear at 1400px while the overlay it opens is still gated at 1279px.
- **Below 1100px:** the review panel moves beneath the question, one scroll.
- Every other route keeps 1279px exactly as it is.
- The existing mobile menu behaviour carries over untouched.
- No horizontal page scroll at any width.

## 3. Decisions (locked, do not relitigate)

| Item | Decision |
|---|---|
| Frame | Classroom frame. The rail persists and must never remount. |
| Nav position | Unchanged. Stays under Review in the rail, keeps the URL `/journal`. |
| Deep links | `/journal/:qid`. Selection moves out of memory and into the URL. |
| Actions | **Ask only.** No Practice, no Delete. |
| Correct answer | Stays visible, as today. This is a write-up surface for a question already missed. |
| Annotation | Kept, with the scroll bug fixed. |
| Autosave | 800ms debounce kept. Flushed on navigate instead of cancelled. **Silent** — no save indicator. |
| Suggestion chips | **Dropped.** |
| Onboarding tour | **Dropped**, along with its `waj_review_tour_done_v1` localStorage key. |
| New entry picker | **Dropped.** |
| Review form fields | Unchanged in content. Restyled to Classroom tokens. |

Dropping the picker and the chips leaves `ensureJournalEntry` with only its automatic callers: the drill's wrong-answer path (`logWrongAnswer` → `append_waj_wrong`) and the flag-to-journal bridge in `Drill.tsx`. Both stay. This is intentional: the journal becomes a record of what the student missed rather than something they curate.

## 4. Routing (`src/App.tsx`)

Move `/journal` under the **existing** pathless `<Route element={<ClassroomLayout />}>` that Flagged already uses.

**Do not create a second pathless layout route.** Two sibling routes each holding their own `<ClassroomLayout />` cause React to unmount one and mount the other, which reproduces exactly the rail remount this work removes. This was built, measured (`railSurvived: false`) and rewritten during the Flagged job; it is recorded in `docs/adr/0004-classroom-frame-is-one-pathless-layout-route.md`. Read that ADR before touching routing.

```tsx
<Route element={<ClassroomLayout />}>
  {/* … existing /classroom subtree … */}
  {/* … existing /flagged, /flagged/:qid … */}
  <Route path="/journal" element={
    <ProtectedRoute flag={["has_journal_access", "has_waj_access"]} allowSignedIn>
      <JournalIndexView />
    </ProtectedRoute>
  } />
  <Route path="/journal/:qid" element={
    <ProtectedRoute flag={["has_journal_access", "has_waj_access"]} allowSignedIn>
      <JournalEntryView />
    </ProtectedRoute>
  } />
</Route>
```

- Keep the flag array and `allowSignedIn` byte-identical. Access must not change for anyone.
- Keep the `/waj` → `/journal` redirect.
- Remove the old `/journal` entry from the `StudentShell` block.
- `src/pages/Journal.tsx` (10 lines, delegates to `JournalEntrySurface embedded`) becomes unreferenced. **Leave the file in place** and say so in your summary. Deleting files is the human's call.

## 5. Shell changes (`src/components/classroom/shell/ClassroomLayout.tsx`)

Mirror the `flagged` branch that already exists in this file; do not invent a new pattern.

- `ClassroomSection` gains `"journal"`. Add its title to `SECTION_TITLES` as `"Wrong answers"`.
- `sectionFromPath` returns `"journal"` for `/journal` and `/journal/:qid`.
- `SectionList` grows a `journal` branch listing entries. Reuse `classroom-panel-search` for the label filter and the existing three-state discipline verbatim.
- The "Wrong answers" nav button becomes `navClass(activeSection === "journal")` with a trailing `<em>›</em>`, matching Flagged.
- `activeId` already falls through to `params.qid`. Entries key off **`qid`**, not the row `id`.

### Selection rules

Today selection is a row `id` in local state and an effect auto-selects `rows[0]` when nothing is chosen ([JournalEntrySurface.tsx:93,130,135](src/components/journal/entry/JournalEntrySurface.tsx#L93)). Carrying either behaviour into a URL-addressed view makes deep links unreliable. Specify exactly:

- Selection resolves **only** by `qid` from the URL. No row-`id` lookup anywhere.
- **No auto-select.** `/journal` shows the index view's prompt or empty state; it must never silently redirect to the first entry.
- **Unknown or non-journaled `qid`** renders an explicit "this entry is not in your wrong answers" state with a way back to `/journal`. It must not fall through to the first row, and must not render a blank column. Follow `FlaggedQuestionView`'s missing-row branch, which already does exactly this.
- Distinguish "still loading" from "not found": only a **successfully loaded** entries list with no matching `qid` is a not-found.

### The fourth column

The review panel must be a **sibling of `.classroom-stage`**, not a pane nested inside the reading column. Nesting it inside the reading column recreates the width problem this work exists to remove.

**Do not try to project into it through context.** An earlier draft of this spec proposed a "context slot"; that is wrong and was caught in review. `ClassroomLayoutContext` carries `displayName`, `testDate` and `openSection` *downward* ([ClassroomLayout.tsx:41](src/components/classroom/shell/ClassroomLayout.tsx#L41)); it cannot lift a child's content upward into a sibling. And `<Outlet>` sits inside `.classroom-column` inside `.classroom-stage` ([ClassroomLayout.tsx:575-587](src/components/classroom/shell/ClassroomLayout.tsx#L575)), so nothing a child returns can become `.classroom-stage`'s sibling by normal rendering. A reverse-registration callback would work mechanically but introduces render-ordering bugs for no benefit.

**Do this instead.** Give `ClassroomLayout` one explicit branch: when the route is the journal *detail* view, render `<Outlet context={contextValue} />` **bare, directly under `.classroom-root`**, instead of wrapping it in `.classroom-stage` > `.classroom-column`. `JournalEntryView` then returns two siblings itself:

```tsx
<>
  <main className="classroom-stage">…question…</main>
  <aside className="classroom-aside">…review panel…</aside>
</>
```

Constraints on that branch:

- It applies to `/journal/:qid` **only**. `/journal` (the index) has no aside and uses the normal stage/column path unchanged.
- Every other route keeps today's DOM byte-for-byte. The condition is explicit, not a general mechanism.
- The `classroom-section-trigger` button (the narrow-width control that opens the entries overlay) currently lives inside `.classroom-column`. The journal branch bypasses that wrapper, so the trigger must be rendered inside `JournalEntryView`'s `<main>` with identical markup and behaviour, or it disappears at narrow widths.
- Add a journal-only root modifier class (e.g. `classroom-root-journal`) to carry the grid. `.classroom-root` is a **non-wrapping flex row** ([classroom.css:17](src/components/classroom/classroom.css#L17)), so "review beneath question" at narrow widths cannot happen by wrapping — it needs explicit journal-scoped rules.

## 6. Files

| File | Purpose |
|---|---|
| `src/components/classroom/JournalViews.tsx` | `JournalIndexView` (prompt / empty state) and `JournalEntryView` (question + review panel + Ask). Sits alongside `FlaggedViews.tsx`, which is the reference implementation for all of this. |
| `src/hooks/useJournalEntries.ts` | React-query over `getWrongAnswerSmartRows`. Same shape as `src/hooks/useFlagged.ts`, including the invalidate helper. |
| `src/components/classroom/JournalQuestionView.tsx` | The vertical question. Stimulus, stem, A–E stacked, correct answer marked, non-correct choices clickable to record the chosen wrong answer. |
| `src/components/classroom/JournalReviewPanel.tsx` | The form, ported from `ReviewForm.tsx` minus the tour, restyled to Classroom tokens. |
| `src/components/classroom/classroom.css` | Fourth-column and form rules. |

## 7. Reuse, do not rewrite

- `getWrongAnswerSmartRows` / `WrongAnswerSmartRow` (`src/lib/journalService.ts`) — the two-query fan-out and JS merge on `qid` stays exactly as is.
- `upsertNote` (`src/lib/wajNotesService.ts`) — the write path stays as is. Its RLS is complete (all four verbs, keyed on `user_id`), so no migration is needed.
- `stripDataArtifacts` / `cleanAnswerChoice` from `src/lib/questionText.ts`. Import these. Note the shared module exists but the old local copies in `JournalQuestionPane.tsx:21` were **not** removed when it was created, so three definitions would exist if you write a fourth. Import the shared ones; **do not** clean up the existing duplicates, which is out of scope.
- `seedDraft`'s fallback chain from `JournalEntrySurface.tsx`. Port it **verbatim**, including the legacy bridges:
  ```ts
  wrong_reasoning: n?.wrong_reasoning ?? n?.root_cause ?? '',
  other_notes:     n?.other_notes ?? n?.student_note ?? '',
  self_rating:     n?.self_rating ?? (row.status === 'right' ? 'correct' : 'wrong'),
  date_taken:      isoDate(n?.date_taken) || isoDate(row.first_missed),
  wrong_answer:    n?.wrong_answer ?? row.last_chosen ?? '',
  ```
  Dropping those bridges silently blanks older notes.
- `AnnotationLayer.tsx` and the `AnnotationStroke` shape, with the fix in §8.
- `startJoshuaConversation` (`src/lib/joshuaThread.ts`) and the `AskComposer` pattern in `FlaggedViews.tsx`. Do **not** reuse `src/components/inbox/MessageComposer.tsx` — it drags in an emoji picker, a Drive attachment picker and a slash-command template palette that do not belong in a reading column.
- Existing Classroom CSS primitives: `classroom-button`, `classroom-textarea`, `classroom-panel-search`, `classroom-panel-item`, `classroom-skeleton`, `classroom-list-error`, `classroom-inline-error`.

## 8. Defects to fix as part of this

**1. Autosave flush.** The cleanup effect calls `clearTimeout` ([JournalEntrySurface.tsx:222](src/components/journal/entry/JournalEntrySurface.tsx#L222)), so a pending write is dropped. This is subtler than it looks and a naive fix makes it worse:

- **Flush on `qid` change, not only on unmount.** `/journal/a` → `/journal/b` reuses the same route element, so React does **not** unmount it — only `useParams` changes. An unmount-only flush would miss the most common case. (An earlier draft of this spec claimed URL selection makes unmounts routine. That was wrong.)
- **Flush the captured `qid`, not the current one.** Cleanup runs after the param has already changed, so reading the route during cleanup writes the previous draft into the *next* entry.
- **`saveTimer.current` is never nulled after the timer fires** ([JournalEntrySurface.tsx:192](src/components/journal/entry/JournalEntrySurface.tsx#L192)). A flush guarded on `if (saveTimer.current)` therefore re-fires an already-completed save. Hold one pending payload `{ qid, draft, annotations }`; clear **and null** it before writing; make flush idempotent so a double invocation (StrictMode, or unmount straight after a fire) writes once.

Keep the debounce at 800ms. Keep it silent.

**2. Side effect inside a state updater.** `patch()` calls `scheduleSave` from inside the `setDraft` updater ([JournalEntrySurface.tsx:226](src/components/journal/entry/JournalEntrySurface.tsx#L226)), which double-fires under StrictMode. Move it out — but **do not** compute the next draft as `{...draft, ...patch}` from the closed-over `draft`, which loses writes when two edits batch in one tick. Keep a latest-draft ref, or compute the next draft synchronously once and feed it to both `setDraft` and `scheduleSave`.

**3. Annotation scroll.** Strokes are pinned to the pane, not the content, so once the student scrolls the ink sits over the wrong text. Re-anchoring is more than changing a parent:

- The layer's **positioned ancestor must be the element that wraps the whole question content** and must cover its full scroll height, not the viewport-height pane. Otherwise document scrolling still offsets the ink.
- `pointFromEvent` must measure against **that same element's** bounds, or reads and writes disagree.
- Pointer events must stay `none` when annotation mode is off. A content-sized layer that swallows clicks would block answer-choice selection and touch scrolling — a regression the current pane-sized layer does not have.

Explicitly **not** fixed here: strokes still stretch non-uniformly when the aspect ratio changes (points are normalized per-axis), and `strokeWidth` remains an unscaled pixel value. Leave both.

## 9. Styling

- Every selector prefixed `.classroom-root`. Dark mode keyed off `html.dark .classroom-root`.
- **No `:root`, no `@layer`, no bare element selectors.** This must keep returning nothing:
  ```bash
  grep -nE ':root|@layer' src/components/classroom/classroom.css
  ```
- Reuse existing tokens. No hardcoded hex. The status colours currently hardcoded as Tailwind ramps (rose/amber/emerald 500 for wrong/unsure/correct) become Classroom tokens.
- Orange (`--classroom-link`, `#FF8906`) is a highlight, not a theme.

## 10. Voice

- Second person throughout.
- **The coach is never named in the furniture.** The action is **Ask**, never "Ask Joshua".
- No em-dashes in any student-facing copy.
- The surface is called **Wrong answers**, not "Wrong Answer Journal".

## 11. Verification

Dev server on **8081** (8080 is occupied by something else). Saved student session at `.auth/state.json`; re-mint with `BASE_URL=http://localhost:8081 node .auth/save-session.mjs`. Existing scripts in `.auth/` are the reference for how this is done.

Nothing is "done" on the strength of the diff.

1. `npm run typecheck` clean, and **`npm run build` clean** (`AGENTS.md:67` requires it before wrapping significant work; `vite build` uses esbuild and strips types without checking them). `npx eslint` on changed files introduces no new errors.
2. The `grep` in §9 returns nothing.
3. **Rail identity (mandatory).** Tag `.classroom-sidebar` with an attribute, navigate `/classroom` → Wrong answers → an entry, and assert the tag survives every hop. A screenshot cannot catch this regression.
4. Four columns at 1500px. Question renders stimulus, then stem, then five stacked choices, correct answer marked.
5. `/journal/:qid` loaded directly selects the right entry with the form populated. Then: `/journal` shows the index and does **not** jump to the first entry, and `/journal/PT999-S9-Q99` shows the explicit not-found state rather than the first row or a blank column.
6. **Autosave flush, three separate cases.** Each proven, not reasoned about:
   - type into entry A, click entry B within 800ms, reload A, assert A's text persisted
   - and assert **B was not contaminated** with A's text (the captured-qid bug)
   - type, wait for the save to land, then immediately navigate; assert exactly **one** write (no duplicate from the un-nulled timer ref)
   - type two fields in the same tick and assert both persisted (the batched-edit stale-draft bug)
7. Autosave round trip: edit, wait, reload, assert persistence. Confirm no save indicator appeared.
8. Annotation: draw on a scrolled question, scroll, assert the stroke stays on the same content. Reload, assert it persisted. Then with annotation mode **off**, assert answer choices are still clickable and the column still scrolls — a content-sized layer must not swallow pointer events.
8b. Non-journal DOM is untouched: assert `/classroom` and `/flagged` still render `<main class="classroom-stage"><div class="classroom-column">` with the Outlet inside it, since the journal branch bypasses that wrapper.
9. Ask posts into the admin thread and the row lands in `messages`. A student without `has_chat_access` sees no Ask control.
10. Three states for the entries list: populated, loading skeleton, and a **forced 500** showing error plus retry with the empty state suppressed. Force it with `route.fulfill({status:500})`, **not** `route.abort()` — an abort reads as offline and react-query's default `networkMode: 'online'` pauses the query instead of failing it, leaving a permanent skeleton.
11. The dropped features are gone: no suggestion chips, no New entry picker, no tour, and `waj_review_tour_done_v1` is never written.
12. Widths 1500 / 1400 / 1100 / 700 plus dark mode, with no horizontal page scroll at any width. Include the **sidecar-docked case**, which `AGENTS.md:63` requires on any responsive work and which this is. Check both sides of each journal breakpoint (1401/1399, 1101/1099), and confirm the section trigger and the overlay it opens appear at the *same* threshold.
13. Regression: `/flagged`, `/mainhub`, `/practice`, `/bootcamps` unchanged (`classroomRoot` as before, unchanged `fontFamily`).

## 12. Documentation

Extend `src/components/classroom/CONTEXT.md` with **Journal entry** as a term and the four-column layout under Classroom frame. The flag-versus-wrong-answer distinction is already written there; do not duplicate it.

No new ADR unless something surfaces that is hard to reverse, surprising without context, and the result of a real trade-off. The routing decision is already ADR 0004 and this follows it.
