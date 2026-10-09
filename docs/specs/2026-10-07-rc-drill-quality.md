# RC drills must be easy to configure, read, and trust

Date: 2026-10-07. Status: audited specification; only the first layout/copy slice is implemented locally at this checkpoint. This document extends the [platform comparison](../audits/2026-09-27-competitor-ui-audit.md) and supersedes the old [RC builder spec](../plans/RC-DRILL-BUILD-SPEC.md) only for the interactions explicitly described here. It does not authorize inventing question data, summaries, explanations, or analytics.

## The outcome Joshua requested

A student should understand the drill before starting, read the passage comfortably at ordinary browser zoom, know what each control does, and trust the saved answers and score. Joshua specifically identified awkward “Inspect set” copy, crowded RC selection, unrelated conditional assignments beneath setup, a vague Menu control, difficult passage-only reading, and the text-size dropdown. He then requested a side-by-side LSAT Lab comparison, interaction audit, complete fix log, and an implementation plan.

Use LSAT Lab as interaction evidence, not as a requirement to copy every feature. Keep LSAT U's teaching model and truthful content fallbacks. New video production remains deferred under the existing platform decisions.

## Evidence and limits

Direct comparison used the Codex in-app browser, signed into LSAT Lab and the local LSAT U admin account. LSAT Lab surfaces: `/my`, question finder, filtered/adaptive/priorities tabs, and RC practice for PT111 S2 Q9 and PT159 S2 Q2. LSAT U surfaces: `/practice/drills?section=rc&stage=type-drill`, a completed protected PT159 section review, its report/history routes, and the original PT111 drill. Code audit covered the RC feature context and shared official drill chrome.

Evidence labels below:

- **Browser:** clicked or measured in a running app. A displayed control alone is not proof of durable saving.
- **Code/tests:** traced implementation or exercised a focused regression test; production end-to-end behavior may remain unverified.
- **Proposal:** recommended product behavior, not a current defect or completed feature.

The protected review prevented changes to source answers, flags, clock, and completion. It still allows personal annotations; no annotation marks were deliberately saved during this audit. No competitor notes, discussion posts, new scored attempts, purchases, or account changes were submitted. Opening the original in-progress LSAT U session with `review=1` redirected to live mode and may have advanced its timer; this was an audit mistake, not a verified read-only walk. All subsequent detailed player checks used the completed protected session.

Private screenshots are in the Codex visualization directory for this chat: `rc-setup.png`, `rc-passage-reading.png`, `rc-reading-laptop.png`, `rc-font-menu.png`, and `lab-rc-reading.png`. The same-passage laptop captures use 1366 x 768 CSS pixels. They are visual references, not evidence that both products share the same font preference or reading mode defaults. No credentials or question-body copies belong in this specification or Git.

## Side-by-side feature coverage

| Feature | LSAT Lab observed | LSAT U observed or traced | Required direction / verification status |
|---|---|---|---|
| Enter RC setup | LR/RC selector with Adaptive, Filtered, Top Priorities tabs | RC launcher with count, timing, answer reveal, selection | Keep explicit RC context. Local setup has no unrelated homework feed. Browser verified. |
| Automatic choice | Adaptive exposes prior-question policy and difficulty | Adaptive picks fresh passages near level, with pool count | Keep a plain explanation of selection. Avoid implying individualized mastery without evidence. Code/tests; both setups opened. |
| Manual choice | Filtered search links to a matching-content surface | Old wide table; now readable rows plus persistent removable selections | One title/opening, source address, topic, format, questions, difficulty and Add/Remove action per row. Browser selection/search verified. |
| Passage filters | Topic, format, frameworks, question types/features, levels, explanations | Topic, format, framework, difficulty, status, PrepTest | Keep advanced filters collapsed. Question-grain filters are a separate proposal requiring a clear passage-versus-question contract. Filter controls inspected, not every combination launched. |
| Priorities mode | Tab opened; immediate panel did not show a useful recommendation | No equivalent RC priorities surface established in this audit | Defer parity. Never create an empty or unsupported recommendation mode. |
| Search/addresses | Question finder chooses official PT, section and question | Picker accepts titles/opening, PrepTest/PT, section/passage search | Retain official addresses and distinguish drill ordinal. Browser and code verified. |
| Preview/start | Finder opens existing content; filtered Start links to content overview | Preview loads exact passages/questions without answers; start creates saved session | Preview drill then Start this drill. Changed settings invalidate preview. Shortfall requires acknowledgement. Code/tests and browser preview verified; no fresh scored start submitted in this audit. |
| Passage count | Different setup modes expose different selection contracts | Automatic requested count; manual count equals picks | Disabled count in manual mode, explicit zero selection, no automatic top-up. Browser/tests verified. |
| Timing/reveal setup | Reader menu exposes reading timer, prediction, reveal answer/explanation modes | Untimed, standard/custom pace; after question/passage/drill answer reveal | Preserve three reveal contracts and validate custom pace before launch. UI inspected; lifecycle regression tests cover behavior. |
| Passage-only | Dedicated view toggle; passage region expands | Full available frame width; 18px / 1.6 default; responsive columns | Default readable without browser zoom; do not shrink text to force all passages onto every screen. Browser verified desktop through narrow. |
| Passage + question | Two-pane reading and question surface | Split pane with separate passage/question scrolling | Preserve text position when changing questions within passage. On narrow screens choose an explicit stacked/tab behavior. Current mode opened; broader real-device audit pending. |
| Text size | Accessibility modal: named 75/100/125/150/175% sizes | Popover now has named sizes, current size, accessible pressed state | Size change applies immediately to passage and question text and survives reload; menu must fit viewport. Browser verified 18px -> 22.5px at125%; tests cover selection and saved settings. |
| Spacing/colors | Accessibility modal has Color scheme, Font size, Zoom, Line Height tabs | Default/Roomy/Roomiest spacing and six color schemes | Keep size separate from spacing. Add announced selected state to spacing/colors. Browser Roomy changed line height28.8 ->33.3px; selected aria state missing. |
| Find text | Search field opened and filled; no authoritative match result established | Search marks matches and shows counter, previous/next and clear | LSAT U matched Torchy9 times, moved1/9 ->2/9 and cleared. Empty/no-match feedback and keyboard behavior require acceptance checks. |
| Annotations | Keyboard Highlight control invoked; durable marking not exercised | Underline, yellow/pink/orange markers, eraser and passage annotations | Keep tools but fix actor ownership, late-load overwrite and failed-save recovery before claiming safe persistence. Code findings, not an end-to-end account-switch reproduction. |
| Bookmarks | Flag item visible; review dialog exposes flagged filter | Personal bookmark/flags/cross-outs subject to mode restrictions | Every saved toggle must expose pending/error/retry. Protected source flags stay disabled. Code/tests; no competitor flag write submitted. |
| Answer masking/prediction | Masking toggle changes choice action labels; reading/prediction/reveal modes present | Cross-outs, choices and reveal modes; no separate prediction workflow established | Keep cross-outs. Prediction input and response masking are optional pedagogy proposals, not prerequisite parity. |
| Keyboard navigation | Review controls and Keyboard Highlight exposed | A-E, F and arrows implemented | Exclude editable inputs/dialogs; document shortcuts; provide keyboard access to text tools. Source traced; full keyboard-only audit open. |
| Question navigation | Official-number pager for current passage, Prev/Next | Drill-wide ordinal pager and passage separators | Label official Q separately from drill progress. Browser navigation used; full timed/unanswered navigation persistence tests still required. |
| Menu/details | Menu sidebar with Details, Find Similar, Discussion, Notes, Pause, Modes | Direct Question details; top Pause/Complete and explicit exit | Do not restore the vague duplicate Menu. Rename Set fields to Passage fields and use official source Q in details. Browser verified. |
| Answer/explanation | Answer reveal identifies correct choice; explanations and per-choice drawers visible | Post-check feedback, per-choice explanations or truthful missing-content fallback | Preserve attempt-first policy. Verify all rendered credits against import authority. Browser found a critical discrepancy described below. |
| Passage summary | Summary/written/video controls are available on sampled reader | Expandable authored/imported summary in review | Never leak summary during scored attempt or preview. Summary toggle browser verified; unavailable content stays unavailable. |
| Review navigator | Dialog offers flagged/unattempted item filters | Numbered pager in player; report/type filters elsewhere | Add a compact question overview with answered/unanswered/flagged state, separate from answer correctness until permitted. Proposal. |
| Similar questions | Sidebar opened; sampled item returned unable-to-find result | No comparable per-item workflow established | Defer until metadata/selection is reliable. An honest empty state is preferable to a fake result. |
| Notes/discussion | Notes editor and discussion composer opened; Post disabled when empty | Tutor/help and report flows; equivalent in-player notes/discussion not established | Prefer contextual private teacher question with saved source address. Do not add community features to repair a reading layout. No message/note submitted. |
| Pause/finish | Pause is in reader menu; score-changing finish not submitted | Pause/Complete and save recovery implemented | Test pause/resume, failed save, duplicate completion, timer expiry and reload on a dedicated new test attempt. Source/tests only for complete lifecycle here. |
| Saved history/results | History exists; current pass focused RC reader/setup | Actor-owned list, results, first-attempt score, drill misses and analytics inclusion controls | Admin personal history now explicitly filters actor. Report/review opened. Fresh lifecycle and cross-device integrity remain gated. |
| Full screen/zoom | Full screen and separate Zoom control visible | Wide passage-only frame; browser zoom still works | Add app full screen only if it measurably improves reading. Do not require it for default usability. Native fullscreen and200% zoom not certified in this pass. |

## Fix register, ordered by what can damage trust

| ID | Priority | Finding and evidence | Required fix | State |
|---|---|---|---|---|
| RC01 | P0 | Same official PT159 S2 P1 Q2: Lab marks D, U payload10733 credits B. U's choice flags and verdict agree with its imported B. | Establish official key/provenance, audit importer and recovered fields, repair only verified content, assess existing results. No majority-vote correction. | Open discrepancy; no content edits. |
| RC02 | P1 | Annotation debounce keyed only passage; actor resolved at delayed save time (`rcProgress.ts`). | Capture actor at edit, actor+passage key, reject stale account work. | Open, code verified. |
| RC03 | P1 | Async annotation load replaces map while tools already accept edits (`useRcHighlights.ts`). Read failure becomes empty usable state. | Gate edits until loaded or merge versioned local edits; failed read cannot overwrite saved marks. | Open, code verified. |
| RC04 | P1 | Official address paired with drill ordinal: PT111 P1 Question9 can mean ninth drill item although official P1 hasQ1-6. | Show official question.position in source context; show ordinal separately as9ofN. | Open, browser/code verified. |
| RC05 | P1 | Fixed frame and narrow passage measure made passage-only reading inefficient. | Responsive wider canvas, readable base size/leading, columns only when width allows. | Implemented locally; responsive browser verified. |
| RC06 | P1 | Picker table, scattered actions, duplicated summary and Inspect terminology confused launch. | Readable rows; explicit selection mode; one preview/start footer; compact summary. | Implemented locally; browser/tests verified. |
| RC07 | P1 | Unrelated assigned work remained below RC builder. | Suppress shared work feed while launcher is active; retain normal hub feed. | Implemented locally; browser/tests verified. |
| RC08 | P1 | Personal admin history could list student-owned sessions because admin RLS allows broader reads. | Explicit current-user filter on personal session listing. | Implemented locally; history browser/API tests verified. |
| RC09 | P2 | Preferences menu used generic70vh height and start alignment; current-state labels unclear. | Fit Radix available space, right alignment, scroll, readable names/current selection. | Implemented locally; mobile/laptop browser and tests verified. |
| RC10 | P2 | Annotation upsert is fire-and-forget; failure has no recovery indication. | Visible Saved/Saving/Not saved state, retry same edits, durable local pending recovery. | Open, code verified. |
| RC11 | P2 | Flag toggle optimistic without save acknowledgement/error recovery. | Await/track save, retain intent on failure, retry, do not claim saved. | Open, code verified. |
| RC12 | P2 | Line/color selected state is visual only; buttons lack pressed/checked state. | Radio groups or aria-pressed; announce selection, complete keyboard focus. | Open, browser/code verified. |
| RC13 | P2 | Details says Set Difficulty/Set Number; directions mention blackening an answer sheet. | Passage difficulty/Passage, digital choice instructions and visible source question. | Open, browser/code verified. |
| RC14 | P2 | Generic bottom Menu duplicates session actions. | Direct Question details; Save and exit/Exit review, keep top session actions. | Implemented locally; browser/tests verified. |
| RC15 | P2 | Long question pager consumes screen height at narrow widths. | Compact accessible overview with passage grouping and answered/flagged state. | Proposal; current wrapping has no horizontal overflow. |
| RC16 | P2 | Protected read-only banner can imply absolutely no persistence, while personal annotations/preferences/bookmarks remain separate. | Clarify protected-answer scope and personal-tool saves; never resume a live drill silently under review semantics. | Open UX contract; routing/persistence code verified. |
| RC17 | P2 | Default setup still relies on several small utility controls; complete zoom/focus/contrast sweep not done. | Consistent44px actionable targets, focus visibility,200% text/zoom, high-contrast schemes and reduced-motion checks. | Acceptance gate, not a claim every control currently fails. |

## Implement in five bounded slices

### Scoring discrepancy provenance

The incorrect B flag already exists for question10733 in the ignored recovery input `scripts/rc-source/recovered/questions.ndjson`. All548 recovered records lack an explicit `correctanswer`. The current recovery extractor `scripts/rc-recovery-pull.js` now captures that field, but `scripts/build-rc-bank.mjs` currently ignores recovered explicit keys and derives credit from an explanation key or per-choice flag. The builder does not demonstrate a positional-shift bug; the questionable flag is upstream. One confirmed Lab/U disagreement does not establish how many other keys are wrong.

Audit all2150 imported questions against independent verified keys, prioritizing all548 recovered records. Retain provenance, reconcile disagreements explicitly, and reject key/choice-flag conflicts during generation. Rebuild affected bank and frozen timed manifests only after adjudication. Wrong keys can affect new feedback, stored `rc_attempts.is_correct`, report rollups and adaptive history. Historical regrading is separate work: preserve original selected answers/timing and record the correction basis and impact. This audit changed no bank keys or attempts.

1. **Protect scoring and identities.** Resolve RC01 against an authoritative key. Fix RC02-04 and RC10-11. This precedes new learning features. Keep historical score changes explicit, with an auditable correction rather than silently rewriting finished sessions. Do not alter protected exam records through UI testing.
2. **Finish the simple builder and readable reader.** Release the already-tested RC05-09 and RC14 slice. Add RC12-13. Verify shared toolbar/frame changes retain LR defaults. Nothing in this slice changes scoring data.
3. **Unify navigation and review.** Implement RC15-16. Separate source address, drill progress and protected-attempt status. Maintain return destination from history/report. Keyboard-only walkthrough and mobile footer are mandatory.
4. **Harden every save and recovery boundary.** Exercise live test attempts in each reveal/timing mode, account switch, lost reply, slow read, offline retry, reload and closeout. Report persisted facts rather than optimistic claims.
5. **Only then consider optional parity.** Question-level filters, prediction, masking, similar items, private notes, full screen and priorities need a teaching purpose and reliable data. Discussion/video production are not part of the requested RC repair.

## Layout and interaction contracts

### Setup has one decision path

Order: count/timing -> answer reveal -> Choose for me/Choose passages -> optional Filter passages -> manual search/list if selected -> Preview drill -> preview/summary -> Start this drill. Preview is required to establish exact identity and count. Before preview, the primary action is Preview drill; after successful preview, exactly one primary Start this drill action appears. Changing effective selection/settings invalidates that preview. Loading disables its action and identifies what is loading. Failed loads keep choices and show Retry. An empty manual selection cannot preview or start. Shortfall is visible and requires acknowledgement without silently relaxing filters.

Use existing rc spacing/type/color tokens where available. Builder padding is24px desktop and16px narrow; control targets at least44px. Container width640px is the point at which settings stack, including a docked sidecar. Passage row source address remains visible; opening may truncate to two lines, full title remains accessible. Selected items are removable without searching for them again. No horizontal page scroll.

### Passage reading uses the screen without making text tiny

Default passage type18px, leading1.6; question type should maintain the same readable hierarchy. Named scale75/100/125/150/175% maps to actual font size; do not resize the entire app. Saved user settings are retained, malformed settings recover to default. Passage-only uses full frame width. Below available68rem reading-container width, use a centered single column with a maximum72ch measure. At/above68rem, allow two balanced columns with minimum28em column width and2.5em gap. The actual column count must collapse if user font scaling makes two readable columns impossible.

Long passages may require vertical scrolling. Never promise all text fits at every viewport, and never crop it or shrink it to meet a fit claim. No sideways passage scrolling. Passage and question retain independent scroll in split view. Same-passage navigation preserves reading position; a new passage starts at its beginning. Comparative A/B headings and ordering must survive all modes. Summary remains a deliberate review action, never automatic material in preview/live scored reading.

### Preferences stay usable on short and narrow screens

Use a portaled Reading preferences dialog/popover with collision padding12px, width256px or available viewport width minus24px, and maximum height min(70dvh, available popover height). Overflow scroll is inside the preferences surface. Focus returns to the trigger after selection/close. Text size exposes current selection to assistive technology. Spacing/color use checked radio semantics or pressed buttons; visual circles alone are insufficient. Keep a live passage sample visible when choosing preferences. Escape closes; keyboard focus never disappears behind the reader.

### Source identity and progress are separate

Breadcrumb/details: PrepTest159 / Section2 / Passage1 / Official question2. Progress: Question2of27 in this drill. For a mixed drill, use a compact source address plus drill ordinal; never put an ordinal beside an official PT as though it is the official question number. Pager may use ordinal but accessible name includes official address and state. Do not reorder official letters or derive correctness from choice popularity. Missing metadata is absent, not guessed.

### Saves belong to the actor who made them

Every pending answer, flag, annotation and clock command captures actor and subject identity at creation. Account changes invalidate stale work and close/reload the relevant session surface. Annotation load states are loading/loaded/error; error must not mean an empty persisted annotation set. Writes use acknowledgement and stable retry identity. Local backups are isolated by actor/session/passage. Visible “Saved” appears only after acknowledged persistence. Source protected-review answers/flags/clock/completion never mutate; personal study tools have an explicitly stated separate scope.

## Acceptance checks that define completion

Current integrated repair evidence is tracked separately in [the release acceptance ledger](2026-10-09-rc-release-evidence.md). Earlier checkpoints below remain historical evidence and do not certify the current working tree or production.

| Gate | Required checks |
|---|---|
| Content authority | Same official addresses render identical prompt/choice order and correct credit against verified authority. Include PT159S2Q2 regression. Provenance and correction affected-scope report exist; no guessed keys. |
| Builder | Automatic/manual switch, zero picks, all search/filter combinations with counts, offscreen selections, remove/clear, exact preview, settings invalidation, shortfall, invalid custom timing, delayed load/account switch, failed start/retry without duplicate sessions. |
| Reader | Standard and comparative, longest/shortest passages, split/passage-only, preserved scroll, eighteen-pixel default, all sizes and spacing/schemes, no clipped text, no horizontal overflow. |
| Preferences | Real Radix selection changes both panes; reopen/reload retains state; keyboard/Escape/focus return; short/narrow available-height fit; screen reader announces every selection. |
| Tools | Underline/each color/erase, overlapping ranges, search/matches/clear/no result, cross-outs/select restoring a crossed-out choice, bookmark/flag reload, editable-field shortcut exclusions. |
| Annotation reliability | Edit before delayed read, read failure, rapid passage switch, actor A->B before debounce, offline upsert/retry, tab reload pending edits. No wrong-actor writes or silent data loss. |
| Reveal modes | After question: confirm then feedback; after passage: check exact passage before revealing; after drill: finish before showing scores. Empty/unanswered actions explain what remains. No summary/answer leak during preview. |
| Lifecycle | New dedicated test session start/pause/resume/save-exit/reload/complete/timer expiry; failed/stale acknowledgement, duplicate command and lost reply; historical first-answer evidence remains intact. |
| Review/report | Normal completed review versus protected review, wrong/flagged/unattempted navigation, official addresses, type rollups/sample sizes, drill misses creates new attempt, report return destination, actor-owned history. |
| Responsive/accessibility | 390x844,700x900,1024x768,1366x768,1920x900 and actual docked sidecar;200% zoom/text resize, keyboard-only,44px targets, scheme contrast, reduced motion and screen-reader state. Desktop emulation does not certify physical phone behavior. |
| Regression/release | Focused tests, typecheck, build, lint and screenshot evidence. LR toolbar defaults unchanged. Commit only intended files; safe-push to main. Verify production separately before saying live. |

## Current verification checkpoint

98 focused tests pass across8 files: builder33, academy launcher20, player save safety18, study aids5, session API11, footer5, preferences persistence5, real toolbar selection1. Production build and canonical-content exclusion pass. Focused lint has0 errors with existing react-refresh export warnings. Earlier typecheck passed; the safe-push gate must rerun against the final committed slice.

Browser: manual PrepTest111 search/pick/preview gives exact1passage6questions; unrelated homework absent. Builder/page/list widths at1920/1024/700/390 have no horizontal overflow. Player tested at1920/1366/1024/700/390: passage has no horizontal overflow; the sampled French memoir passage fully fits at1920x900. Longer/narrower cases require vertical scroll as expected. At125% local font becomes22.5px; reopening marks Large selected. Preferences bounds:390x844 left21/right277/top307/bottom832.4, internally scrollable;1366x768 left1066/right1322/top133/bottom670.6.

Still unverified: official-key authority for the discrepancy, annotation account-race reproduction, fault-injected real backend lifecycle, full all-filter intersection sweep, physical phone/cross-device behavior, complete keyboard/screen-reader/200% zoom and contrast audit, competitor note/discussion persistence, and production publication. These gates remain open and must not be described as completed by the layout release.

## 2026-10-08: RC question selection needs its own repair

Scope: signed-in production LSAT U Practice RC question-jump row compared with LSAT Lab Question Finder in the Codex in-app browser. This is a different component from the manual passage builder repaired in the preceding checkpoint. This follow-up changes documentation only. No question choice, answer, session creation, or deletion was performed. Browser checks covered selecting PT140 / Section4 RC, opening the question menu, and opening the adjacent finder. Desktop layout was observed at the native sidecar width and at a1522x845 emulated viewport. The screenshot's clipping was not reproduced as page overflow at that desktop viewport: document width1507px, client width1507px. Treat the original clipping as an unresolved layout condition, not a proven fixed-width overflow cause.

### Findings and comparison

| ID / priority | LSAT U evidence | LSAT Lab comparison | Required change |
|---|---|---|---|
| RC-18 / P1 | PT140S4 dropdown has25 questions; Q3 and Q17 are absent. Both exist in the complete passage bank. Full bank2150 questions versus published search/address indexes1602, a548-question gap. Source audit found current generators include recovered questions; published artifacts are stale. | Finder has all27 official questions, including3 and17. | Regenerate both indexes from the current bank, validate every address and ID, and add a bank-to-index completeness gate. Preserve answer keys and attempts. |
| RC-19 / P1 | Choosing a question immediately navigates; dropdown value is always empty. Source trace shows RC player creates a saved session for the entire passage. A control labelled Question number does not disclose this. | Finder keeps a selection and exposes a separate Find question action, disabled until ready. | Keep the chosen address visible. Open a read-only question/passage preview with an explicit Open question action. Starting a saved passage drill must be a separate deliberate action. |
| RC-20 / P1 | The adjacent Find a question button opens another finder. PT140 / Section4 selections are not carried into it; its section returns to Pick a test. The button visually appears to submit the row but does something else. | Finder has one coherent test/section/question sequence and one submit action. | Consolidate lookup into one finder. If both entry points remain, they must open the same surface with the same selected address. |
| RC-21 / P2 | Flat repeated labels Question1 Passage1, Question2 Passage1, etc. No passage headers, passage title, or question-range summary. The menu overlays the large hero and hides its controls. | Questions are grouped under Passage1 through Passage4; items are short numerals with a visible scrollbar. | Group by passage with title and official range. Use concise question labels, preserve full accessible addresses, and show a bounded scrollable menu with an obvious scroll affordance. |
| RC-22 / P2 | Create is legible; In progress, Completed and Saved sets use rgb(244,241,234) on the pale page and are nearly invisible despite being interactive. | The inspected Lab drill tabs remain visibly distinguishable. | Correct inactive text tokens and verify contrast, active state and keyboard focus on this actual light surface. Do not copy dark-card text tokens into light navigation. |
| RC-23 / P2 | Three equally stretched fields, a separate large finder pill, LR/RC switch and a large promotional hero compete for space. On narrow screens source CSS retains three columns. At desktop the row fits, but takes more prominence than the underlying task warrants. | Finder is a compact titled modal; background is dimmed and unrelated controls do not compete within the active task. | Put one compact Open a question entry beside a clear Create RC drill action. Move lookup fields into the shared finder. Wrap controls by available container width rather than squeezing three columns. Replace the hero with a compact task choice. |
| RC-24 / P2 | Section remains unselected after choosing a test even when RC has one available section. Bank switches do not reset the stored test/section pair. A derived section prevents a wrong-bank launch but leaves unresolved stored state. | Lab explicitly presents its test and section choices. Its cross-bank reset behavior was not audited. | Automatically select a unique RC section. Clear dependent values on genuine bank/test changes and explain unavailable content locally. |
| RC-25 / P2 | RC question jump drops returnTo while LR preserves it; RC exit defaults to /rc. | Lab comparison not exercised for return routing. | Preserve the originating Practice page and section through lookup, preview and exit. |
| RC-26 / P2 | Conditional Indicators Refresher appears under Assigned work on the RC landing page. It is unrelated homework, not a previous RC selection leaking into the builder. Its placement still distracts from creating RC work. | Inspected Lab finder isolates the active task, even with other study work behind it. | Keep assigned work in My Work or a collapsed secondary area during creation. Label any mixed homework section clearly rather than implying RC-only relevance. |

### Implementation order and acceptance

1. Repair index completeness first. PT140S4 must expose exactly27 unique official addresses, including Q3/id1590 and Q17/id1604. Verify all2150 current bank questions survive search/address generation; reject duplicates or silent omissions. The earlier answer-key authority gate remains separate and open.
2. Consolidate the two finder entry points and separate lookup from saved drill creation. Selecting an option must retain the selected label without navigation or persistence. Opening and closing a preview must create no session or attempt. Starting a drill must make the passage count and question count explicit.
3. Apply passage grouping, concise labels, readable inactive navigation and compact layout. Automatically select a sole RC section; reset dependent choices when bank/test changes; preserve returnTo. Show a usable retry when index loading fails.
4. Verify the same address in the embedded entry and shared finder; keyboard selection, Escape and focus return; desktop, narrow and docked widths;200% text resize; no obscured submit action or horizontal overflow. Repeat the reported screenshot condition before declaring clipping fixed.

Local browser evidence: `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-selection-lsatu-2026-10-08.png` and `rc-selection-lsatlab-2026-10-08.png` in the same directory. These are machine-local evidence, not portable repository assets. Source-confirmed launch behavior was deliberately not exercised against the live account. No audit finding above is marked fixed.
# Implemented persistence contract (2026-10-09)

Annotation editing is gated until the signed-in actor's passage marks have loaded successfully. A failed read leaves marks disabled and exposes Retry; answer selection remains available. Pending marks are stored by actor and passage, and flags by actor, session and question. Each pending intent has a unique token. Saves are serialized across hook remounts, and an acknowledgement clears only its exact token, never a newer repeated value. Saved means the returned owner and content match the request. Failed saves retain intent and expose a deliberate retry.

Question lookup uses a dedicated read-only route. Opening, reloading and closing it does not create a drill or mount answer, annotation, timer or preference writers. Starting is a separate disclosed action for the whole passage. Its stable request UUID survives a lost response; actor and preview context are checked before navigation. Official question positions are distinct from drill ordinals throughout the reader and overview.
