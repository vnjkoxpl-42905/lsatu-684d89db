# Final RC design verification and iterations

Date:2026-10-20. Host designer/builder: Codex. Final inspector: Claude Opus, requested alias opus; observed model recorded on completion. Maximum two independent inspections. This is a new final design scope, after the historical two concept review rounds. No publication. Diagnostics outside checkout.

## Pass 1: consolidation and functional composition
Built one final artifact, removed gallery modes and duplicate drawer mode/reveal controls. Main count/timing/reveal retained, distinct filter/manual drawer contexts, manual selected ordering and scrollable preview. Initial desktop inspected in Codex browser; evidence rc-final-pass1-desktop.jpg. Found heading incorrectly small due inherited CSS and insufficient spacing before mode; countstepper too wide. These concrete findings drive pass2 rather than cosmetic re-capture.

## Pass 2: hierarchy and desktop interaction audit
Completed: explicit heading clamp29–36px, removed redundant internal eyebrow, narrowed stepper138px and panel980px, removed lower filter divider, subtle neutral material lighting. Corrected actual production filter inventory: statuses, framework choices, PT101–159, custom m:ss and multilevel difficulty. No duplicate selection-mode or answer controls in drawers.

## Pass 3: responsive, keyboard and micro-detail audit
Completed: cleaned inherited gallery CSS; manual summary no longer repeats count/time, selected list has direct Remove controls, mobile order/Add/Close targets44px, custom time uses text keyboard and8:45 default, closing transition retains focus trap, preview sums actual sample questions. Custom-bezier transform/opacity motion and reduced-motion fallback.

Host Codex browser evidence:
- Actual CSS widths390,320,768,1440 and default docked layout inspected; existing browser zoom normalized and innerWidth read back. No horizontal overflow. Short landscape740x400 preview panel constrained368px with usable actions.
- Invalid custom0:30 disables Preview;8:45 accepted; invalid reversed PrepTest150–101 disables Apply; corrected101–159 accepted.
- Manual PT101 search, add Native American Burials/Species Gradient, move Species earlier, Cancel then reopen0selected proves discard. Re-add/reorder/Apply preview preserves Species then Native and sums14samplequestions.
- Direct selected-row Remove leaves1selection. Switching automatic preserves time/reveal and inactive manual picks. Science+level4+PT101–159 narrows supported fixture filters; request2 reports1samplepassage/7questions and truthful shortfall.
-320px drawer/footer fit320px. Six manual selections preview actions were tested at320x568 and740x400 landscape. After inspection1, the simulated demo action was replaced by a permanently disabled Start drill with an explicit design-preview explanation; Back to setup remains usable.
- Shift+Tab close→Apply and Tab Apply→close; Escape closes. Reduced-motion emulated via permitted CDP: drawer transition0s/animationnone, then emulation reset.
- Captures: rc-final-pass1-desktop.jpg, rc-final-mobile.jpg, rc-final-order-mobile.jpg, rc-final-preview-mobile.jpg, rc-final-preview-320.jpg. Final desktop/drawer captures added before inspection.
- node syntax check passed via worker; npm run build passed including index/canonical checks; git diff --check passed before each independent inspection. Existing Tailwind/noise/mixed-import/chunk warnings remain. Generated MCP stub restored to original baseline; prior production source edits preserved.
- Prior gallery copied to rc-history/rc-three-concepts-before-final-20261020.html and SHA256 matched17F287E05A0C2883BD2F54F7625EF0D64AD444323D979FD40CA396830E015446. Old gallery URL forwards to single final design.
- After user correction, direct authenticated21st MCP tools/list and search used, no further21st browser browsing. Catalog search returned drawer IDs25376/11442/25000 and segmented IDs34763/35020/23552. Metadata inspiration only; no marketplace source or imagery imported, no AI generation calls or credits spent. Auth value read from existing environment without logging.

## Claude inspection
Inspection1 returned REVISE and inspection2 returned APPROVED, both observed claude-opus-5-5. All material findings resolved. Remaining low-severity suggestions accepted for final host verification, with no third inspection. Approval covers the exact pre-polish HTML hash recorded below, not production or signed-in acceptance. Full responses and limitations follow.

## Final host polish after approval
Accepted all five low-severity inspection2 notes. Add/Added now forms the accessible name with an sr-only passage title. Persistent status announces selection changes and reorder positions. Invalid PrepTest ranges keep the advanced section open; checkbox rows, advanced summary and custom time input are44px. Browser verified Add Species Gradient and Add Native American Burials names, then announcement 'Native American Burials moved to position1 of2'; attempted collapse of invalid150–101 range left details open with aria-invalid=true. DOM measured checkbox/summary/custom input heights44px. Final390px main has no horizontal overflow; final mobile/filter screenshots recaptured. No third independent inspection covers these later changes. No unresolved material design finding remains; no actual screen-reader user test was performed.

The final builder remains a standalone local fixture. Start is disabled, no saves/recordings/account writes occur. Earlier production RC edits are untouched, LR unchanged, no commit/push/publication for this final design. Temporary browser viewport and reduced-motion emulation were reset. One final preview left open at rc-builder-final-preview.html.

## Host verification of inspection1 corrections
F1–F5 implemented and node syntax check passed. Applied filter summary is now shared across automatic/manual modes; supported filters narrow the manual catalogue while retaining pre-existing picks. Browser: select Species Gradient, apply Law, manual catalogue contains only Native American Burials while Species remains selected; then add Science to Topics and verify both values persist. Standard+Comparative and Old/New+Present Debate both remain selected and summarized. This consolidated concept uses shared committed passage filters across modes; cancel still discards drafts.

Search 'PrepTest 101 Science' returns Species Gradient. Invalid reversed PrepTest range exposes aria-invalid=true and range-error role=alert; custom time0 likewise exposes aria-invalid=true/time-error role=alert. Start drill is permanently disabled in local preview; no simulated completion handler remains. Back to setup is usable at320x568. Updated final mobile, manual drawer, 320px preview, desktop and desktop-filter captures replace the pre-correction versions before inspection2. Multi-select drawer and footer fit actual320px width. Full build from pass3 passed; changes since then are confined to standalone HTML and documentation.

## Iteration evidence qualifications
Pass2 browser screenshot was displayed in Codex tool output but not saved as a separate historical file. Final desktop captures retain its explicit heading clamp29–36px, 138px stepper, 980px panel and reduced divider count. These source changes were reported when the worker saved pass2; pass3 then replaced inherited gallery CSS and made the separate interaction/touch corrections listed above. The original pass1 screenshot shows the preceding tiny-heading/large-control state. No final image is mislabeled as a historical pass2 capture.

## Completed Opus inspection 1
Observed model claude-opus-5-5, verdict REVISE. Full response below. Result: C:/Users/Joshu/AppData/Local/Temp/rc-final-design-opus-inspection1/claudex-m86xxjqr/result.json
{
  "verdict": "REVISE",
  "summary": "I read the final artifact (rc-builder-final-preview.html: HTML, CSS and inline JS), the legacy redirect, rc-final-design-verification.md and all six required screenshots. Most of the contract is met. The heading changes between singular and plural. The two-way mode control works. Manual mode shows the real selected count with an Edit selection link. Custom time is validated. The drawer keeps a draft that Apply commits and that Cancel, Escape, Close and the backdrop all discard. Order and remove controls work and move focus sensibly. The preview reports the fixture shortfall truthfully. Background inert, the focus loop, focus return and the reduced-motion fallback are all in the code. The redirect is correct.\n\nOne medium spec problem remains. In manual mode, the summary beside Customize drill and the filter behaviour both differ from the contract and from production. In production, filters also narrow the manual passage list; in the preview they don't, and the summary shows topics of the picked passages instead of the applied filters. There are also several low-severity fidelity, accessibility and evidence gaps.",
  "findings": [
    {
      "id": "F1-manual-filter-semantics",
      "severity": "medium",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "mainSummary() (line 16) returns 'Topics: … · Difficulty: …' worked out from the picked passages when mode==='manual', so the text beside Customize drill is not the applied passage filter summary the contract asks for. In manual mode, Customize drill still opens the filter drawer, which says 'These automatic filters are retained separately. Your manual picks are unchanged' (line 21). renderResults() (line 23) filters only on the search text and never on filters. Production does the opposite: RcHubSurface.tsx:757-765 handPickRows ends in `return matches(p)`, so the manual list is narrowed by the manual-mode filter draft. Failure: in manual mode, choose Topic=Science and press Apply. Nothing visible changes on the main panel or in the Pick passages list, so the filter looks broken and the preview no longer matches production behaviour.",
      "fix": "In manual mode, apply the committed filters to the pick-drawer catalogue, as production does. Show the applied filter summary beside Customize drill and move any 'picked topics' text into the selection area. Alternatively, hide or relabel Customize drill in manual mode and record that choice as a deliberate design decision."
    },
    {
      "id": "F2-single-select-topic-format-framework",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "field('topic'…), field('format'…) and field('framework'…) are single <select> controls (line 21), and filters stores them as single strings (line 8). Production RcSelectionFilters stores topics, formats and frameworks as arrays toggled through FilterGroup (RcHubSurface.tsx:78-82, RC_TOPICS/RC_FORMATS/RC_FRAMEWORKS in rcTypes.ts:329-341). The plan says to 'Preserve real production capabilities for later integration'. As built, the design can't express something like 'Law or Science', which production allows. Only difficulty is multi-select.",
      "fix": "Use multi-select checkboxes or chips for topic, format and framework, like the difficulty fieldset. Otherwise, document the reduction as an intentional simplification that integration must undo."
    },
    {
      "id": "F3-validation-errors-not-announced",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "The custom time input gets aria-describedby='time-error' but never aria-invalid. #time-error is shown or hidden while typing (line 18) and has no role=alert or aria-live. #range-error and the PT inputs (line 21) work the same way. When Preview or Apply becomes disabled, a screen-reader user hears no explanation. Production sets aria-invalid and role=alert on the custom-pace error (RcHubSurface.tsx drillSettings).",
      "fix": "Toggle aria-invalid on #custom-minutes, #pt-from and #pt-to. Give #time-error and #range-error role=\"alert\" (or aria-live=\"polite\")."
    },
    {
      "id": "F4-pt-search-with-space",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "renderResults() matches the query against `${title} ${topic} ${pt} PT${pt}` (line 23). Searching 'PT 101' (with a space) returns 'Try a different title, topic, or PrepTest.', even though the placeholder invites PrepTest searches and production accepts 'PT 140', 'PrepTest 140' and multi-term queries (RcHubSurface.tsx:762-763).",
      "fix": "Add 'PT ${pt}' and 'PrepTest ${pt}' to the searchable text, and match each whitespace-separated term separately, as production does."
    },
    {
      "id": "F5-demo-start-simulates-launch",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "The preview dialog's main action is 'Start drill · demo'. Clicking it shows 'Demo complete…' (line 29, see rc-final-preview-320.jpg). The contract says the preview 'never simulates … launch'. The text is honest, but the main action still acts out a launch, and a 'Demo complete' end state could be read as a successful start.",
      "fix": "Show a disabled or inert 'Start drill' button with an explanatory note, or remove the demo completion state. That keeps the preview free of any simulated launch."
    },
    {
      "id": "F6-iteration-evidence-gap",
      "severity": "low",
      "path": "docs/verification/rc-final-design-verification.md",
      "evidence": "The contract requires 'Three actual design iterations documented with findings, changes and evidence'. Pass 1 cites rc-final-pass1-desktop.jpg. Pass 2 lists changes but cites no screenshot or DOM readback of its own. All the listed captures are pass 1 or final. The 'Claude inspection' section also still reads 'Pending'.",
      "fix": "Add or cite a pass-2 capture or DOM readback showing the heading clamp and stepper-width changes, and fill in the inspection section after review."
    }
  ],
  "coverage": [
    "Read every line of docs/verification/rc-builder-final-preview.html, covering the CSS, markup, and the render, drawer, picked, results, overlay, focus-trap, preview and apply/cancel logic",
    "Read docs/verification/rc-builder-three-designs.html: meta refresh plus location.replace to the final artifact, with a fallback link",
    "Read docs/verification/rc-final-design-verification.md and checked its claims against the code",
    "Viewed rc-final-desktop.jpg, rc-final-mobile.jpg, rc-final-filters-desktop.jpg, rc-final-order-desktop.jpg, rc-final-order-mobile.jpg and rc-final-preview-320.jpg",
    "Traced state transitions by reading the code: mode switch, opening the pick drawer without committing, Apply committing mode and picks, Cancel/Escape/backdrop/Close discarding the draft, Reset/Clear inside the draft, the Apply disabled state per drawer context, and repeated opening during the close timer (blocked because the page stays inert)",
    "Checked the fixture filter inventory against production STATUS_OPTIONS, DEFAULT_FILTERS, RC_TOPICS/FORMATS/FRAMEWORKS and RC_PREPTEST_MAX/DEFAULT_MAX, and the manual picker's handPickRows filtering in RcHubSurface.tsx",
    "Confirmed that the lsatprep.study domain in the /rc/search link appears elsewhere in the repo"
  ],
  "limitations": [
    "I couldn't run anything, so nothing here comes from a browser run, the node syntax check, npm run build or git diff --check. The verification doc's runtime claims (widths, landscape, the reduced-motion CDP emulation, the focus loop) are unconfirmed.",
    "Screenshots are static. Motion timing, the reduced-motion fallback and focus-visible rendering were judged from the CSS and JS only.",
    "As the plan scopes it, I didn't review the uncommitted production edits to RcHubSurface.tsx, RcHubSurface.test.tsx and rc.css for correctness. I only used them as reference for production behaviour. Nothing in this review approves them for production.",
    "I didn't inspect the historical concept artifacts, the immersive/picker/simple-preview files or the rc-history copies, apart from noting that they exist in the manifest. I didn't verify the copied gallery's SHA256 myself.",
    "I didn't check the 21st.dev references or the claim that no marketplace code was copied, beyond seeing no third-party component code in the artifact."
  ]
}

## Completed Opus inspection 2
Observed claude-opus-5-5, verdict APPROVED for localdesignonly. Target hash inspected:398a39b69763068a22180067c6b335d81cbfaecff72fab82802151233c109d80. Result path C:/Users/Joshu/AppData/Local/Temp/rc-final-design-opus-inspection2/claudex-grkxjarw/result.json. Full response:
{
  "verdict": "APPROVED",
  "summary": "This is inspection 2 of 2. I re-read the full final artifact (rc-builder-final-preview.html: CSS, markup and inline JS), the legacy redirect, the updated rc-final-design-verification.md and all six required screenshots.\n\nAll five code findings from inspection 1 are fixed in the source:\n- **F1:** mainSummary() shows the committed filters in both modes, and the manual catalogue goes through matching() on committed filters. Picks outside the filters stay selected, and a note says so.\n- **F2:** Topics, formats and frameworks are now arrays edited with checkbox fieldsets.\n- **F3:** aria-invalid is toggled on the custom-time and PrepTest inputs, and #time-error and #range-error have role=alert.\n- **F4:** Search splits the query into words and matches \"PT 101\", \"PT101\" and \"PrepTest 101\".\n- **F5:** Start drill is always disabled, explained through aria-describedby, and has no simulated-completion handler.\n\n**F6** (iteration evidence) is handled by disclosure: the pass-2 screenshot was never saved, and the document says so instead of passing off a later image as historical.\n\nI traced the state transitions again in the code:\n- Apply commits picks and switches to manual mode in the pick drawer, and commits filters in the filter drawer.\n- Close, Cancel, Escape and the backdrop all discard the draft, and the main panel stays unchanged while you edit.\n- The focus trap, inert background, focus return after re-render, the reduced-motion close path and the automatic-mode shortfall message all behave correctly.\n\nThe screenshots match the corrected source: checkbox filters, the catalogue line in the pick drawer, the disabled Start drill at 320px, and the applied-filter summary on desktop and mobile.\n\nThe remaining defects are low-severity accessibility and evidence details. None of them makes the local design deliverable materially wrong. This is not a production approval.",
  "findings": [
    {
      "id": "R2-L1-add-button-label-in-name",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "In renderResults() (line 25), each catalogue button shows the text 'Add' or 'Added' but has aria-label=\"Select ${title}\". The visible word is not part of the accessible name, which breaks WCAG 2.5.3 Label in Name. A speech-control user who says \"click Add\" on Species Gradient gets no match. A screen-reader user hears \"Select Species Gradient, toggle button, pressed\" while the screen says \"Added\".",
      "fix": "Make the visible verb part of the name, for example aria-label=\"Add ${title}\" with aria-pressed. You could also drop aria-label and add a visually hidden title after the visible text."
    },
    {
      "id": "R2-L2-range-error-hidden-in-collapsed-details",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "The PrepTest inputs and #range-error sit inside the collapsible <details>'More specific filters'</details> (line 23), and validRange() disables Apply. Failure case: open More specific filters, set 150 to 101, then collapse the section. Apply stays disabled, but the error and the invalid inputs are hidden, so nothing visible explains why Apply is unavailable.",
      "fix": "Keep the details element open while validRange() is false, for example by reopening it in the toggle handler. Or repeat a short error next to the footer Apply button and reference it from Apply with aria-describedby."
    },
    {
      "id": "R2-L3-sub-44px-targets",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "The plan requires adequate touch targets. Three targets are under 44px:\n- The 'More specific filters' <summary> has no min-height or padding. At 12px text its hit area is about one line, roughly 17–18px tall, because the 20px padding belongs to the details element, not the summary.\n- `.check-option` rows (every topic, format, framework and difficulty checkbox) use min-height:40px.\n- `.custom-time input` uses min-height:40px.\nThe verification notes cover only the order, Add and Close buttons at 44px.",
      "fix": "Give `.drawer summary` display:block (or flex) with min-height:44px and vertical padding. Raise .check-option and the custom-time input to min-height:44px, or document 40px as an accepted exception."
    },
    {
      "id": "R2-L4-recreated-live-region",
      "severity": "low",
      "path": "docs/verification/rc-builder-final-preview.html",
      "evidence": "renderPicked() (line 24) rebuilds #picked-container with innerHTML each time, including its `<p role=\"status\">N selected…</p>`. A live region that is inserted fresh with its content is often not announced, because many screen readers only announce changes inside an existing region. So after Add, Remove or reorder, the new selected count may go unannounced.",
      "fix": "Add a persistent role=status element to the drawer markup once, outside #picked-container. Update only its textContent in renderPicked()."
    },
    {
      "id": "R2-L5-proof-record-gaps",
      "severity": "low",
      "path": "docs/verification/rc-final-design-verification.md",
      "evidence": "The plan's Proof section requires a node syntax check, npm run build and git diff --check. The verification doc records the first two but never mentions git diff --check. Line 19 also still says 'Demo reports no start/no save', which describes the removed demo-completion behaviour, not the current permanently disabled Start drill. Line 32 says the full build ran at pass 3, before the inspection-1 HTML changes. That is disclosed, and acceptable only because the later changes are standalone HTML.",
      "fix": "Run git diff --check and record the result, or state that it was skipped. Change line 19 to describe the disabled Start drill and its explanatory note."
    }
  ],
  "coverage": [
    "Read every line of docs/verification/rc-builder-final-preview.html: the CSS (including the 1150/850/600/480px breakpoints and the reduced-motion rule), the markup for both overlays, and all JS functions: render, openDrawer, multiField, renderDrawer, renderPicked, renderResults, focusables, openOverlay, closeOverlay, matching, openPreview, and the global handlers for close, backdrop, reset, apply and keydown.",
    "Read docs/verification/rc-builder-three-designs.html: the meta refresh plus location.replace to the final artifact, with a fallback link.",
    "Read docs/verification/rc-final-design-verification.md, including the inspection-1 record and the host notes on its corrections, and checked each F1–F6 disposition against the source.",
    "Viewed rc-final-desktop.jpg, rc-final-filters-desktop.jpg, rc-final-order-desktop.jpg, rc-final-mobile.jpg, rc-final-order-mobile.jpg and rc-final-preview-320.jpg, and confirmed each shows the post-correction UI (checkbox filters, catalogue line in the pick drawer, disabled Start drill, applied-filter summary).",
    "Traced these transitions through the code: Pick passages without committing, Apply switching to manual mode, Choose for me keeping picks, Edit selection, Cancel/Close/Escape/backdrop discarding drafts, Reset or Clear inside a draft, how Apply is enabled per drawer, PrepTest and custom-time validation, multi-level difficulty with the Adaptive checkbox, stepper bounds and focus hand-off, order/remove focus recovery, search tokenization, sort, catalogue narrowing with picks kept outside the filters, preview shortfall and zero-match output, and attempts to open an overlay while another is closing (blocked by inert).",
    "Checked escaping: titles, the custom value, PrepTest draft values and filter labels go through safe(). Unescaped values come only from constants or numeric inputs."
  ],
  "limitations": [
    "I couldn't run anything. The node syntax check, npm run build, git diff --check, browser widths, landscape, CDP reduced-motion emulation and focus-loop results come from the host's verification doc and were not reproduced.",
    "Motion, focus-visible rendering and live-region announcements were judged from static CSS/JS and screenshots only. I used no screen reader or speech-control tool.",
    "Several screenshots are larger than the fixed overlays they show: the desktop overlay covers about 1440x900 of an 1800x1125 image, and the mobile overlays don't span the full image. This looks like a capture or zoom artifact. I judged layout from the in-viewport area only.",
    "As the plan scopes it, I did not review the uncommitted production edits to RcHubSurface.tsx, RcHubSurface.test.tsx and rc.css, the historical concept, immersive or picker artifacts, or the rc-history copies. I did not verify the copied gallery's SHA256 or the 21st.dev reference claims. Nothing here approves anything for production or accepts it for signed-in use."
  ]
}
Remaining lowseverity notes accepted for final hostpolish; these later changes have no third independent inspection.
