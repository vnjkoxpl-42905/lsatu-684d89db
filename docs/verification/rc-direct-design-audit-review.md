# Direct lookup design review log
2026-10-21. Host/planner/builder Codex. User requests refinement then Claude review; final inspector Claude, requested opus. No separate plan-review requested or claimed. Maximum2 inspections. Local prototype only; preexisting production changes preserved. Source frozen for inspection1.

Host source audit accepted and fixed: stale direct draft could override explicitly reapplied identical manual IDs; empty manual selection lacked guidance; manual selector needed an Edit navigation row; weak field borders increased to #747773; false applied-filter wording replaced with explicit demo limitation.

Verification: node syntax check both JS modules; browser responsive matrix1440/980/768/390/320 with no overflow and no question selector. Automatic/manual/direct Review, Cancel retains direct draft, Apply overrides draft, empty state, custom timing invalid/valid checked. Screenshot scaling corrected before review (DPR1.25 matches Windows125%, CSS zoom1). Real persistence/filter/exposure/session behavior not claimed.
{
  "verdict": "REVISE",
  "summary": "The Direct lookup study looks right on screen. The question selector is gone and whole passages are still the unit. There is one cream \"Review passages\" button, with Start on a separate review stage. The text says lookup is optional and that Tutor's choice is used when it is blank. The palette is charcoal and cream, and the layout holds at 1440, 768 and 320 in the screenshots. One important requirement still fails in the code. A lookup becomes permanent once you review it. Pressing Review overwrites the earlier Tutor's choice count or manual selection, so clearing the lookup afterwards never brings that state back. The other problems are smaller. A blank custom time is accepted, and focus is lost when the stage changes or the drawer switches method. Escape anywhere moves focus. Review does not show the passage number, and the save link is a small target.",
  "findings": [
    {
      "id": "DL-1",
      "severity": "medium",
      "path": "docs/verification/rc-layout-3-polish.js",
      "evidence": "Lines 40-44: a capture-phase click on Review runs addStudyPassage(index,{replace:true}). In rc-layout-studies.js lines 13-21 this sets the shared state to mode='manual' and applied=[index], swaps #countField for an \"N selected · Edit\" button, and line 43 resets selectionKey so the MutationObserver reset never runs. Two scenarios fail. (a) Tutor's choice with Passages=2: choose PT141/S3/P2, click Review passages (1 passage), click Edit setup, then set PrepTest back to Select. updateLookup finds no '#countField .step', so countBeforeLookup is never restored. The setup still shows \"Your selection: 1 selected · Edit\" with Review enabled, and Review shows only 'The history of public libraries'. The two-passage Tutor's choice is gone, and the only way back is the Customize drawer's method select. (b) A manual selection of 3 passages plus a lookup is silently replaced by the single lookup passage at Review, and clearing the lookup cannot restore the 3. This breaks the requirement 'clearing lookup restores appropriate saved selection/default'. The host proof only covered clearing before Review, the Apply-same-ID case and Cancel.",
      "fix": "Keep a lookup selection separate from the saved selection until Start, or save {mode, applied, count} before applying the lookup at Review. When the lookup is cleared, restore that snapshot (stepper and count for Tutor's choice, or the previous manual IDs). If a lookup would replace an existing manual selection, say so in the lookup status."
    },
    {
      "id": "DL-2",
      "severity": "medium",
      "path": "docs/verification/rc-layout-3-polish.js",
      "evidence": "Line 16 builds <input type=number min=1 max=60 step=0.5> without 'required'. An empty number input passes checkValidity(), so lines 26-27 keep Review enabled and hide the error. Choose Custom time and delete the 9: Review stays enabled, and line 45 writes reviewMeta as '1 passage ·  min per passage · Answers …' with no number. The plan claims invalid custom time blocks Review, but only 0 and out-of-range values were checked.",
      "fix": "Add 'required' to #minutesPerPassage, or treat minutes.value==='' as invalid in updateLookup. Show the existing guidance for a blank field too."
    },
    {
      "id": "DL-3",
      "severity": "low",
      "path": "docs/verification/rc-layout-3-polish.js",
      "evidence": "Line 52: changing the Customize drawer's Passage selection to 'Pick specific passages' fires a change on #method, which calls showDrawer('pick') (studies.js line 7). That sets opener=document.activeElement, which is the #drawerMethod select. The drawer body is then replaced, so that select is detached. Cancelling or applying the Pick drawer calls opener?.focus() on a detached node, and keyboard focus falls to <body> instead of returning to 'Customize drill'.",
      "fix": "Before switching the drawer to pick mode, keep the original opener (the Customize drill button), or pass it explicitly. Make sure closeDrawer focuses a connected element."
    },
    {
      "id": "DL-4",
      "severity": "low",
      "path": "docs/verification/rc-layout-studies.js",
      "evidence": "Line 10: Review hides #setup while the focused Review button is inside it, and Edit setup hides #reviewPanel while it holds focus. Focus is never moved to the new stage, so keyboard and screen-reader users land on <body> each time the stage changes. The plan claims 'clear focus' was verified, but that only covers focus rings.",
      "fix": "Make the review heading and the setup h1 focusable (tabindex=-1) and focus them after each stage change."
    },
    {
      "id": "DL-5",
      "severity": "low",
      "path": "docs/verification/rc-layout-studies.js",
      "evidence": "Line 9: the document-level keydown handler calls closeDrawer() on every Escape, even when the drawer is already hidden. closeDrawer ends with opener?.focus(), so pressing Escape anywhere on setup or review (for example after using a lookup select) jumps focus to whichever button last opened the drawer. Because it also sets drawer.hidden, it re-runs the polish MutationObserver.",
      "fix": "Only handle Escape when the drawer is open: if(e.key==='Escape'&&!$('#drawer').hidden)closeDrawer()."
    },
    {
      "id": "DL-6",
      "severity": "low",
      "path": "docs/verification/rc-layout-studies.js",
      "evidence": "The Review rows (line 10, shown in review-1440.jpg and review-320.jpg) display 'PT 141 · Section 3 · 4 questions' with no passage number. After a direct PT141/S3/P2 lookup, the student cannot confirm on Review that the exact passage they asked for was chosen, which is what the acceptance requires.",
      "fix": "Include the passage number in the review metadata (for example 'PT 141 · Section 3 · Passage 2 · 4 questions')."
    },
    {
      "id": "DL-7",
      "severity": "low",
      "path": "docs/verification/rc-layout-studies.css",
      "evidence": "The '.foot button{border:0;padding:0;font-size:12px}' rule makes 'Save this drill or its settings', now moved into the review panel by polish.js line 7, a target about 18px tall. That is below the 24px minimum and visibly the weakest control in review-1440.jpg and review-320.jpg. The plan claims 'readable targets'.",
      "fix": "In .refined #reviewPanel .foot button, give it min-height:44px (or at least 24px) with some inline padding, and keep the quiet text style."
    },
    {
      "id": "DL-8",
      "severity": "low",
      "path": "docs/verification/rc-layout-3-polish.css",
      "evidence": "Lines 48-53 make the drawer a cream panel (#f7f5ef) with cream-filled fields and chips (#fffdf8), as drawer-1440.jpg and drawer-320.jpg show. The acceptance says 'no orange or cream-filled form'. Line 72 also uses a peach error color (#e6c6b3). This may be intended, but it conflicts with the plan as written.",
      "fix": "Either confirm the light drawer is an accepted exception and note it in the plan, or switch the drawer to the charcoal surface with neutral field fills. Use a neutral or light error color instead of peach."
    }
  ],
  "coverage": [
    "Read the current docs/verification/rc-layout-3.html (all), rc-layout-3-polish.js (all 63 lines), rc-layout-3-polish.css (all), rc-layout-studies.js (all) and rc-layout-studies.css (all)",
    "Traced shared state between the files: mode, applied, count and selectionKey; addStudyPassage and studySelectionState; the capture-phase Review and Apply listeners against the onclick properties; the MutationObserver on drawer[hidden]; and the drawerMethod staging against originalApply",
    "Read the screenshots setup-1440.jpg, setup-768.jpg, setup-320.jpg, drawer-1440.jpg, drawer-320.jpg, review-1440.jpg and review-320.jpg in C:/Users/Joshu/Downloads/RC-Direct-Design-Audit-2026-10-21",
    "Checked acceptance items: question selector removed, one cream CTA, optional-lookup copy, no visible method toggle, drawer Apply/Cancel, empty-manual guidance, custom-timing validation, lookup-to-Review exactness, clearing the lookup, focus, and target sizes"
  ],
  "limitations": [
    "Read-only review: I could not run the prototype, use a browser, check overflow, or run node --check, and I claim none of those results. All behavior findings come from reading the source.",
    "I did not read setup-980.jpg, setup-390.jpg, review-native.png, review-after-cancel.jpg or widths.json; the host's no-overflow claims at 980 and 390 are unverified by me.",
    "Native select and dropdown rendering depends on the platform, and the screenshots show only closed selects.",
    "Out of scope by instruction: production RC/LR source, the tracked diff, and older comparison prototypes (rc-layout-1/2 etc.). I only reviewed shared rc-layout-studies.js/css where Direct lookup depends on them, and did not check whether studies 01 and 02 still render correctly.",
    "The filter controls in the prototype are visual only and were judged as a design mock-up, not as working filters."
  ]
}

Inspection1 REVISE, observed claude-opus-5-5. All DL1-DL7 accepted: lookup snapshots restore auto count/manual IDs on clear after Review, blank custom minutes required, connected drawer opener fallback, stage heading focus, Escape only closes open drawer, passage numbers on Review,44px save target. Host also made lookup-help copy reflect retained manual choices. DL8: clarified original main-dark-form requirement to preserve intentional cream drawer; error color made neutral. No product scope expansion, local prototype only. Source repairs pending final browser regression and fresh inspection2.

Post-fix host browser proof: auto count2 -> directP2 Review -> Edit -> clear lookup restores count2 and two original passages; manualP1/P2/P3 -> directP4 Review -> Edit -> clear restores original3 IDs. Replacement warning explicitly names retained3 selection. Nested drawer Cancel returns focus to Customize; Escape outside leaves Timing focused; Review focusesH2, Edit focusesH1. Blank custom time now disables Review and shows guidance. Review includes passage numbers. Mobile save target measured44px; Review document width320. Full source freeze for fresh inspection2.
{
  "verdict": "APPROVED",
  "summary": "I read the current Direct lookup source and all seven screenshots. The DL1–DL8 findings from the first inspection are all fixed. DL1: Review now stores a {mode, passageIds, count} snapshot once (polish.js:46). Clearing PrepTest restores it through restoreStudySelection (polish.js:36, studies.js:26-37), and countBeforeLookup puts the stepper value back. Replacing a manual selection now shows a warning (polish.js:32-33). DL2: the minutes input is `required`, so a blank value fails checkValidity and disables Review. DL3: the opener is only recorded while the drawer is hidden (studies.js:7), and closeDrawer falls back to #custom unless the opener is connected, focusable and visible (studies.js:8). DL4: the stage headings have tabindex=-1 and receive focus. DL5: Escape only acts when the drawer is open. DL6: Review rows show the passage number, and it matches the lookup's mapping (option value = PT−139, index = PT−140). DL7: the save button is 44px tall. DL8: the plan now allows the light cream drawer explicitly, and the timing error uses a neutral colour. The screenshots match the plan: one cream \"Review passages\" button, Start on a separate stage, no question selector, no visible method toggle, no saving controls on setup, a charcoal main surface with neutral fields, and only truthful demo notices. One low-severity consistency issue remains; it does not block approval.",
  "findings": [
    {
      "id": "DL-R2-1",
      "severity": "low",
      "path": "docs/verification/rc-layout-3-polish.js",
      "evidence": "A reviewed direct lookup shows up as a manual pick when the student goes back to setup. Steps: start with Tutor's choice and 2 passages, look up PT141/S3/P2, click Review passages, then click Edit setup. addStudyPassage (studies.js:13-21) has set mode='manual', so the count field now reads 'Your selection · 1 selected · Edit'. The lookup help still says 'Optional. Leave blank for Tutor's choice.' because it reads lookupBaseline (polish.js:30-31). Opening Customize drill then shows 'Passage selection: Pick specific passages' with an 'Edit selected passages' button, because the drawer reads the current mode (polish.js:56-57). The setup surface and the drawer therefore describe the same state two different ways. Nothing is lost: clearing PrepTest restores the snapshot, and choosing Tutor's choice then Apply goes back to auto and resets the lookup. The cost is clarity.",
      "fix": "While lookupBaseline is set, base the setup count field and the drawer's method default on the baseline, not the transient manual state. Alternatively, label the reviewed lookup in the count field as 'Direct lookup · PT 141 S3 P2' and leave out the 'Edit selected passages' shortcut until the student applies a manual pick."
    }
  ],
  "coverage": [
    "Read all of the current docs/verification/rc-layout-3.html, rc-layout-3-polish.js (69 lines), rc-layout-3-polish.css (74 lines), rc-layout-studies.js (37 lines) and rc-layout-studies.css",
    "Traced shared state across the polish and studies modules: mode, applied, count, selectionKey, lookupBaseline and countBeforeLookup, plus listener order (capture vs onclick vs bubbling on #review and #apply) and the MutationObserver on drawer[hidden]",
    "Traced these scenarios in source: auto 2 → direct Review → Edit → clear; manual 3 → direct P4 → Review → clear; empty manual baseline; pick-drawer Apply/Cancel after a direct Review; switching drawer method auto ↔ manual and back to focus; blank, 0 and off-step custom minutes; Escape with the drawer closed",
    "Checked the mapping between the lookup passage number and the Review row's passage number",
    "Confirmed the first-inspection findings DL1–DL8 against the current source, using the first result.json for reference",
    "Read the screenshots setup-1440.jpg, setup-768.jpg, setup-320.jpg, drawer-1440.jpg, drawer-320.jpg, review-1440.jpg and review-320.jpg"
  ],
  "limitations": [
    "Read-only: I did not run the prototype, use a browser, run node --check, or measure overflow or target sizes. Behaviour conclusions come from reading the source.",
    "Did not read setup-980.jpg or setup-390.jpg, so the no-overflow claims at 980 and 390 are unverified by me.",
    "Native select popups and focus rings are platform-dependent and do not appear in the screenshots.",
    "Out of scope by instruction: the tracked production RC/LR diff and older comparison artifacts. I checked shared studies.js/css only where Direct lookup depends on them and did not visually verify studies 01 and 02.",
    "The filter chips and range control are visual only. I judged them as a design mock-up, relying on the Apply notice that discloses the limitation."
  ]
}

Inspection2 APPROVED, requested opus, observed claude-opus-5-5. Result C:/Users/Joshu/AppData/Local/Temp/rc-direct-design-inspection-20261021/claudex-ni2k2sw9/result.json. Both inspections used. Source unchanged after approval. Remaining low DL-R2-1 is documented, not silently fixed after inspection: a reviewed direct lookup appears as a manual pick in the Customize method field on Edit, while clearing the lookup restores its earlier baseline. Selection preserved; minor terminology consistency remains. No deployment or commit.

Later user-directed visual iteration: removed enclosing dark card via rc-layout-3-composition.css plus scoped sculpted body class in rc-layout-3.html. Open cream intro/lookup and asymmetric dark settings surface, paper-style Review. No JavaScript edits. Browser setup1440/980/768/390/320 no overflow, Review target51px; exact lookup and mobile Review checked. Evidence C:/Users/Joshu/Downloads/RC-Open-Composition-2026-10-21. Earlier Claude approval covers the earlier snapshot, not this subsequent CSS composition. No new independent review requested or claimed for this styling pass. Not deployed.
