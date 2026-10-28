# Practice centre Claudex review log

Codex host and prospective builder; Claude plan reviewer and prospective fresh inspector. User authorization: review two directions, no app implementation until selection. Five completed plan rounds maximum; two later fix rounds and two inspection rounds. No requested model/effort overrides; observed identity recorded from runner results. CLI C:/Users/Joshu/.local/bin/claude.exe version 2.1.309 verified. Static studies are not implemented UI or responsive proof.

## Round 1

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-practice-centre-20261027-r1\claudex-t9c4ehvl\result.json
Observed model: ['claude-sonnet-5-5']

```json
{
  "verdict": "REVISE",
  "summary": "The plan is sound and well scoped, and its description of the current centre matches the source. It leaves several implementation-contract gaps that should be fixed before a direction is built. The main ones are the accessible-name change that breaks existing tests, an unspecified filter and grouping model, and an unspecified, leaky tab-state contract for B. My recommendation is A, conditional on those fixes. A keeps the existing local filter, needs no new URL state, and shows every activity at once. B's tab state is the main risk. I did not inspect the concept images (no visual inspection was done). I did not run any tests or a browser.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/ConditionalActivityCentre.test.tsx:24-60",
      "evidence": "Existing tests locate activities by accessible name `Open <title>` (lines 24, 26-27, 30, 42, 50-53, 57-60). That name comes from the arrow link's aria-label on ConditionalActivityCentre.tsx:52. Acceptance item 2 requires one full-row link with title and description, and no arrow-only link. After that change the name becomes the title plus description, or just the title. Every `Open X` query then fails, and the negative assertions (`queryByRole(...)).toBeNull()`) pass for the wrong reason. The plan never says how these assertions are migrated.",
      "fix": "State the intended accessible name of the row link (for example the title as the label, with the description as aria-describedby). Migrate the tests to that name. Keep the negative assertions meaningful by pairing each with a positive assertion for a sibling activity. Add a check that each row has exactly one link and that its href equals the old `href(selected)` value."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/components/ConditionalActivityCentre.tsx:21-25,29,51-52",
      "evidence": "The current model has three sections. Recall and apply holds Sentence flashcards and Guided together, in a full-width third card. The filter is a select keyed by section title (`family`), and it offers only sections that have a permitted activity. The plan's A splits flashcards and guided into separate modules and B makes four tasks. It does not say what the Activity type filter becomes. If the filter keeps three options, a single filter choice would show two modules. If A drops the filter, the 'filters sit with the catalogue heading' requirement is empty. In B, tabs and the filter overlap, which gives two competing selectors for one concept. The `family` state is also not reset when the grant changes, so a stale value can render an empty catalogue with no empty-state message. The empty message on line 54 appears only when no activity is available at all.",
      "fix": "Define the new group model. Give each group a stable id and map the filter options to it. Fall back to 'all' when the chosen group has no permitted activity. Add a filtered zero-results message with a reset control. Under B, remove the select and let the tab be the only scope control."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/routes.tsx:201-222,229-233",
      "evidence": "Direction B asks for deep links via query state, but the plan only says the new state 'must not conflict'. The `contextual` params are the full `location.search`, and `conditionalCentreUrl` strips only a fixed key list (activity query keys, run/view/returnTo and the like). A new `tab` or `task` param on the home route would be copied into every activity href and back link. It would also leak through `conditionalWorkspaceSearch`, which strips a different, shorter list. `view` is already used by the guided library (`params.get('view')==='run'`) and `unit`, `mode` and `level` are activity keys, so those names cannot be reused. Persisted selection across Back would also conflict with the current local-only `family` state.",
      "fix": "If B is chosen, pick a namespaced key such as `centreTask`. Add it to both strip lists in routes.tsx. Add a test that activity hrefs, back links and workspace links do not carry it. Alternatively, keep the selection in router location state or session state, and say which."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "docs/implementation-plans/2026-10-27-practice-centre-design.md (Direction B)",
      "evidence": "B shows only one task's activities at a time. The home page lets an assignment restrict activities (for example Group 3 excludes Missing Links, guided and single-group Sort, and focused assignments show a single entry). A constrained grant can leave a tab with zero or one entries, or leave the default tab empty. The plan requires 'all catalogue entries must remain reachable' but does not say how empty tabs, a hidden tab, or the default selection are chosen. Nothing in the plan says tabs for unavailable tasks are removed rather than disabled. Also, Sentence flashcards (a Translate-type activity in the current model) and Guided become separate tasks, so B reclassifies flashcards from the recall grouping already used.",
      "fix": "Specify that tabs are generated from `defaultFor(id)` availability only. Default to the first tab that has entries. Hide the tablist entirely when only one task has entries. State where flashcards belongs and confirm that Translate/Reason/Flashcards/Guided covers all ten ids exactly once."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/activity-centre.css:24,31,61-63,37-40",
      "evidence": "Selectors `.cc-activity-list`, `.cc-open` and the `h3` rules are shared with the guided library (lines 61-63) and the player styles. The plan notes scoping to `.cc-centre--home`. It does not mention that `.cc-open` is also used by the guided library links, so removing the arrow link from the centre must not change that component. The current `.cc-open>span{display:none}` means the visible 'Open' label is already hidden at all widths, so the redesign cannot rely on any visible 'Open' text.",
      "fix": "Add an explicit acceptance step: guided library `Open set` links (test lines 93 and 98) and player views are unchanged. Introduce new class names for the home rows rather than editing shared selectors."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-practice-centre-design.md (Shared typography)",
      "evidence": "The plan asks for 16px description text. Existing descriptions are .875rem (css lines 26, 34) and the orientation note is .875rem. The two-column layout at 1440px with 16px text and two-line titles could push line length outside the stated 45-70 character target in the narrower column. No measure or width constraint is specified for A's two open lists.",
      "fix": "Add a `max-inline-size` in `ch` for the description text. State the expected column widths at 1440, 768 and 390px. Include a long-title row in the screenshot review set, which the plan already mentions."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-practice-centre-design.md (Requested independent review, Direction A)",
      "evidence": "The plan asks whether A improves hierarchy rather than just stripping cards. The current sections are equal cards, and the third section's header is `min-height:0` while the others are 72px, so heading alignment already works through CSS hacks. The plan does not require the open-list layout to preserve equal row heights between the two columns, which the grid at css line 24 does today. Without that, the two open lists can end up with misaligned rows when item counts differ (Group 3 constrained leaves 3 versus 1). The plan gives no tie-break for emphasis between flashcards and guided other than 'equal'.",
      "fix": "Require top-aligned independent column flow with no stretched empty space. Make the two lower modules visually equal, and keep the DOM order as translation, reasoning, flashcards, guided so that reading order matches the mobile order."
    }
  ],
  "coverage": [
    "Read ConditionalActivityCentre.tsx in full, ConditionalFilters.tsx, the relevant selectors of activity-centre.css (grep, not the full file), and the accessible-name assertions of ConditionalActivityCentre.test.tsx (grep only).",
    "Traced conditionalCentreUrl, conditionalWorkspaceSearch and ActivityCentreRoute in routes.tsx, plus CONDITIONAL_ACTIVITY_QUERY_KEYS and COURSE_LIST_QUERY_KEYS.",
    "Searched the repository for other callers or tests that depend on the `Open <title>` link names; found only ConditionalActivityCentre.test.tsx.",
    "Compared plan claims about the ten entries, filters, duplicate links and home-only local filter state against the source; they are accurate."
  ],
  "limitations": [
    "Did not view the concept PNGs; no visual image inspection was done.",
    "No browser, rendering, contrast or responsiveness check was possible, and nothing was executed or tested.",
    "Did not read activityRegistry.ts, centreAccess.ts or the CONTEXT documents in full, so the claims about which grants exclude which activities come from the plan rather than my own verification.",
    "Read only grep excerpts of activity-centre.css and the test file, not the whole files."
  ]
}
```

## Host dispositions after round 1

All findings accepted with these dispositions, implemented throughout the plan rather than as contradictory addenda:
F1: title-based aria-labelledby/aria-describedby, migrated queries, positive/negative access pairs, one link and exact configured href assertions.
F2: four stable presentation groups and exact ten-ID mapping; permitted-only options; stale selection falls back to all; reset and separate filtered/no-access empty states. B has no duplicate Activity type filter/button.
F3: choose simpler alternative: B uses local React state only, no URL persistence, no new query key, no deep-linked task selection. Removed prior persistent/deep-link requirement. Activity links unchanged; assert no href changes. Remount Home resets first permitted group.
F4: permitted-only task generation, first available fallback, one group hides tablist; exact mapping shared with A.
F5: dedicated Home classes and preservation of shared cc-open/player/guided-library Open set links.
F6: 60ch maximum descriptions, practical column/canvas widths and single-column breakpoint, long-title and zoom checks retained.
F7: independent top-aligned columns; no forced equal rows; equal lower module emphasis; explicit DOM/mobile order.
Please review revised plan for remaining material defects. User design selection is still pending. Your review is source/plan review, not visual or browser validation.

## Round 2

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-practice-centre-20261027-r2\claudex-gjtm7btl\result.json
Plan SHA256: 98913dacd0f7c45a11e9c6e43f6104d8643977b9c54102c1223ba0afccb04c05
Observed model: ['claude-sonnet-5-5']

```json
{
  "verdict": "APPROVED",
  "summary": "The revision resolves F1 to F7 with no material defects left. The ten-ID mapping into four presentation groups matches the registry, which has exactly ten entries. B's local-only state removes the earlier query-key leak risk. The access-driven option generation matches the current `defaultFor` behavior. I still recommend A. B hides eight of the ten entries until the learner switches tabs, and its selection resets on Back, which is worse than A's equivalent reset. This is a source and plan review only. The user's design choice is still pending.",
  "findings": [
    {
      "id": "N1",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-practice-centre-design.md (Direction A filters)",
      "evidence": "Options are generated only from permitted groups, and a stale selection falls back to 'all'. A filter selection therefore never produces zero results on its own, so the 'filtered zero-results message with reset' cannot be reached. Only the existing no-access message can appear. A test written to the plan would have nothing to trigger.",
      "fix": "Reword the requirement as: the filtered empty state is a defensive branch, unit-tested through a grant change while a group is selected. Or drop it and keep only the no-access message."
    },
    {
      "id": "N2",
      "severity": "low",
      "path": "docs/implementation-plans/2026-10-27-practice-centre-design.md (Direction B state)",
      "evidence": "Selection is local state and Home remounts when the learner returns from an activity. A learner who opens Missing Links under Reason and presses Back lands on Translate. The plan accepts this, but it is a real navigation cost of B that the filter in A only partly shares. A's catalogue still shows everything after the reset.",
      "fix": "Record this as an explicit B trade-off in the recommendation, and test that the reset on remount lands on the first permitted group."
    }
  ],
  "coverage": [
    "Checked the revised plan against the earlier findings F1 to F7.",
    "Counted ten ids in activityRegistry.ts, which agrees with the plan's mapping of ten ids exactly once across the four groups.",
    "Re-used my earlier reading of ConditionalActivityCentre.tsx, the routes.tsx URL helpers and the test accessible-name assertions."
  ],
  "limitations": [
    "No visual inspection of the concept images.",
    "Nothing was run, so no test, typecheck, build or browser result is claimed.",
    "I did not re-read centreAccess.ts or the CONTEXT documents, so the constrained-grant claims come from the plan."
  ]
}
```

Host: APPROVED for this plan only, two completed rounds. N1 retained as low-priority advice, no current zero-results test/runtime claim. Resolve by removing redundant state before build and re-review any changed plan. N2 is an accepted explicit trade-off already documented in B; convey in user recommendation. User direction selection remains pending. No app edits, proof execution, code inspection, commit, push or publication performed in this review.

## Authorized implementation A

User selected A and requested implementation plus fresh Claude inspection. Pre-build HEAD dbf78f7e68f995e68cdbe9fa1d83337f9d386ad2. Codex authored three source/test files. Existing untracked plans and evidence preserved. The final implementation contract removes unreachable filtered-empty state per N1 and uses grant-change fallback proof; this plan revision will be included in fresh code inspection. Repeated lower descriptions removed for clearer reading; original activity purpose retained. Build-generated supabase/functions/mcp/index.ts restored to original clean baseline; no backend changes. No commit/push/publish authorized for this iteration.

## Fresh finished-code inspection attempt

FAILED before model work: first-party HTTP429 usage_limit_reached; Claude reports session limit resets01:00 America/Toronto. No successful code review, findings or visual inspection returned. No model/provider fallback attempted. Earlier plan approval does not cover implementation. Result: C:\Users\Joshu\AppData\Local\Temp\claudex-centre-a-inspection-r1\claudex-1u1vef0u\result.json
Scoped snapshot: 86680bf96c60307f6d7fb59e71aa71be5769c086f69e0c08bbe87db1f61cfd3a
Plan hash: b537857d22301b82a699b7f2c157109bfe4573b937b339e619660fe7fa74461e
Code remains local, uncommitted and unpublished. Host tests/build/browser checks documented in docs/design-evidence/practice-centre-a-20261027/README.md. Fresh inspection must be retried after quota returns.

## Editor workspace plan round1
Result: C:\Users\Joshu\AppData\Local\Temp\claudex-centre-editor-plan-20261028\claudex-wy9k8ujd\result.json
Observed model: ['claude-sonnet-5-5']
```json
{
  "verdict": "REVISE",
  "summary": "The plan matches the current registry and access rules well. The five groups cover all ten registry IDs exactly once. Re-normalizing and re-checking drafts against `permits` is sound. The guided and Start behaviour is consistent with `ConditionalGuidedLibrary`. Four defects need plan changes before build: an unstable setup-cache scope key, unguarded storage writes, a silently overridden difficulty control in hard-sentences mode, and no spec for the duplicated phone and desktop controls. None of this was run or tested; it is a source-level review.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/bootcamps/conditionals/routes.tsx:201-208, 229-233",
      "evidence": "The plan keys setup persistence on userId plus href(), described as 'assignment+edition'. In `ActivityCentreRoute`, href() is `conditionalCentreUrl(contextual)`, built from the full `location.search`. That function only strips a fixed list of keys, so any other query param (e.g. `path`, `pathLevel`, `start`, `area`, `edition`, `grant`, or a future param) stays in the string. A user who reaches Home through two different course links, such as one with `?assignment=A&path=\u2026` and one with only `?assignment=A`, gets different scope keys. Their saved setup then silently disappears, which breaks the Back/return restore requirement. In the other direction, two different contexts could share a key if the extra params happen to be identical.",
      "fix": "Derive the scope key explicitly from userId, the active assignment id (or 'admin') and the edition. Use the same inputs the route already uses for `contextual.set('assignment', \u2026)` and `edition`. Pass it as a dedicated prop, not as a parse of href(). Add a test that unrelated query params do not change the scope and that a different assignment or edition does."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "plan: Setup persistence",
      "evidence": "The plan says 'read with try/catch' but does not say writes are guarded. `sessionStorage.setItem` throws in Safari private mode and on quota or security errors. If the write runs in a change handler or effect without a guard, a settings change or activity switch can throw and break the Home render. Corrupt JSON is covered, but `Object.prototype` keys such as `__proto__` in a parsed draft map are not.",
      "fix": "Wrap both read and write in try/catch, with in-memory state as the source of truth. Whitelist cached keys against CONDITIONAL_ACTIVITIES ids using Object.hasOwn and cap entries at ten. Persist from event handlers, or from an effect that runs only after validation. Add tests for a throwing setItem and for a `__proto__` payload."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/bootcamps/conditionals/activityRegistry.ts:70",
      "evidence": "Normalization forces `difficulty = 'advanced'` whenever `mode === 'hard-sentences'`. The plan only says 'no contrary difficulty label'. If the Level control stays interactive in hard-sentences mode, picking Beginner or Medium normalizes back to advanced. The control then looks dead, or the candidate is dropped by `permits`. Switching mode back to practice keeps advanced, which a beginner-difficulty unit grant rejects.",
      "fix": "In hard-sentences mode, render Level as a static 'Advanced' summary, or disable it. Define explicitly what difficulty is restored when the user leaves hard-sentences. Test both transitions under a beginner unit grant."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "plan: Interaction and rendering",
      "evidence": "The plan has a phone native selector and a desktop button navigator sharing state, and requires every activity selector to be a named button that announces its selected state. It does not say how the hidden variant is removed. If it is hidden visually but still in the DOM or tab order, screen readers see duplicate controls. The 'each activity once' test would also count duplicates, and focus order would be wrong.",
      "fix": "Specify that the inactive variant is removed from the accessibility tree and tab order (display:none through a media query or a container query, not clip or opacity). Make the tests query by role with a stated expected count. Check that the select keeps focus when it changes the selection."
    }
  ],
  "coverage": [
    "Plan read in full.",
    "Read ConditionalActivityCentre.tsx, activityRegistry.ts, centreAccess.ts and ConditionalGuidedLibrary.tsx.",
    "Read the routes.tsx href, contextual-search and `ActivityCentreRoute` sections.",
    "Read the dev preview harness (`ConditionalOpeningPreview.tsx`) as a caller of the centre.",
    "Checked that FlashcardTools.tsx shares the cc-settings class, which supports keeping shared selectors unchanged.",
    "Traced defaultFor and permits against `conditionalActivityAllowed` for course, activity, unit and skill/general grants and for admin.",
    "Checked normalization rules for rephrase timing, sort group count, guided sets and the hard-sentences difficulty rule."
  ],
  "limitations": [
    "Source-only review. No tests, build, typecheck or visual checks were run, and none is claimed to pass.",
    "ConditionalPracticeWorkbench.tsx and its CSS do not exist yet, so only the plan's design could be assessed.",
    "Did not review activity-centre.css, the existing test file contents, the research or interview docs, or the multi-assignment resolution logic beyond the route code shown.",
    "The earlier rounds' reviews and the working-tree diffs were not inspected."
  ]
}
```
Host accepted F1-F4: dedicated stable scope helper+route prop, guarded whitelist-only storage, explicit hard-mode static level/default restoration, and display:none duplicate-control exclusion.

## Editor workspace plan round2
Result: C:\Users\Joshu\AppData\Local\Temp\claudex-centre-editor-plan-r2-20261028\claudex-b0wm2raw\result.json
Plan hash: fd9a6120c832b628c5789cf15ef3d0187a01aabaf70a6c6fcdcace52919b68a2
Approval check matched before implementation.
```json
{
  "verdict": "APPROVED",
  "summary": "F1\u2013F4 are resolved in this revision, and I found no new material defects in the plan. F1: the setup scope is now an explicit pure helper over userId, active assignment ID (or admin) and edition, passed as a `setupScope` prop, with tests that unrelated query fields don't change it. F2: reads and writes are both guarded, in-memory state is authoritative, and cached keys are whitelisted to the ten registry IDs with no untrusted spread. F3: hard-sentences shows a static Advanced level and restores the assigned or beginner difficulty on exit, with transition tests planned. F4: inactive variants use display:none through a container query, with role-count and select-focus tests. One build-time note: `ActivityCentreRoute` doesn't currently compute an edition, so the implementer must take it from `active.target.courseEdition` for assignments. For admins, `OpeningCourseRoute` already derives it from `params.get('edition')`. This is a plan review only; it is not approval of finished code.",
  "findings": [],
  "coverage": [
    "Re-read the revised plan against F1\u2013F4.",
    "Re-checked normalization (hard-sentences forces advanced difficulty) and `conditionalActivityAllowed` rules against the new transition design.",
    "Checked `ActivityCentreRoute` and `OpeningCourseRoute` in routes.tsx for where the new setupScope inputs (userId, active assignment ID, edition) come from.",
    "Checked the dev preview harness for the whitelisted-parameter fallback."
  ],
  "limitations": [
    "Source and plan review only. No tests, build or visual checks were run, and none is claimed to pass.",
    "The Workbench and its CSS do not exist yet, so this is not a review of finished code.",
    "I did not re-read activity-centre.css or the existing test file."
  ]
}
```
