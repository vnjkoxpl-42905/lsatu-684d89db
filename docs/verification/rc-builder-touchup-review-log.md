# RC builder Claudex review log

2026-10-28. Host/planner/builder Codex; independent plan reviewer and fresh final inspector Claude. CLI defaults requested, observed model pending. Authorization covers local inspection and fixes, no publication. Plan: docs/verification/rc-builder-touchup-plan.md. Maximum plan rounds 5; fix rounds 2; inspection rounds 2. Pre-build base 9b1eec11. Browser transport unavailable during recon; visual acceptance remains a required gate.

## Plan round 1: REVISE

Observed model: claude-sonnet-5-5; Claude CLI 2.1.309 (Claude Code). Result: C:\Users\Joshu\AppData\Local\Temp\claudex-dshavo76\result.json

`json
{
  "verdict": "REVISE",
  "summary": "The plan is mostly sound, because the drawer is a Radix Dialog (Sheet) and Radix Select is a compatible portal child. It has gaps the build should close before proceeding. The main ones: dropping the blank \"Select\" option changes lookup behavior, jsdom needs polyfills the setup file lacks, existing tests query inside the drawer while the new menu portals to body, and legacy CSS and bubbling interactions are not accounted for. No high-severity defect was found.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/features/rc/components/RcHubSurface.tsx:1060-1062",
      "evidence": "Native lookup selects include <option value=\"\">Select</option>. A user can pick the blank PrepTest/Section/Passage entry. updateLookup then clears the downstream fields, and a half-filled lookup can be backed out one level at a time. Radix SelectItem cannot take value=\"\" (it throws). The plan replaces the blank option with a placeholder and says Clear is the only way back, so single-field un-selection is lost. This is a silent behavior change, contradicting 'preserve exact event logic'. Also, if lookupAddress.section or passage holds a value not among the current options (e.g. index reload), Radix shows a blank trigger rather than the placeholder.",
      "fix": "Record this as an intentional deviation, or add a non-empty sentinel item (e.g. '__none') mapped back to '' in onValueChange. Normalize stale values not found in the options to '' for display. Add a test for the stale-value case."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/test/setup.ts",
      "evidence": "Setup only polyfills ResizeObserver. It does not define Element.prototype.hasPointerCapture, setPointerCapture, releasePointerCapture or scrollIntoView. Radix Select calls these on open and on pointer interaction, so jsdom tests throw. The plan only says 'shared test helper' and does not say where polyfills live.",
      "fix": "Have the helper (or a scoped beforeAll) install the pointer-capture and scrollIntoView stubs. Do not edit the global setup unless the change is confirmed safe for the other suites."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/features/rc/components/RcHubSurface.test.tsx:248-300,1091",
      "evidence": "Existing tests do within(drawer).getByRole('combobox', {name:'Practice history'}) and fireEvent.change. After the swap the trigger is still inside the drawer. The option list is portaled to document.body, outside within(drawer). A helper that searches only within the drawer will not find options. Also, the option role and accessible name come from the Radix item text. The disabled strict_no_exposure item will not expose a native 'disabled option' to the old assertions.",
      "fix": "Make the helper open the trigger, then query role=option on screen/document.body. Assert aria-disabled / data-disabled for the disabled history option. Rewrite all ~40 fireEvent.change(combobox) call sites (lines 165, 371, 500, 837-984, 1510-1947, 2052-2059, and others) through it."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "src/features/rc/rc.css:814-822,924,1110,1359,1532,1681-1725,1879-1881; src/features/rc/rcBuilderRefinement.css:3-4,33,82,152,231",
      "evidence": "Many !important rules target the `select` element (font-size, min-height, color-scheme, focus outline, 16px mobile sizing). They stop applying to a Radix <button> trigger. The generic rules keyed to `.rc-final-builder button` / `.rc-create-workspace .rc-page :is(button,...)` (e.g. rc.css:812-813 font-size: 14px, :821 outline) and the `.rc-field-label` / `.rc-lookup-address label` grid rule (css:401-402) will apply to the trigger instead. The drawer's .rc-final-sort sets font-size:0 !important on the label (css:81), which can collapse trigger text. iOS zoom protection (16px) is lost unless re-specified. The plan says only 'scope style to RC classes'.",
      "fix": "Inventory and port or delete every select-targeted rule. Give the trigger class explicit font-size, min-height, border and focus rules with enough specificity or !important to beat the generic button rules. Restructure .rc-lookup-address markup and CSS for the label/trigger split. Reset font-size in .rc-final-sort for the trigger. Include a before/after check at 390px."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "src/features/rc/components/RcHubSurface.tsx:1099-1100",
      "evidence": "The Sort and Practice-history selects live inside the Radix Sheet. Select content portals to body. This works with Radix layering (DismissableLayer handles Escape and outside-pointer). However, Sheet's onCloseAutoFocus and pointer-events handling are custom, and the plan's z-index claim (drawer 90, rc.css:1279 uses !important) must also be reachable via a className on SelectContent. Portal content is outside .rc-final-builder/.rc-final-drawer, so the CSS variables and dark/light tone must be carried by explicit portal classes. Opening a menu in the docked or embedded builder also applies a body scroll-lock with scrollbar-compensation padding, which can shift layout.",
      "fix": "Pass className to SelectContent with z-index above 90 (set via the !important rule). Test Escape inside an open menu in the drawer (the menu closes but the drawer stays open). Verify docked layout does not jump on open."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "src/features/rc/components/RcHubSurface.tsx:913-919",
      "evidence": "When profileTimingPending is true the timing select is replaced by a <p role=status>, but the <label htmlFor='rc-builder-timing'> remains pointing at a nonexistent id (existing). The adapter must keep id on the trigger when it reappears so tests and labels bind. The 'standard' option label is dynamic (profile pace vs 8:45). SelectValue renders the selected item text, so the displayed value is correct only while that item stays mounted in the option list.",
      "fix": "Keep options derived from the same expression as the value. Add a test that the profile-pace label is shown on the closed trigger and updates when profile timing resolves."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "docs/verification/rc-builder-touchup-plan.md (Verification)",
      "evidence": "The plan makes the visual acceptance gate depend on a browser tool that has already failed twice, and the harness check is deferred to 'before relying on it'. scripts/verification/start-rc-builder-preview.mjs:21 does stub useUserSettings. The plan correctly limits claims, but 'approved code' must not close the work.",
      "fix": "State in the final report that visual acceptance is pending if the browser is unavailable. No approval of the visual outcome is possible from code review alone."
    }
  ],
  "coverage": [
    "Read the plan in full.",
    "Read src/components/ui/select.tsx (the shared Radix wrapper).",
    "Read RcHubSurface.tsx select sites (timing, reveal, drawer status, the three lookup selects, and the sort select) and the drawer/Sheet wiring.",
    "Grepped RC CSS (rc.css, rcBuilderRefinement.css) for select and button rules.",
    "Grepped the RcHubSurface tests for fireEvent.change and combobox usage.",
    "Checked the test setup for polyfills.",
    "Checked the preview harness for the useUserSettings stub."
  ],
  "limitations": [
    "Static review only. I ran no tests, builds or browser inspection.",
    "I did not read all 2000+ lines of RcHubSurface.test.tsx or the full CSS cascade. Specificity conflicts are inferred from rule inventories.",
    "I did not verify the Radix version's exact placeholder and empty-value behavior beyond the declared ^2.2.5 range.",
    "I did not inspect the program-produced bank index or the preview harness beyond the settings stub.",
    "I did not review other RC consumers (RcSavedSetsPanel, ProfileTimingPreference) in depth."
  ]
}
`

All findings accepted; see rc-builder-touchup-dispositions.md.

## Plan round 2: APPROVED

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-72eth59x\result.json
Plan SHA256: 138057214d2aca9af960a2209c6a3daac19aea05577e6030f6eca3d8611518ba

`json
{
  "verdict": "APPROVED",
  "summary": "The revised plan resolves all seven round-1 findings (F1\u2013F7). I found no new material defects in it.",
  "findings": [],
  "coverage": [
    "Compared the revised plan against round-1 findings F1\u2013F7 and the host dispositions.",
    "F1: the plan now has a reserved nonempty reset sentinel mapped to the empty string. It also covers per-field clearing and stale-value display without a render-time state mutation.",
    "F2: pointer-capture and scrollIntoView stubs are installed only in the RC-scoped test helper, with no global setup edit.",
    "F3: options are queried globally from document.body, and every select change, value and disabled assertion is migrated.",
    "F4: select-specific CSS is inventoried and ported with explicit specificity. Lookup labels and triggers are split into wrappers, and the font-size:0 sort label is reset.",
    "F5: the portal gets an explicit !important z-index and a self-contained palette. The plan adds nested-Escape and docked scrollbar-compensation checks.",
    "F6: a dynamic profile-pace closed-trigger regression test is planned.",
    "F7: visual acceptance stays pending if the browser is unavailable.",
    "The earlier round-1 source reading (RcHubSurface select sites, Sheet drawer, RC CSS, test setup, preview harness settings stub) was not repeated and is the basis for these conclusions."
  ],
  "limitations": [
    "This is a plan review only. I did not inspect any implementation, and I ran no tests, builds or browser checks.",
    "Approval covers the plan's design, not the visual result. The CSS cascade, menu alignment and docked layout still require real browser inspection.",
    "I did not re-verify Radix version-specific behavior (sentinel and placeholder handling) against installed node_modules.",
    "I did not review the npm ci --legacy-peer-deps dependency workaround beyond its stated disclosure."
  ]
}
`

## Implementation inspection 1, 2026-10-29
Artifact: C:/Users/Joshu/AppData/Local/Temp/claudex-q9fwetz6/result.json
{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the scoped diff, only three low-severity items. The seven native selects are replaced by a thin wrapper over the existing Radix primitives. The original handlers and reset semantics are preserved. Reset sentinel mapping, stale-value placeholders, dynamic profile-pace labels and the sort label change from `<label>` to `<div>` plus `sr-only` label all trace correctly in source. I did not run tests or a browser. The visual acceptance gaps the inspection report already discloses still stand: 320px and 768px screenshots, long-menu scrolling at middle and end, and light-mode docked and Taste inspector passes.",
  "findings": [
    {
      "id": "F1",
      "severity": "low",
      "path": "src/features/rc/rcBuilderRefinement.css",
      "evidence": "`.rc-builder-select-menu` sets `width` and `min-width` to `var(--radix-select-trigger-width)`. The three lookup triggers are about 80–95px wide on phones (3-column grid at ≤700px). The menu then has about 45px of text width after the 32px left and 12px right option padding. Reset rows ('Clear section', 'Clear passage') and `overflow-wrap:anywhere` can wrap into two cramped lines or break mid-word. I traced this from the CSS and did not see it rendered.",
      "fix": "Give lookup menus a floor, e.g. `min-width:min(max(var(--radix-select-trigger-width),160px),calc(100vw - 24px)); width:max-content`. Alternatively drop `overflow-wrap:anywhere` in favour of `break-word`. Check the result at 320 and 390px."
    },
    {
      "id": "F2",
      "severity": "low",
      "path": "src/features/rc/components/rcSelectTestUtils.ts",
      "evidence": "`expectRcValue` maps `standard` to the substring 'pace' and `any` to 'Any'. 'pace' matches both 'Standard pace' and 'Profile pace · …', so tests such as the 52.5/70 profile-pace case cannot tell whether the profile label resolved. 'Any' also matches 'Any difficulty'.",
      "fix": "Use exact or anchored label expectations, or let callers pass the expected text. For the profile-pace tests, assert 'Profile pace · 13:08' or similar explicitly."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "docs/verification/rc-builder-touchup-inspection.md",
      "evidence": "The plan requires before/after screenshots at 1440, 768, 390, 320 and docked width, plus long-menu scroll checks at the beginning, middle and end. The report lists only a 1440 production baseline, a local desktop menu, a phone menu, and a dark docked drawer. Overflow at 320 and 768 is described as measured CSS widths, not screenshots. The report states this itself, but the plan's acceptance bar is not fully met. The report also says a fresh inspection is still required.",
      "fix": "Keep the stated pending visual-acceptance caveat. Capture the missing 320, 768 and light docked screenshots, and a mid-list scroll check, before claiming visual acceptance."
    }
  ],
  "coverage": [
    "Read the plan, the full diff and all added files in the manifest scope: RcBuilderSelect.tsx, RcBuilderSelect.test.tsx, rcSelectTestUtils.ts and the inspection report.",
    "Checked the RcHubSurface.tsx replacements for all seven selects against the original handlers: the lookup dependent resets, the reset sentinel, `indexStatus` and `passages` usage, the timing and profile-pace logic, the status option disabled flag, and the sort control.",
    "Reviewed the new CSS: tone and dark-mode menu variable overrides, specificity against the legacy `select` rules and the `font-size:0` sort rule, z-index above the drawer, and the mobile and reduced-motion rules.",
    "Read the shared `components/ui/select.tsx` to confirm the primitives, the portal and the viewport sizing.",
    "Skimmed the preview harness and script diffs only for plausibility, since they are verification-only."
  ],
  "limitations": [
    "No tests, typecheck, build or browser were run, so every behavioral and visual conclusion rests on source reading.",
    "I did not read the full RcHubSurface.test.tsx beyond the diff, so I did not check the new dependent-reset test fully against runtime Radix behavior in jsdom.",
    "The preview harness's real-bank dynamic import, and whether `rcBank.ts` pulls in other mocked modules, were not verified.",
    "The Radix library source and its click-through, outside-pointer and touch behavior in a Sheet were not inspected.",
    "Files outside the listed scope are unreviewed, including supabase/functions/mcp/index.ts, rc.css beyond grep hits, the review log, the test JSON and the screenshots. This is not whole-repository approval.",
    "Taste inspector, touch-device and screen-reader behavior are unverified."
  ]
}
All three low items accepted. Earlier claudex-umzjvs4j was interrupted, no verdict.


## Final implementation inspection, 2026-10-29
Artifact: C:/Users/Joshu/AppData/Local/Temp/claudex-9j8trpda/result.json
{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the in-scope diff by reading it. The seven native selects are now RcBuilderSelect, and the original handlers are intact. Lookup PT and section changes still clear downstream fields. Single-field reset works through the reserved sentinel. The empty-string state still maps to the placeholder, and a stale value shows the placeholder without calling the parent. Profile-pace label updates are covered by a rerender test. The portal z-index of 110 sits above the drawer's 90, and the nested Escape and focus-return behavior is covered in isolation. Three low-severity gaps remain. I could not run tests, typecheck, build or a browser, so none of the pass claims in the plan or inspection report are verified by me.",
  "findings": [
    {
      "id": "R1",
      "severity": "low",
      "path": "src/features/rc/components/RcBuilderSelect.tsx:38-40",
      "evidence": "Every SelectItem carries a production data-value attribute that exists only so rcSelectTestUtils can find options by value. The adapter's public behavior now depends on a test-only hook.",
      "fix": "Optional. Keep it, but add a one-line comment saying it is a test hook. Or have the helper match options by accessible name or label."
    },
    {
      "id": "R2",
      "severity": "low",
      "path": "src/features/rc/components/rcSelectTestUtils.ts:15-20",
      "evidence": "chooseRcValue opens the menu with a keyDown Enter and selects with a plain click. Radix Item selects on click only when the last pointer type is not mouse, and the item's pointerup path is where mouse selection happens. The suite therefore never exercises the real mouse open/select path (pointerdown on the trigger, pointerup on the item) in jsdom. The browser notes cover it only through manual harness checks.",
      "fix": "Add one RcBuilderSelect test that opens with pointerDown (button 0, pointerType mouse) and selects with pointerUp on the item. Otherwise leave as a documented limitation."
    },
    {
      "id": "R3",
      "severity": "low",
      "path": "src/features/rc/components/RcBuilderSelect.test.tsx:61-77",
      "evidence": "The Escape test (menu closes first, then the drawer) uses a bare Sheet. RcHubSurface's real drawer has its own onCloseAutoFocus handling at line 1105 and a transactional Apply/Cancel draft. No test shows that Escape inside a real Customize drawer menu closes only the menu and keeps the draft. The 'Escape' dismissal case in RcHubSurface.test.tsx fires the key on the drawer after selecting, not while a menu is open.",
      "fix": "Add an RcHubSurface case: open Customize, open the Practice history menu, press Escape on the listbox, assert the dialog remains and the draft value is retained, then press Escape again and assert the dialog closes and focus returns."
    }
  ],
  "coverage": [
    "Read RcBuilderSelect.tsx, rcSelectTestUtils.ts, RcBuilderSelect.test.tsx and the shared ui/select.tsx wrapper in full.",
    "Read the full diffs of RcHubSurface.tsx, RcHubSurface.test.tsx, rcBuilderRefinement.css, the preview harness and start-rc-builder-preview.mjs.",
    "Read the inspection report and the harness preview tsx around the root and render lines.",
    "Cross-checked RcHubSurface lookup state (indexStatus, updateLookup, lookupSnapshot, lookupActive) and grepped selectors that target the old native selects in rc.css and rcBuilderRefinement.css.",
    "Checked CSS specificity for the ≤1000px timing/reveal reorder against the manual-controls :has() rules. The manual rules win, so manual mode is unaffected.",
    "Checked label association: the visible lookup labels use htmlFor/id, and the sort label is sr-only. The old sort label was already hidden by font-size:0, so no visible text is lost."
  ],
  "limitations": [
    "I could not run tests, typecheck, build, eslint or any browser. The claims of 188 passing tests and the screenshot evidence are the author's, and I did not verify them.",
    "No visual inspection: I did not check menu alignment, clipping, scrollbar compensation in docked mode, 320px truncation of 'Section first' and 'Test first' placeholders, or dark/light contrast.",
    "Out of scope and unreviewed: supabase/functions/mcp/index.ts, which was modified separately and excluded by the author. Also unreviewed: the log and dispositions markdown, the screenshots, migrate-rc-select-tests.py, and the rest of rc.css beyond grepped selectors.",
    "I did not trace RcSavedSetsPanel, rcBank, the player or backend paths. The select change does not alter state shapes, but I did not independently confirm every other caller.",
    "I did not verify the real-bank harness path (dynamic import of /src/features/rc/lib/rcBank.ts) by execution.",
    "Screen-reader and touch-device behavior were not assessed."
  ]
}
Disposition: R1 retained as harmless stable value hook. R2 mouse-specific jsdom event path remains a test limitation; host browser pointer selection was exercised. R3 real-drawer nested Escape was exercised in the browser; isolated automated Escape coverage retained. No runtime-code change after final APPROVED. Documentation correction afterward: MCP diff was generated by Vite in this run, diagnostic preserved in Temp, original restored and no backend diff remains. No claim of zero low coverage gaps.

