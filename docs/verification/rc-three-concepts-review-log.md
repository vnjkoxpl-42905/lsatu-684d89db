# RC concepts review log

## Current outcome
Two completed rounds only: Sonnet round 1, then fresh Opus round 2 at Joshua's request. Both returned REVISE. Opus preferred concept 3 after inspecting actual screenshots. Findings are accepted for local prototype correction; final host fixes will be verified without a third independent review. No production replacement or publication is authorized by this comparison.

Final dispositions: accepted R2-1 through R2-8. HTML changes and final mobile/preview captures are recorded in rc-three-concepts-verification.md. Host verified scrollable six-passage preview actions at320x568 and390x667, and PT101 search. Later fixes are host-verified, not independently approved. Review stopped at exactly two completed rounds. No production source change or publication from this design comparison.

2026-10-20. Host/designer: Codex. Independent reviewer: Claude through installed claudex-loop runner, review --host codex. Requested model/effort: CLI defaults, no override. Maximum and requested rounds: two total. Scope: three local interactive design concepts, no production changes, push or publication. Review covers finished design artifacts against rc-three-concepts-review.md. Browser verification belongs to host; reviewer read-only tools cannot execute it. Diagnostics remain outside checkout.

Claude launch attempt failed before inference: CLI 2.1.296; OAuth session expired and could not be refreshed. Result: C:/Users/Joshu/AppData/Local/Temp/rc-three-review-20261020-r1/claudex-o3uuh7nm/result.json. Zero completed rounds, no approval, no model observed. No blind retry or provider substitution. User notified and asked to sign in; two-round budget remains pending.

User requested recheck. Retry failed with same OAuth expired/could-not-refresh error before inference. CLI2.1.296 result: C:/Users/Joshu/AppData/Local/Temp/rc-three-review-20261020-retry/claudex-2eudtdst/result.json. Zero completed rounds; no review approval.

## Completed round 1
Result path: C:/Users/Joshu/AppData/Local/Temp/rc-three-review-20261020-retry2/claudex-7xnolwjg/result.json
CLI default observed model: claude-sonnet-5-5. Verdict REVISE. Full response follows.
`json
{
  "verdict": "REVISE",
  "summary": "I read the plan and the full HTML/CSS/JS artifact (one file). The three concepts differ in hierarchy, and the drawer and preview mechanics are mostly sound. The drawer draft/apply/cancel logic is correct, and the page is made inert by placing the overlays outside #page. There are several concrete keyboard-focus and fixture-boundary defects. I did not run a browser or any tests, and I did not view the screenshots.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "docs/verification/rc-builder-three-designs.html (render(), stepper and timing handlers, line ~20)",
      "evidence": "The stepper buttons and the #timing select call render(), which replaces #concept.innerHTML. The focused element is destroyed and focus drops to body. A keyboard user pressing '+' once cannot press it again without tabbing from the page start. A select change loses focus the same way. This breaks the plan's keyboard-accessibility requirement and the focus-indicator requirement.",
      "fix": "After render(), restore focus to the equivalent control. For example, record the activeElement's data-step or id before re-rendering and refocus it. Alternatively, update the output and the disabled states in place without rebuilding."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "docs/verification/rc-builder-three-designs.html (#demo-start handler and the Tab trap, lines ~27)",
      "evidence": "Clicking 'Start drill · demo' sets disabled=true on the focused button. Focus is lost to body. The Tab trap only wraps when activeElement equals first or last, so the next Tab can leave the modal into browser chrome. The disabled button is also not announced, and the status text is the only cue.",
      "fix": "Move focus to the #demo-status paragraph (tabindex=-1) or to the Back button when Start is disabled. In the Tab handler, if the active element is not inside the overlay, force focus to the first node."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "docs/verification/rc-builder-three-designs.html (drawer selects, defaults(), openPreview())",
      "evidence": "The plan forbids invented adaptive analytics and unsupported features. The drawer offers 'Adaptive' difficulty, 'Practice history' (Not attempted/Previously practiced), Level 1–5 and PrepTest ranges. The concept summary reads 'Adaptive difficulty', and the preview says 'Automatic selection will use your applied filters'. None of these filters affect the fixture. In openPreview(), the automatic preview applies only the topic filter. The preview never uses difficulty, status, format or tests. A tester can change these and see no effect, yet the preview implies they apply. Only the one line in the drawer notes that it is sample data.",
      "fix": "Mark non-functional filters as 'sample' or disable them. Alternatively, apply them to the fixture so the preview reflects them. Align the labels with the repo's real wording ('Adaptive: fresh passages near your level', per src/features/rc/CONTEXT.md). Put the fixture label next to the preview content as well."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (passage count and fixture size)",
      "evidence": "The stepper allows up to 8 passages in automatic mode, but only 6 fixture passages exist. The preview says '8 passages requested' with no fixture list. The topic filter 'Law' leaves 1 passage, but the preview still reports N requested. Nothing shows that the request cannot be satisfied.",
      "fix": "Cap the stepper at the fixture size, or show a truthful 'only N sample passages match' line in the preview."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (openPreview, mode switching)",
      "evidence": "The plan lists 'preview reset on changed selection'. The preview is recreated on every open, so it resets, but nothing else invalidates it. This is acceptable for modal previews. However, the demo-start 'Demo complete' state is not tied to the selection, and a reopened preview behaves as a fresh one. Switching to automatic in the drawer silently keeps the draft.selected passages. Apply then discards the manual picks from view while the state still holds them, and switching back later resurrects them.",
      "fix": "Clear or explicitly label the retained selection, or document that it is preserved. Make the verification checklist state which behaviour is intended."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (drawer markup, .mode-tabs and the Cancel/Close handlers)",
      "evidence": "The mode toggle is a div with an aria-label but no role=group, so the label is not exposed. The '×' close and the Cancel button both use [data-close], which discards the draft correctly. A backdrop click also discards, which is fine. The dialog also lacks an accessible description, and the 'Additional settings' <details> sits inside a trap that depends on getClientRects (works). On mobile, .drawer-footer wraps and an inline margin-right:15px is overridden with !important, which is brittle.",
      "fix": "Add role=group to .mode-tabs. Move the Cancel inline style into CSS."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (head link, fonts.googleapis.com)",
      "evidence": "The standalone file loads Google Fonts over the network. Offline or sandboxed browser checks fall back to Arial, so screenshots and the overflow checks may not match the intended typography. It also sends a request to a third party from a design-only local artifact.",
      "fix": "Remove the external font link and use a local stack, or accept and note the fallback in the verification notes."
    }
  ],
  "coverage": [
    "Plan read in full.",
    "The full artifact was read, including the CSS, the render logic for the three concepts, the drawer/preview JS, the focus trap and the inert handling.",
    "Compared against src/features/rc/CONTEXT.md and lib terms for Adaptive and the 525s timing, using a grep of src/features/rc.",
    "I did not compare visual hierarchy against screenshots."
  ],
  "limitations": [
    "No browser rendering, so responsive overflow, focus-ring visibility and screenshot-based hierarchy are unverified.",
    "No tests run.",
    "Screenshots were not viewed.",
    "I did not inspect the uncommitted production RC component changes beyond a grep.",
    "I did not give a preferred concept: the source does not support ranking the three on hierarchy without rendering them."
  ]
}
`


## Completed round 2, final
User requested Opus. Fresh session, requested opus; observed claude-opus-5-5. Verdict REVISE. Result path C:/Users/Joshu/AppData/Local/Temp/rc-three-review-20261020-r2-opus/claudex-6zlmdi9t/result.json. Full response follows.
{
  "verdict": "REVISE",
  "summary": "This is round 2 of 2, reviewed in a fresh Opus session. I re-read the revised standalone HTML/CSS/JS, the plan, the round-1 result, and the verification note. I also viewed all seven named host screenshots plus the three revised desktop screenshots. The round-1 dispositions hold up in source:\n- F1: the stepper and timing select get focus back after re-render.\n- F2: demo Start moves focus to Back, and the Tab trap pulls stray focus back into the dialog.\n- F3: the drawer description says \"Illustrative options only\", automatic mode shows \"Sample configuration\", the summary adds \"(sample)\", and the preview names each filter that isn't applied.\n- F4: the preview reports how many fixture passages match the topic and any shortfall.\n- F5: the drawer shows retained manual picks, and the preview and demo state are rebuilt on every open.\n- F6: the mode buttons have role=group, the dialog has aria-describedby, and the inline Cancel margin is now a CSS class.\n- F7: the external font dependency is documented.\n\nDraft, Apply and Cancel handling, the inert background, Escape, and focus return all look correct. One material defect remains: the preview dialog has no height limit or scrolling, so on short or narrow mobile screens its Start and Back buttons can be cut off and unreachable. The other issues are minor. Preferred concept: 3 (Structured), based on the screenshots and source. It gives setup, selection and action their own rows, shows More options as a visible secondary button instead of a quiet link, and labels the selection mode next to the summary. Concept 1 is closest to the LR style but leaves a large empty left column on desktop and hides More options as a quiet link. Concept 2 nests a box inside a box, and More options floats in the summary row. This preference is my visual judgment from static screenshots, not from interacting with the page.",
  "findings": [
    {
      "id": "R2-1",
      "severity": "medium",
      "path": "docs/verification/rc-builder-three-designs.html (.overlay / .preview-panel CSS, line 4; markup line 10)",
      "evidence": "`.overlay` is position:fixed with inset:0 and display:flex, and it has no overflow-y. `.preview-panel` has no max-height and no overflow. The body is set to overflow:hidden while the dialog is open. At 480px and below, the preview's action buttons stack vertically, and the automatic-mode explanation runs to 3–4 lines. I estimated the panel at about 770px tall at 390px width with 1 passage, and about 880px with 6 sample passages (manual or automatic count≥6). On a short phone (e.g. 375×667, or 390×844 minus browser chrome) or in landscape, the panel is taller than the screen. Auto margins in an overflowing flex item collapse to 0, so the bottom of the panel, where Back to setup and Start drill · demo sit, runs off-screen and cannot be scrolled to. A keyboard user can tab to those buttons but cannot see them. The verification note checks overflow only for the main page and the drawer footer, not the preview dialog.",
      "fix": "Give the preview panel `max-height: calc(100dvh - 32px); overflow-y: auto` (or put overflow-y:auto on the overlay). Then check the preview in the browser at 320×568 and 390×667 with 6 passages selected."
    },
    {
      "id": "R2-2",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (preview header markup line 10; mobile CSS `.preview-panel .main-actions{flex-direction:column}` line 4)",
      "evidence": "The preview header row (the h2 plus the × close button) also uses the class `main-actions`. At 480px and below, the mobile rule meant for the bottom buttons also stacks this header. The close button drops onto its own line under the title instead of sitting in the top-right corner. This also adds height, which makes R2-1 worse.",
      "fix": "Give the header row its own class (e.g. `.preview-head{display:flex;justify-content:space-between}`), or limit the mobile rule to the bottom actions row."
    },
    {
      "id": "R2-3",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (controls(), line 17; render() line 21)",
      "evidence": "The passage count `<output aria-live=polite>` is rebuilt by `#concept.innerHTML` on every step. Screen readers usually don't announce a live region that has just been inserted. After the F1 fix, focus goes back to a button labelled only 'More passages', so screen-reader users get no feedback on the new count. In manual mode both stepper buttons are disabled and nothing explains why.",
      "fix": "Update the output's text in place instead of rebuilding the whole concept, or put the value into the button label (e.g. 'More passages, 3 selected'). Add a short note in manual mode such as 'Count follows your picked passages'."
    },
    {
      "id": "R2-4",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (renderResults(), line 24)",
      "evidence": "The search placeholder promises 'Title, topic, or PrepTest', and each card shows 'PT101 · Law'. But the text being searched is `${title} ${topic} ${pt}`, i.e. '... Law 101'. Typing 'PT101', exactly as the card shows it, returns 'No sample passages match'.",
      "fix": "Search against `PT${p.pt}` as well as the bare number."
    },
    {
      "id": "R2-5",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (render() copy for v2/v3, line 21)",
      "evidence": "Concept 2 always says 'Set the pace. We'll handle the selection.', even in manual mode. The host screenshot rc-concept-2-mobile.jpg shows that line right next to the 'Your selection' pill. Concept 3's heading 'Choose your next passage.' is singular even though the stepper allows up to 8 passages. In concept 3 the h2 'Build an RC drill' also comes before the h1, and the page already has an h1 'Practice', so the heading order is inconsistent.",
      "fix": "Make the v2 lead copy depend on the mode. Make the v3 heading plural or neutral. Use one h1 per page and keep h2 headings in order."
    },
    {
      "id": "R2-6",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (renderResults(), line 24)",
      "evidence": "The manual pick buttons have aria-pressed, but their aria-label also switches between 'Add X' and 'Remove X'. A screen reader therefore announces 'Remove Online Game Currencies, toggle button, pressed', which mixes two ways of signalling state.",
      "fix": "Keep the label fixed (e.g. 'Select Online Game Currencies') and let aria-pressed carry the state, or drop aria-pressed and keep the changing label."
    },
    {
      "id": "R2-7",
      "severity": "low",
      "path": "docs/verification/rc-builder-three-designs.html (summary(), line 19; .fixture-note CSS)",
      "evidence": "The summary line shows the bare value 'After each passage' with no 'Show answers' label, so it reads as unclear on all three concepts (visible in every screenshot). The fixture disclaimer `.fixture-note` (#8a8075 on #fbf7f2, 11px) works out to about 3.6:1 contrast, below the 4.5:1 AA minimum for small text. That disclaimer is the main truthfulness notice.",
      "fix": "Render the line as 'Answers: after each passage'. Darken the fixture-note colour to at least #6f665c."
    },
    {
      "id": "R2-8",
      "severity": "low",
      "path": "docs/verification/rc-three-concepts-verification.md",
      "evidence": "Lines 17–18 still say the Claude review had zero completed rounds, and the note does not record the browser checks for the round-1 fixes (stepper focus, demo-start focus, preview shortfall text). The plan says the review log supersedes this, but anyone reading only the verification note gets an out-of-date picture. Every mobile screenshot and the drawer screenshot predate the fixes: the drawer text and the summary without '(sample)' differ from the current source.",
      "fix": "Add a dated section listing the round-1/round-2 outcomes and the fix verifications. Recapture the mobile and drawer screenshots, including a preview screenshot at narrow width, once R2-1 is fixed."
    }
  ],
  "coverage": [
    "I read the full plan text supplied in the prompt and the full single-file artifact rc-builder-three-designs.html: CSS, render logic for v1/v2/v3, the drawer and preview code, the focus trap, inert handling, and the keyboard handlers.",
    "I read the round-1 Sonnet result.json and checked each disposition F1–F7 against the revised source.",
    "I read rc-three-concepts-verification.md.",
    "I viewed these screenshots: rc-concept-1-desktop.jpg, rc-concept-1-mobile.jpg, rc-concept-2-mobile.jpg, rc-concept-3-mobile.jpg, rc-concept-drawer-mobile.jpg, rc-concept-1-revised-desktop.jpg, rc-concept-2-revised-desktop.jpg and rc-concept-3-revised-desktop.jpg. I did not open the original rc-concept-2-desktop.jpg or rc-concept-3-desktop.jpg; I used the revised desktop versions of those two instead.",
    "I traced the shared state (state, draft, count, timing, search, activeOverlay, returnFocus) through every writer: the stepper, timing, the mode buttons, Reset, Apply, Cancel/close/backdrop/Escape, the passage toggles, openPreview and demo-start."
  ],
  "limitations": [
    "I could not run a browser or any tests, so everything about rendering, focus behaviour, overflow and contrast comes from reading the source and the static screenshots. The R2-1 panel heights are my estimates, not measurements.",
    "The mobile and drawer screenshots predate the round-1 fixes. No screenshot shows the preview dialog or the narrow-width revised state.",
    "I did not read rc-three-concepts-review-log.md, rc-three-concepts-dispositions.md, or the uncommitted production RC component changes. Under the plan these concepts don't touch production files.",
    "I did not check the plan file's SHA256 myself; I relied on the plan text supplied in the prompt.",
    "The concept preference is my visual judgment from static screenshots plus a structural reading of the source, not from interacting with the page or testing with users.",
    "This was the last review round; the plan authorizes no third round."
  ]
}
