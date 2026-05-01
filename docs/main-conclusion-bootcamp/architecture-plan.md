# Architecture Plan — Gate 3

**Status:** Draft. Pending Joshua's sign-off. Locks at Gate 3 close.
**Author:** Claude Code, 2026-04-30.

**Inputs (approved):**
- [Project Scaffolding Plan](scaffolding-plan.md) — Gate 1 lock (tech stack, folder structure, persistence interface sketch, design tokens).
- [CONTENT_INVENTORY.json](parity/CONTENT_INVENTORY.json) — Gate 2 Table A (~173 preserved items).
- [CONTENT_PARITY_MAP.json](parity/CONTENT_PARITY_MAP.json) — id → source → route → component.
- [NOT_INCLUDED_IN_V1.md](parity/NOT_INCLUDED_IN_V1.md) — Gate 2 Table B.
- `PROJECT_MEMORY.md` Decisions Log — all Gate 1 + Gate 2 locked decisions.

**Deferred inputs (proceed without; flag at every UI surface):**
- **G3.UX-RESEARCH** — UX/UI Deep Research packet pending from Joshua. Architecture Plan locks structure; UX research will refine surface details.
- **G1.4** — Causation Station + Abstraction URLs pending from Joshua. Flag at MC-LSN-* (Module 1 lessons surface) + MC-DIA-* (Module 6 diagnostics surface) where they'd inform layout.

**Hard constraint:** No production code lands until Joshua signs off this Architecture Plan (handoff §7).

---

## §1 — Component tree

The complete v1 component inventory. Three tiers: primitives → domain components → module pages. Each entry shows TSX path, props sketch, source-backed slot props (per handoff §6 SBSR), and reused-from notes.

### §1.1 — Primitives (`src/components/primitives/`)

21st.dev MCP supplies these (per handoff §6A Rule 1). All dark-mode default; warm-gold accent only on commit/selection.

| Component | Path | Props sketch | Source-backed slots | Reused from |
|---|---|---|---|---|
| Button | `primitives/Button.tsx` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'icon'`, `loading?: boolean`, `disabled?: boolean` | — | Fey.com inset-shadow technique (scaffolding §6 known-good primitive) |
| Tab | `primitives/Tab.tsx` | `tabs: {id, label}[]`, `activeId`, `onChange` | — | Linear |
| SegmentedControl | `primitives/SegmentedControl.tsx` | `options`, `value`, `onChange` | — | iOS HIG / spec §3.2.4 |
| Drawer | `primitives/Drawer.tsx` | `open`, `side: 'right'`, `onClose`, `children` | — | Linear right panel |
| CommandPalette | `primitives/CommandPalette.tsx` | `commands: Command[]`, `recents` | accepts source-backed-slot IDs as command targets | Linear / Raycast |
| Chip | `primitives/Chip.tsx` | `label`, `tone: 'role-conclusion' \| 'role-premise' \| ... \| 'accent' \| 'neutral'`, `interactive?: boolean` | accepts `data-source-id` | spec §3.2.2 indicator chip |
| Badge | `primitives/Badge.tsx` | `label`, `tone`, `size` | — | Linear status pill |
| Input | `primitives/Input.tsx` | standard text input | — | — |
| Textarea | `primitives/Textarea.tsx` | grows to content | — | — |
| Toggle | `primitives/Toggle.tsx` | `pressed`, `onChange`, `label` (accessible) | — | role="switch" semantics per spec §3.7.2 |
| Tooltip | `primitives/Tooltip.tsx` | `content`, `placement` | — | — |
| Modal | `primitives/Modal.tsx` | `open`, `onClose`, ESC-closes | — | spec §3.7.2 ESC closes any modal |
| FocusRing | `primitives/FocusRing.tsx` | applied via CSS class | — | spec §3.7.2: 2px gold outline + 2px offset |
| KeyboardCheatSheet | `primitives/KeyboardCheatSheet.tsx` | `bindings: {key, label}[]` | — | Superhuman cheat sheet |
| AuditRow | `primitives/AuditRow.tsx` | `letter: A-E`, `correct: boolean`, `verdict: string`, `reason: string`, `traitId?: TrapTraitId` | `question_id`, `correct_choice_id`, `trait_tag` | spec §3.2.3 Coach's Note answer audit |
| CoachNoteCard | `primitives/CoachNoteCard.tsx` | `structureMap`, `coreMove`, `audit: AuditRow[]` | `question_id` | spec §3.2.3 |
| ReferenceCard | `primitives/ReferenceCard.tsx` | `category`, `borderColor`, `chips: string[]`, `example: string` | `reference_id` | spec §3.2.2 |
| LoadingSkeleton | `primitives/LoadingSkeleton.tsx` | shape variants | — | — |
| EmptyState | `primitives/EmptyState.tsx` | `title`, `body`, `cta?` | — | — |
| ErrorState | `primitives/ErrorState.tsx` | `title`, `body`, `retry?` | — | — |
| SuccessState | `primitives/SuccessState.tsx` | `title`, `body` | — | — |
| LockedState | `primitives/LockedState.tsx` | `blockedBy: string`, `unlockHint: string`, `gotoBlockerCta: () => void` | — | per §5 module ordering enforcement |
| Toast | `primitives/Toast.tsx` | `message`, `tone`, `auto-dismiss-ms` | — | — |
| FocusMode | `primitives/FocusMode.tsx` | wraps content; fades inactive cards on scroll | — | LR Field Manual prototype |

### §1.2 — Domain components (`src/components/`)

Source-backed-slot props are typed against `src/types/source-slots.ts` (handoff §6 SBSR).

#### `workspace-shell/` — three-zone shell (Linear-style)

| Component | Path | Props sketch | Source-backed slots | Reused from |
|---|---|---|---|---|
| WorkspaceShell | `workspace-shell/WorkspaceShell.tsx` | composes left rail + canvas + right drawer | — | Linear |
| LeftRail | `workspace-shell/LeftRail.tsx` | renders module nav + named-tools quick list + review-queue badge + command-palette trigger | — | LR Field Manual sidebar nav |
| Canvas | `workspace-shell/Canvas.tsx` | `<Outlet />` for current route | — | — |
| RightDrawer | `workspace-shell/RightDrawer.tsx` | `mode: 'audit' \| 'coach' \| 'reference' \| 'journal'`, `payload`, `open`, `onClose`. **Opens in-place; no URL change** (per §9 lock). 180ms slide. | `reference_id`, `question_id` | Linear / Readwise |
| ModuleProgressRing | `workspace-shell/ModuleProgressRing.tsx` | `moduleId`, `pct: 0-100` | — | LR Field Manual |
| ReviewQueueBadge | `workspace-shell/ReviewQueueBadge.tsx` | `count`, `nextDueAt` | — | Anki |

#### `stage-gate/` — universal drill wrapper (NT-Stage-Gate-Tracker)

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| StageGateTracker | `stage-gate/StageGateTracker.tsx` | `drillId`, `stages: StageConfig[]`, `currentStage`, `onComplete` | `drill_id`, `attempt_id` | mainconclusionrebuttalvsfirst (PR-mainconclusionrebuttalvsfirst, S/100% codebase, lifted verbatim) |
| StageButton | `stage-gate/StageButton.tsx` | `stage: 1-4`, `state: 'locked' \| 'active' \| 'in-progress' \| 'passed'`, `onClick` | — | MC Companion |
| StageQuestionCard | `stage-gate/StageQuestionCard.tsx` | `question`, `userResponse`, `onSubmit` | `question_id`, `source_item_id` | MC Companion |
| AutoSaveTag | `stage-gate/AutoSaveTag.tsx` | `lastSavedAt` | — | MC Companion |
| PdfReportButton | `stage-gate/PdfReportButton.tsx` | `drillId`, `attemptId` — triggers `lib/pdf/StageGatePdfReport` via `window.print()` against hidden iframe | `attempt_id` | MC Companion (S codebase) |

#### `indicator-vault/` — Module 2 surface + chip primitives

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| CategoryCard | `indicator-vault/CategoryCard.tsx` | `category: IndicatorCategory`, `borderColor`, `chips`, `example`, `descriptor` | `reference_id` | spec §3.2.2 |
| ChipRow | `indicator-vault/ChipRow.tsx` | `words: string[]`, `tone` | — | spec §3.2.2 |
| IndicatorChip | `indicator-vault/IndicatorChip.tsx` | `word`, `category`, `interactive?: boolean` | `indicator_id` | spec |

#### `coachs-note/` — Coach's Note surface (NT-Coach-Note)

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| CoachsNote | `coachs-note/CoachsNote.tsx` | `questionId`, `view: 'narrative' \| 'structured'`, default narrative | `question_id` | spec §3.2.3 |
| AnswerKeyToggle | `coachs-note/AnswerKeyToggle.tsx` | `view`, `onChange` — persists across questions per session | — | spec §4.4 |

#### `x-ray-scan/` — role-color overlay (NT-X-Ray-Scan)

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| XRayScanToggle | `x-ray-scan/XRayScanToggle.tsx` | `pressed`, `onToggle`, `aria-live="polite"` | — | logicalreasoningfoundation prototype |
| RoleColorOverlay | `x-ray-scan/RoleColorOverlay.tsx` | `sentences: {text, role}[]`, `revealed: boolean` | — | LR Field Manual |

#### `trap-master/` — 7-trait diagnostic (NT-Trap-Master)

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| TraitTag | `trap-master/TraitTag.tsx` | `traitId: TrapTraitId`, `interactive?: boolean` (opens deep dive). aria-label per spec §3.7.3 | `trap_tag` | spec §3.2.9 |
| TraitDeepDive | `trap-master/TraitDeepDive.tsx` | `traitId` — renders fingerprint + PT example + defense | — | spec §4.3 trait card |
| TraitPreviewGrid | `trap-master/TraitPreviewGrid.tsx` | renders all 7 traits as a preview grid (used in MC-LSN-1.12) | — | spec §4.3 |
| TraitDiagnostic | `trap-master/TraitDiagnostic.tsx` | `attempts: SimulatorAttempt[]` — bar chart of accuracy by trait | — | spec §4.6, §6.3 |

#### `argument-structure-map/` — SVG visuals

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| CakeOnBlocks | `argument-structure-map/CakeOnBlocks.tsx` | `state: 'stable' \| 'unstable' \| 'collapsed'`, `onClick` (toggles) | — | logicalreasoningfoundation Gap Simulator |
| ChainMap | `argument-structure-map/ChainMap.tsx` | `claims: Claim[]`, `userArrows: Arrow[]`, `correctArrows`, drag-arrow interface | `question_id` | invented; spec §3.3.1 |
| GapSimulator | `argument-structure-map/GapSimulator.tsx` | wraps CakeOnBlocks for Drill 3.5 stage 1 | — | LR Field Manual |

#### `cluster-decomposer/` — Module 5 mechanic

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| Decomposer | `cluster-decomposer/Decomposer.tsx` | `sentence`, `specifiers: Specifier[]`, `onTap`, `liftedClauses` | — | spec §3.2.8 |
| SpecifierTap | `cluster-decomposer/SpecifierTap.tsx` | `word`, `position`, `lifted: boolean` | — | spec |
| ResolvedThoughtCard | `cluster-decomposer/ResolvedThoughtCard.tsx` | `originalClause`, `resolvedThought`, `pronounAntecedent` | — | spec |

#### `rr-recorder/` — Drill 3.8 surface

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| Recorder | `rr-recorder/Recorder.tsx` | `sectionId` — desktop live mic via `lib/audio/MediaRecorder` | `drill_id` | invented; spec §3.6.2 |
| ReviewForm | `rr-recorder/ReviewForm.tsx` | `recordingId`, `transcript`, `flags: {leftOut, added, mischaracterized}` (v1: leftOut+added auto-flagged; v1.5: all three auto). Three-column layout | — | R&R Drill Review Form.pdf (HW-RR_Drill_Review_Form) |
| AudioPlayer | `rr-recorder/AudioPlayer.tsx` | `blobKey`, skip-silence toggle | — | spec §3.6.2 |
| MobileTextFallback | `rr-recorder/MobileTextFallback.tsx` | text-only flow per G2.MOBILE — typed rephrase + Skeptic's Ear Check + cumulative recall typed | `drill_id` | per G2.MOBILE resolution |

#### `ai-tutor/` — global drawer

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| Drawer | `ai-tutor/Drawer.tsx` | `currentContext: {routeId, questionId?, traitId?}`, `open`, `onClose` | accepts `question_id`, `trait_tag` | invented; spec §6.8 |
| SuggestedQuestionChip | `ai-tutor/SuggestedQuestionChip.tsx` | `prompt`, `onClick` — fires templated route | — | spec §6.8 |
| RouteResolver | `ai-tutor/RouteResolver.tsx` (logic only) | matches free-text against templated routes; falls back to "Try one of these instead" interstitial (per §9 lock) | — | invented |

#### `smart-hints/` — stuck-state coaching (MC-DIA-6.6)

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| HintTrigger | `smart-hints/HintTrigger.tsx` | `dwellMs`, `threshold` — fires after `>90s no-select` or `>30s hover-no-lock` | — | spec §6.6 |
| HintCard | `smart-hints/HintCard.tsx` | `text`, `referenceLink?` | `reference_id` | spec |

#### `question/` — Simulator question rendering

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| QuestionCard | `question/QuestionCard.tsx` | `question: SimulatorQuestion`, `onSubmit`, `prePhraseInputOptional` | `question_id`, `source_item_id`, `correct_choice_id` | spec §3.2.4 + §4.8 |
| AnswerChoiceRow | `question/AnswerChoiceRow.tsx` | `letter`, `text`, `state: 'default' \| 'selected' \| 'committed' \| 'correct' \| 'wrong'`, `traitId?: TrapTraitId` (revealed post-submit) | `correct_choice_id`, `trap_tag` | spec |

#### `progress/` — module/lesson/drill progress visuals

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| ModuleProgressRing | (re-export from workspace-shell) | — | — | — |
| MasteryBadge | `progress/MasteryBadge.tsx` | `level: 'novice' \| 'practiced' \| 'mastered'` | — | LR Field Manual |

#### `named-tools/` — lexicon surface

| Component | Path | Props sketch | Slots | Reused from |
|---|---|---|---|---|
| NamedToolEntry | `named-tools/NamedToolEntry.tsx` | `toolId: NamedToolId`, renders What / Where / Source | `named_tool_id` | spec §named_tools_lexicon.md |
| NamedToolList | `named-tools/NamedToolList.tsx` | `tools: NamedToolEntry[]` — single render of the 15 (per G1.2 no-double-counting) | — | rules/named_tools_lexicon.md |

### §1.3 — Module pages (`src/modules/`)

#### Module 1 — Lessons (`modules/lessons/`)

| Page | Path | Renders | Maps to inventory IDs |
|---|---|---|---|
| LessonsIndex | `lessons/LessonsIndex.tsx` | grid of 12 lessons + capstone, with progress | M1 |
| Lesson | `lessons/Lesson.tsx` | dynamic per `:lessonId` — voice-led prose + guided examples + checkpoint qs + named-tool callouts | MC-LSN-1.1 through MC-LSN-1.12 |
| Capstone | `lessons/Capstone.tsx` | M1.13 calibration drill; uses `<QuestionCard>` + `<CoachsNote>` + `<TraitTag>`; sources from `data/calibration.generated.json` (per §8 sourcing rules) | MC-LSN-1.13 |

#### Module 2 — Reference (`modules/reference/`)

| Page | Path | Maps to inventory IDs |
|---|---|---|
| ReferenceIndex | `reference/ReferenceIndex.tsx` | M2 |
| IndicatorVault | `reference/IndicatorVault.tsx` | MC-REF-2.A |
| TwoPartCheck | `reference/TwoPartCheck.tsx` | MC-REF-2.B |
| FABS | `reference/FABS.tsx` | MC-REF-2.C |
| StimulusTendencies | `reference/StimulusTendencies.tsx` | MC-REF-2.D |
| ConclusionTypes | `reference/ConclusionTypes.tsx` | MC-REF-2.E |
| RebuttalStructure | `reference/RebuttalStructure.tsx` | MC-REF-2.F |
| ThreeTraps | `reference/ThreeTraps.tsx` | MC-REF-2.G |
| PronounLibrary | `reference/PronounLibrary.tsx` | MC-REF-2.H |
| ConcessionDecoder | `reference/ConcessionDecoder.tsx` | MC-REF-2.I |
| QuickReferenceCard | `reference/QuickReferenceCard.tsx` | MC-REF-2.J (printable; uses `lib/print/QuickReferenceCard.print.tsx`) |
| NamedToolEntry (per-tool route) | re-export from `components/named-tools/` | NT-* (15 named tools) |

(MC-REF-2.K is a behavior — RightDrawer reference overlay handler — not a standalone page.)

#### Module 3 — Drills (`modules/drills/`)

| Page | Path | Mechanic | Maps to inventory IDs |
|---|---|---|---|
| DrillsIndex | `drills/DrillsIndex.tsx` | grid of 9 drills with locked/in-progress/passed status | M3 |
| IndicatorWordID | `drills/IndicatorWordID.tsx` | tap-category-on-word (4 stages) | MC-DRL-3.1 |
| XRayDrill | `drills/XRayDrill.tsx` | tap-sentence + assign-role + X-Ray reveal | MC-DRL-3.2 |
| FirstSentenceReading | `drills/FirstSentenceReading.tsx` | read-only, no scoring | MC-DRL-3.3 |
| RebuttalStageGate | `drills/RebuttalStageGate.tsx` | type-toggle + reason + restated conclusion + self-grade. **Gates `/simulator/*` per §5.** | MC-DRL-3.4 |
| ChainMapping | `drills/ChainMapping.tsx` | drag-arrow chain mapping | MC-DRL-3.5 |
| DesignTheConclusion | `drills/DesignTheConclusion.tsx` | type valid + invalid; AI evaluates via `lib/ai-templates/whimsical-evaluator.ts` (per §7) | MC-DRL-3.6 |
| PronounReplacement | `drills/PronounReplacement.tsx` | type replaced conclusion; AI verifies | MC-DRL-3.7 |
| RRDrill | `drills/RRDrill.tsx` | desktop: live mic; mobile: typed fallback (per G2.MOBILE) | MC-DRL-3.8 |
| NestedClaims | `drills/NestedClaims.tsx` | bracket nested claim + underline IC + TRUE/FALSE hybrid | MC-DRL-3.9 |

#### Module 4 — Question Simulator (`modules/simulator/`)

| Page | Path | Maps to inventory IDs |
|---|---|---|
| SimulatorShell | `simulator/SimulatorShell.tsx` | MC-SIM-4.8 |
| Overview | `simulator/Overview.tsx` | MC-SIM-4.1 |
| QuestionBank | `simulator/QuestionBank.tsx` | MC-SIM-4.2; renders `<QuestionCard>` over the 20 canonical |
| TrapMaster | `simulator/TrapMaster.tsx` | MC-SIM-4.3; renders 7 trait cards |
| AnswerKeyView | (composed) | MC-SIM-4.4; toggle in `<CoachsNote>` |
| HardQuestionMode | `simulator/HardQuestionMode.tsx` | MC-SIM-4.7 |

(MC-SIM-4.5 = `<CoachsNote>`, embedded; MC-SIM-4.6 = `<TraitDiagnostic>`, surfaces in M6.)

#### Module 5 — Hard Sentences (`modules/hard-sentences/`)

| Page | Path | Maps to inventory IDs |
|---|---|---|
| HardSentencesIndex | `hard-sentences/HardSentencesIndex.tsx` | M5 |
| Why | `hard-sentences/Why.tsx` | MC-HSL-5.1 |
| WhatIsCluster | `hard-sentences/WhatIsCluster.tsx` | MC-HSL-5.2 |
| Specifiers | `hard-sentences/Specifiers.tsx` | MC-HSL-5.3 |
| AlexJordanWalkthrough | `hard-sentences/AlexJordanWalkthrough.tsx` | MC-HSL-5.4 |
| OptionalVsCore | `hard-sentences/OptionalVsCore.tsx` | MC-HSL-5.5 |
| Practice | `hard-sentences/Practice.tsx` | MC-HSL-5.6 |
| Decomposer (route) | re-export `components/cluster-decomposer/Decomposer.tsx` | MC-HSL-5.7 |
| Capstone | `hard-sentences/Capstone.tsx` | MC-HSL-5.8; sources from `data/calibration.generated.json` |

#### Module 6 — Diagnostics (`modules/diagnostics/`)

| Page | Path | Maps to inventory IDs |
|---|---|---|
| DiagnosticsIndex | `diagnostics/DiagnosticsIndex.tsx` | M6 |
| Philosophy | `diagnostics/Philosophy.tsx` | MC-DIA-6.1 |
| Dashboard | `diagnostics/Dashboard.tsx` | MC-DIA-6.3 (uses `<TraitDiagnostic>`) |
| Recommendations | `diagnostics/Recommendations.tsx` | MC-DIA-6.4 (uses `lib/recommendations/decisionTree.ts`) |
| RRReview | `diagnostics/RRReview.tsx` | MC-DIA-6.7 (uses `<ReviewForm>`) |
| TraitDiagnostic (route) | re-export | MC-DIA-* (trait profile) |
| MistakeProfile | `diagnostics/MistakeProfile.tsx` | new — surfaces `mistakes_profile` |
| SrsQueue | `diagnostics/SrsQueue.tsx` | new — surfaces `srs_queue` |

(MC-DIA-6.2 is a wrapper applied to drills, not a standalone page. MC-DIA-6.5/6.6/6.8 are inline behaviors. MC-DIA-6.9/6.10 are infrastructure; not user-facing.)

### §1.4 — Type-checked source-backed slots

`src/types/source-slots.ts`:

```ts
export type SourceItemId = string; // uuid
export type QuestionId = `MC-SIM-Q${number}` | `MC-DRL-${string}-Q${number}` | `MC-CAL-${string}-Q${number}`;
export type LessonId = `MC-LSN-${number}.${number}`;
export type ReferenceId = `MC-REF-${string}`;
export type DrillId = `MC-DRL-${string}`;
export type NamedToolId = `NT-${string}`;
export type IndicatorId = `IND-${string}`;
export type WorkedExampleId = `EX-${string}`;
export type VoicePassageId = `VP-${string}`;
export type TrapTraitId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';
export type ParityStatus = 'specced' | 'scaffolded' | 'implemented' | 'verified' | 'drift';
export type ReviewQueueStatus = 'queued' | 'due' | 'completed' | 'lapsed';

export interface SourceBackedSlots {
  source_item_id?: SourceItemId;
  question_id?: QuestionId;
  lesson_id?: LessonId;
  reference_id?: ReferenceId;
  named_tool_id?: NamedToolId;
  trap_tag?: TrapTraitId;
  correct_choice_id?: string;
  review_queue_status?: ReviewQueueStatus;
  parity_status?: ParityStatus;
}
```

ESLint custom rule (`no-bare-question-render`) blocks any `<*Card>` or `<*Question>` component that doesn't extend `SourceBackedSlots`. Components that visually hide source identity are rejected (handoff §6 SBSR).

---

## §2 — Route map

React Router v6 data-router. Loaders pull via the `Persistence` interface; actions write back. Right-drawer overlays open in-place (no URL change) per §9 lock.

```ts
// src/routes.tsx (sketch)
const router = createBrowserRouter([
  { path: '/', element: <WorkspaceShell />, children: [
    { index: true, element: <ModuleIndex /> },

    // M1 Lessons
    { path: 'lessons', children: [
      { index: true, element: <LessonsIndex /> },
      { path: ':lessonId', element: <Lesson />, loader: lessonLoader },
      { path: '1.13', element: <Capstone moduleId="M1" /> },
    ]},

    // M2 Reference (always accessible)
    { path: 'reference', children: [
      { index: true, element: <ReferenceIndex /> },
      { path: 'indicators', element: <IndicatorVault /> },
      { path: '2-part-check', element: <TwoPartCheck /> },
      { path: 'fabs', element: <FABS /> },
      { path: 'stimulus-tendencies', element: <StimulusTendencies /> },
      { path: 'conclusion-types', element: <ConclusionTypes /> },
      { path: 'rebuttal-structure', element: <RebuttalStructure /> },
      { path: 'three-traps', element: <ThreeTraps /> },
      { path: 'pronoun-library', element: <PronounLibrary /> },
      { path: 'concession-decoder', element: <ConcessionDecoder /> },
      { path: 'quick-card', element: <QuickReferenceCard /> },
      { path: 'named-tools', element: <NamedToolList /> },
      { path: 'named-tools/:toolId', element: <NamedToolEntry /> },
    ]},

    // M3 Drills
    { path: 'drills', children: [
      { index: true, element: <DrillsIndex /> },
      { path: '3.1', element: <IndicatorWordID /> },
      { path: '3.2', element: <XRayDrill /> },
      { path: '3.3', element: <FirstSentenceReading /> },
      { path: '3.4', element: <RebuttalStageGate /> },         // gates §5
      { path: '3.5', element: <ChainMapping /> },
      { path: '3.6', element: <DesignTheConclusion /> },
      { path: '3.7', element: <PronounReplacement /> },
      { path: '3.8', element: <RRDrill /> },
      { path: '3.9', element: <NestedClaims /> },
    ]},

    // M4 Simulator — gated by Drill 3.4 (per §5)
    { path: 'simulator', element: <LockedRoute requirement="MC-DRL-3.4" />, children: [
      { index: true, element: <SimulatorShell /> },
      { path: 'bank', element: <QuestionBank /> },
      { path: 'trap-master', element: <TrapMaster /> },
      { path: 'trap-master/:traitId', element: <TraitDeepDive /> },
      { path: 'hard-mode', element: <HardQuestionMode /> },
    ]},

    // M5 Hard Sentences
    { path: 'hard-sentences', children: [
      { index: true, element: <HardSentencesIndex /> },
      { path: 'why', element: <Why /> },
      { path: 'what-is-cluster', element: <WhatIsCluster /> },
      { path: 'specifiers', element: <Specifiers /> },
      { path: 'decomposition-method', element: <AlexJordanWalkthrough /> },
      { path: 'optional-vs-core', element: <OptionalVsCore /> },
      { path: 'practice', element: <Practice /> },
      { path: 'decomposer', element: <Decomposer /> },
      { path: 'capstone', element: <Capstone moduleId="M5" /> },
    ]},

    // M6 Diagnostics (always accessible; populates after first calibration)
    { path: 'diagnostics', children: [
      { index: true, element: <DiagnosticsIndex /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'recommendations', element: <Recommendations /> },
      { path: 'rr-review', element: <RRReview /> },
      { path: 'trait-profile', element: <TraitDiagnostic /> },
      { path: 'mistake-profile', element: <MistakeProfile /> },
      { path: 'srs', element: <SrsQueue /> },
    ]},

    // Cross-cutting
    { path: 'journal', element: <JournalDrawer /> },
    { path: 'settings', element: <Settings /> },
  ]}
]);
```

**Loaders/actions (sketch):**

| Route | Loader | Action |
|---|---|---|
| `/lessons/:lessonId` | reads `lesson_progress` + lesson record from `data/lessons.generated.json` | writes `lesson_progress.viewed_at` |
| `/lessons/1.13` (capstone) | reads `module_progress` + 10 calibration items from `data/calibration.generated.json` (M1) | writes `calibration_attempts` + triggers `mistakes_profile` seed + `srs_queue` initial population |
| `/drills/3.4` | reads `drill_stagegate` for current attempt; reads canonical 20 from `data/simulator-questions.generated.json` | writes `drill_stagegate.{attempt,stage,score,passed}`. On all-stages-passed: invokes `unlockNext('MC-DRL-3.4')` → unlocks `/simulator/*` |
| `/simulator/bank` | wraps in `<LockedRoute requirement="MC-DRL-3.4">`; redirects to `/drills/3.4` if not passed | writes `simulator_attempts` + `traps_tag` + updates `mistakes_profile` |
| `/simulator/trap-master/:traitId` | reads `data/trap-traits.generated.json` | — |
| `/diagnostics/dashboard` | reads `simulator_attempts` + `drill_stagegate` + `calibration_attempts`; surfaces placeholder state if no calibration completed yet | — |
| `/diagnostics/srs` | reads `srs_queue` filtered by `due_at <= now()` | writes `srs_queue.{ease,interval,due_at,last_grade,lapses}` (SM-2 update) |

TanStack Query keys: `['lesson', lessonId]`, `['drill-stagegate', drillId, attemptId]`, `['simulator-attempts', userId]`, `['srs-queue', userId]`, `['module-progress', userId]`. Stale-while-revalidate; optimistic writes.

---

## §3 — Persistence adapter sketch

The `Persistence` interface from [scaffolding-plan.md §3](scaffolding-plan.md), expanded to the full v1 record schema.

### §3.1 — Interface

```ts
// src/persistence/Persistence.ts
export interface Persistence {
  get<T>(table: string, id: string): Promise<T | null>;
  set<T>(table: string, id: string, record: T): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  list<T>(table: string, filter?: Partial<T>): Promise<T[]>;

  putBlob(key: string, blob: Blob): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  removeBlob(key: string): Promise<void>;

  transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T>;
}

export interface PersistenceTx {
  get<T>(table: string, id: string): Promise<T | null>;
  set<T>(table: string, id: string, record: T): Promise<void>;
}
```

### §3.2 — Implementations

**`LocalStoragePersistence`** — KV via `student:{userId}:{table}:{id}` keys. JSON-serialized; Zod-validated on read and write. Throws on quota exceeded; emits a UI warning.

**`IndexedDBPersistence`** — `idb` library wrapper. Object stores: one per record table for scalar records over ~200 KB or with frequent reads/writes; one binary blob store for R&R audio. Stores: `users`, `module_progress`, `drill_stagegate`, `simulator_attempts`, `traps_tag`, `mistakes_profile`, `srs_queue`, `rr_recordings_meta`, `rr_reviews`, `journal_entries`, `prefs_user`, `calibration_attempts`. Blob store: `rr_audio` (keyed by `recording_id`).

**`V1Persistence`** — composite that delegates by table:
- `users`, `prefs_user`, `module_progress` → `LocalStoragePersistence` (small, frequent reads).
- everything else (potentially large arrays of attempts) → `IndexedDBPersistence`.
- blobs always → `IndexedDBPersistence`.

**`factory.ts`:**
```ts
export const persistence: Persistence = new V1Persistence(
  new LocalStoragePersistence(),
  new IndexedDBPersistence()
);
// LSAT U absorption: replace export with `new SupabasePersistence(...)`. One-file change.
```

### §3.3 — Record schemas (Zod, in `src/persistence/records.ts`)

UUID v4 ids · ISO 8601 timestamps · every column maps 1:1 to a future Supabase column.

```ts
export const User = z.object({
  id: UuidV4, name: z.string(), started_at: IsoDate, last_seen: IsoDate, settings: z.record(z.unknown()),
});

export const ModuleProgress = z.object({
  id: UuidV4, user_id: UuidV4,
  unlocked_modules: z.array(z.enum(['M1','M2','M3','M4','M5','M6'])),
  unlocked_routes: z.array(z.string()),                 // explicit route ids; source of truth (per §5)
  completed_lessons: z.array(LessonId),
  completed_drills: z.array(DrillId),
  completed_capstones: z.array(z.enum(['M1.13','M5.8'])),
  updated_at: IsoDate,
});

export const LessonProgress = z.object({
  id: UuidV4, user_id: UuidV4, lesson_id: LessonId, viewed_at: IsoDate, checkpoint_responses: z.record(z.unknown()).optional(),
});

export const DrillStageGate = z.object({
  id: UuidV4, user_id: UuidV4, drill_id: DrillId, attempt_id: UuidV4,
  stage: z.number().int().min(1).max(4),
  score: z.number().int().min(0),
  passed: z.boolean(),                                  // 4/5 to pass
  responses: z.array(z.object({question_id: QuestionId, response: z.string(), self_grade: z.enum(['correct','incorrect']).optional()})),
  started_at: IsoDate, completed_at: IsoDate.optional(),
});

export const SimulatorAttempt = z.object({
  id: UuidV4, user_id: UuidV4, question_id: QuestionId,
  picked: z.enum(['A','B','C','D','E']),
  correct: z.boolean(),
  picked_trait_id: TrapTraitId.optional(),              // only if wrong
  pre_phrase: z.string().optional(),                     // optional pre-phrase input
  time_spent_ms: z.number().int(),
  attempted_at: IsoDate,
  confidence_rating: z.enum(['low','medium','high']).optional(),
  reasoning_note: z.string().optional(),
});

export const TrapsTag = z.object({                       // denormalized accuracy projection
  id: UuidV4, user_id: UuidV4, trait_id: TrapTraitId,
  attempts: z.number().int(), correct_count: z.number().int(),
  last_updated_at: IsoDate,
});

export const MistakesProfile = z.object({
  id: UuidV4, user_id: UuidV4,
  by_mechanic: z.record(z.string(), z.object({attempts: z.number(), correct: z.number()})),
  by_trait: z.record(TrapTraitId, z.object({attempts: z.number(), correct: z.number()})),
  recommendations_cached: z.array(z.string()).optional(),
  updated_at: IsoDate,
});

export const SrsQueue = z.object({
  id: UuidV4, user_id: UuidV4, question_id: QuestionId,
  ease: z.number().default(2.5),
  interval_days: z.number().int().default(1),
  due_at: IsoDate,
  last_attempted_at: IsoDate.optional(),
  last_grade: z.enum(['again','hard','good','easy']).optional(),
  lapses: z.number().int().default(0),
  trait_id: TrapTraitId.optional(),
});

export const RRRecordingMeta = z.object({
  id: UuidV4, user_id: UuidV4, drill_id: z.literal('MC-DRL-3.8'),
  blob_key: z.string(),                                  // → rr_audio store
  transcript: z.string().optional(),
  flags: z.object({left_out: z.array(Span), added: z.array(Span), mischaracterized: z.array(Span)}).optional(),
  recorded_at: IsoDate, total_duration_ms: z.number().int(),
  device_class: z.enum(['desktop','mobile-text-fallback']),  // per G2.MOBILE
});

export const RRReview = z.object({
  id: UuidV4, recording_id: UuidV4, reviewed_at: IsoDate,
  per_stimulus: z.array(z.object({question_id: QuestionId, left_out: z.string().optional(), added: z.string().optional(), mischaracterized: z.string().optional()})),
});

export const JournalEntry = z.object({
  id: UuidV4, user_id: UuidV4, anchor: z.union([QuestionId, LessonId, DrillId, NamedToolId, ReferenceId]),
  text: z.string(), created_at: IsoDate,
});

export const PrefsUser = z.object({
  id: UuidV4, user_id: UuidV4,
  reduced_motion: z.boolean().default(false),
  audio_input_device: z.string().optional(),
  audio_retention: z.enum(['keep-forever','auto-purge-90d']).default('keep-forever'),  // G1.6 default
  cheat_sheet_open: z.boolean().default(false),
});

export const CalibrationAttempt = z.object({
  id: UuidV4, user_id: UuidV4,
  calibration_module: z.enum(['M1','M5']),
  question_id: QuestionId,                                // MC-CAL-M1-Q* or MC-CAL-M5-Q*
  picked: z.string(),                                     // for free-text or letter
  correct: z.boolean(),
  picked_trait_id: TrapTraitId.optional(),
  attempted_at: IsoDate,
});
```

### §3.4 — UUID + ISO helpers (`src/lib/ids.ts`)

```ts
export const UuidV4 = z.string().uuid();
export const IsoDate = z.string().datetime();
export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
```

---

## §4 — Build-time corpus import script (per G1.9)

`scripts/import-content.ts`. Runs before `vite build` (CI integration) and on demand (`npm run import`).

### §4.0 — Scope split (per JOSHUA DIRECTIVE 2026-04-30, Rec #2 with constraint)

The pipeline has two roles, deliberately separated:

| Content kind | Pipeline role | Source of truth |
|---|---|---|
| Named tools (15) | **GENERATES** `named-tools.generated.json` | `src/content/named-tools.source.ts` (TS data file authored from `rules/named_tools_lexicon.md` + spec.html §named tools) |
| Indicator vault (6 categories) | **GENERATES** `indicator-vault.generated.json` | `src/content/indicators.source.ts` (TS data file authored from spec.html §2.A) |
| Trap traits (7) | **GENERATES** `traps.generated.json` | `src/content/traps.source.ts` (TS data file authored from spec.html §4.3) |
| Reference sections (11) | **GENERATES** `references.generated.json` (placeholder metadata for v1; full content authored at Gate 4 Module 2) | `src/content/references.source.ts` |
| Simulator canonical 20 | **GENERATES** `simulator.generated.json` (titles + family + source-anchors; stimulus text wires at Module 4 build start) | `src/content/simulator.source.ts` (authored from `Notes/MCFIRST SENTENCE : REBUTTAL.pdf` extraction) |
| Manifest | **GENERATES** `manifest.generated.json` (id → kind → source-paths → content-hashes → output-path → parity-status) | Aggregated from all generated + parity-verified entries |
| **Lessons** | **DOES NOT generate.** Hand-authored at `src/data/lessons.generated.json`. The pipeline reads it and **parity-verifies**: every named-tool callout, every reference callout, every source-citation traces to the manifest. Drift = build error. | Hand-authored. |
| **Calibration items** | **DOES NOT generate.** Hand-authored seed at `src/data/calibration.generated.json`. The pipeline reads it and parity-verifies source-anchor existence + trait-target validity. | Hand-authored seed (M1.13 + M5.8 trait tags locked while M1 voice fresh). |

**Why the split:** Lesson prose carries voice that's authored intentionally (Register 2 whimsical / Register 1 decisive, verbatim worked examples, frequency caps for "the most salvageable"). Auto-generation would risk silent voice drift. Parity verification keeps the pipeline honest without taking authorship away.

**Drift = build error.** If a lesson references `NT-Foo` and `NT-Foo` is not in the manifest, the pipeline fails the build. Same for reference callouts. This catches inventory drift the moment it happens.

### §4.1 — Pipeline (current implementation)

### §4.1 — Pipeline (current shape per scope split)

```
Gate 0 source-access re-check
   ↓
Read src/content/*.source.ts (TS data files; hand-authored from canonical corpus)
   ↓
Validate against Zod schemas (src/content/schemas.ts)
   ↓
Emit: 5 generated content files + 1 manifest
   • src/data/named-tools.generated.json     ← from named-tools.source.ts
   • src/data/indicator-vault.generated.json ← from indicators.source.ts
   • src/data/traps.generated.json           ← from traps.source.ts
   • src/data/references.generated.json      ← from references.source.ts
   • src/data/simulator.generated.json       ← from simulator.source.ts
   • src/data/manifest.generated.json        ← aggregated
   ↓
Parity-verify (read-only):
   • src/data/lessons.generated.json (hand-authored): every NT-* callout + MC-REF-* callout traces to manifest
   • src/data/calibration.generated.json (hand-authored): source_anchor.primary paths exist on disk; trait targets valid
   ↓
Drift = build error.
```

**Future incremental wiring** (replaces TS source files with direct canonical-source parsing as each format gets implemented):

- Markdown → `unified/remark` parser for `rules/*.md`
- DOCX → `mammoth` for `Notes/*.docx` + `Homework/*.docx`
- PDF (text-based) → `pdfjs-dist` for `Notes/*.pdf` + `Homework/*.pdf`
- PDF (image-only) → vision-model OCR per G2.OCR (re-OCR first; re-author on failure)
- HTML → `cheerio` for `Curriculum/Netlify/index (*).html` prototype extraction

When each format wires in, the corresponding `src/content/*.source.ts` becomes generated rather than hand-authored. Schema contract stays stable.

### §4.2 — Vision-model OCR (per G2.OCR)

PDF → page images → vision-model OCR pass. Library: `pdfjs-dist` for page rasterization; vision model called via the build environment's API key (CI secret). Confidence threshold: 0.85. Below threshold → build error with a clear message + path. Per G2.OCR: re-OCR first; re-author only on failure.

**Special cases:**
- **Drill 3.9 (`Intermediate Conclusions & Nested Claims Drill.pdf`)**: image-only A-tier source. OCR runs first. On failure, falls back to `src/content/drill-3.9-fallback.md` (only authored after OCR provably fails).
- **Canonical 20 — Q11 through Q18 (untitled in spec)**: OCR the first 6–8 words of each stimulus from `MCFIRST SENTENCE : REBUTTAL.pdf` → assign as `title`. Idempotent; re-runs produce stable titles.

### §4.3 — Manifest (`src/data/manifest.generated.json`)

One entry per Table A id. Used by Gate 5 parity verification.

```ts
type ManifestEntry = {
  id: string;                                  // MC-LSN-1.1, MC-SIM-Q1, NT-FABS, etc.
  source_paths: string[];                       // canonical paths read
  source_hashes: Record<string, string>;        // sha256 per source path
  importer_version: string;                     // semver of this script
  generated_at: string;                          // ISO 8601
  output_path: string;                           // src/data/*.generated.json#path
  parity_status: 'specced' | 'imported';        // 'imported' once present in output
};
```

### §4.4 — Cache + idempotency

Hash-based cache in `.import-cache/` (gitignored). Re-run skips OCR for unchanged files. Forces re-import via `--force`. Dry-run via `--dry-run` checks all source paths exist (re-runs Gate 0 source-access check) and all schemas validate, without writing outputs.

### §4.5 — CLI (live as of 2026-04-30)

```
npm run import                  # full import + parity verification
npm run import:dry              # Gate 0 + schema validation, no writes
npm run import -- --force       # bypass cache (re-hash all sources)
npm run import:smoke            # smoke-test mode (current target: AP Answer Key)
```

### §4.6 — Live verification (2026-04-30)

First end-to-end pipeline run shipped clean:
- Gate 0 source-access re-check: 10 canonical paths verified.
- 15 named tools · 6 indicator categories · 7 trap traits · 11 reference sections · 20 simulator questions emitted.
- 12 lessons parity-verified (25 verbatim-asset references checked, 0 drift).
- 15 calibration items parity-verified (12 pending OCR — resolves at Capstone.tsx build time).
- 86 manifest entries · 5 generated kinds + 2 parity-verified kinds.
- Output: `src/data/{named-tools,indicator-vault,traps,references,simulator,manifest}.generated.json`.

---

## §5 — Module ordering enforcement (per G2.DRL-3.4)

**Hard constraint:** Drill 3.4 (Stage-Gate) must complete before `/simulator/*` becomes accessible. Architecturally enforced.

### §5.1 — Mechanism

`module_progress.unlocked_routes: string[]` is the source of truth. Never derived ad-hoc. Updated only via `unlockNext(currentRouteId)` — pure function, deterministic, replayable.

### §5.2 — Hook

```ts
// src/hooks/useModuleAccess.ts
export function useModuleAccess(routeId: string): {
  accessible: boolean;
  blocked_by: DrillId | LessonId | null;
  unlock_hint: string | null;
} {
  const progress = useModuleProgress();
  const requirement = ROUTE_REQUIREMENTS[routeId];
  if (!requirement) return { accessible: true, blocked_by: null, unlock_hint: null };
  const accessible = progress.unlocked_routes.includes(routeId);
  return {
    accessible,
    blocked_by: accessible ? null : requirement.blocker,
    unlock_hint: accessible ? null : requirement.hint,
  };
}
```

### §5.3 — Wrapper component

```tsx
// src/components/workspace-shell/LockedRoute.tsx
export function LockedRoute({ requirement, children }: { requirement: DrillId | LessonId, children?: React.ReactNode }) {
  const { accessible, blocked_by, unlock_hint } = useModuleAccess(currentRouteId());
  if (!accessible) return <LockedState blockedBy={blocked_by!} unlockHint={unlock_hint!} gotoBlockerCta={() => navigate(`/drills/${blocked_by}`)} />;
  return <>{children}</>;
}
```

### §5.4 — Unlock rules

```ts
// src/lib/ordering.ts
export const ROUTE_REQUIREMENTS: Record<string, { blocker: DrillId | LessonId, hint: string }> = {
  '/simulator': { blocker: 'MC-DRL-3.4', hint: 'Complete Drill 3.4 (Rebuttal vs First-Sentence Stage-Gate) to unlock the Question Simulator.' },
  '/simulator/bank': { blocker: 'MC-DRL-3.4', hint: 'Complete Drill 3.4 to unlock the Question Simulator.' },
  '/simulator/trap-master': { blocker: 'MC-DRL-3.4', hint: 'Complete Drill 3.4 to unlock the Question Simulator.' },
  '/simulator/hard-mode': { blocker: 'MC-DRL-3.4', hint: 'Complete Drill 3.4 to unlock the Question Simulator.' },
};

export function unlockNext(currentRouteId: string, progress: ModuleProgress): ModuleProgress {
  const additions: string[] = [];
  if (currentRouteId === '/drills/3.4' && allStagesPassed(progress, 'MC-DRL-3.4')) {
    additions.push('/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode');
  }
  // ...other unlock cascades (lessons → drills → capstones)
  return {...progress, unlocked_routes: [...new Set([...progress.unlocked_routes, ...additions])], updated_at: now()};
}
```

### §5.5 — Always-accessible routes

These never gate: `/`, `/lessons` (M1 list — individual lessons unlock per pedagogical-flow rule), `/reference/*` (companion surface — never gates, per spec MC-REF-2.K), `/diagnostics/*` (companion surface — populates after first calibration; placeholder state until then), `/journal`, `/settings`. M1 lessons unlock sequentially (1.1 → 1.2 → ... → 1.13 capstone) but are never *blocked* outright; the index displays current vs upcoming.

### §5.6 — Default unlock (new student)

Initial `module_progress.unlocked_routes = ['/', '/lessons', '/lessons/1.1', '/reference', '/reference/*', '/drills', '/drills/3.1', '/diagnostics', '/diagnostics/philosophy', '/journal', '/settings']`. Lessons 1.2 through 1.13 unlock as previous lesson completes; drills 3.2 through 3.9 unlock as previous drill completes; Simulator unlocks on Drill 3.4 completion; Module 5 unlocks after Module 1 capstone.

---

## §6 — Trap-tag schema (per G2.SIM-4.2-AC)

**Inversion:** Claude drafts all 80 distractors at Gate 4 Module 4 session start; Joshua reviews in batch.

### §6.1 — Schemas (`src/content/schemas.ts`)

```ts
export const TrapTraitId = z.enum(['T1','T2','T3','T4','T5','T6','T7']);
export type TrapTraitId = z.infer<typeof TrapTraitId>;

export const DraftStatus = z.enum(['claude-draft', 'joshua-reviewed', 'locked']);

export const Distractor = z.object({
  question_id: QuestionId,
  letter: z.enum(['A','B','C','D','E']),
  text: z.string().min(20),
  is_correct: z.boolean(),
  trait_id: TrapTraitId.optional(),                      // null for the correct answer
  fingerprint_note: z.string().min(40),                   // why this distractor exemplifies its trait — the "core move" sentence
  audit_voice: z.string().min(2),                         // verdict-style audit: "Too strong" / "Stay narrow" / "Out of scope" / etc.
  draft_status: DraftStatus,
  reauthor_pass: z.number().int().min(0).default(0),
});

export const SimulatorQuestion = z.object({
  id: QuestionId,
  title: z.string(),
  structure_family: z.enum(['First-Sentence','Rebuttal']),
  stimulus: z.string(),
  question_stem: z.string().default("Which one of the following most accurately expresses the conclusion drawn in the argument?"),
  choices: z.array(Distractor).length(5),
  correct_letter: z.enum(['A','B','C','D','E']),
  source_anchor: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    tertiary: z.string().optional(),
    spec_ref: z.string(),
  }),
  coach_note: CoachNoteSchema,                            // structure map + core move + per-answer audit (= Distractor[].audit_voice composed)
});

export const CoachNoteSchema = z.object({
  question_id: QuestionId,
  structure_map: z.string(),                              // sentence-by-sentence functional breakdown
  core_move: z.string(),                                  // one-paragraph naming the trap and the move
  view: z.enum(['narrative','structured']),
  view_b_extras: z.object({                               // structured-table view (View B per MC-SIM-4.4)
    conclusion_verbatim: z.string(),
    conclusion_type: z.enum(['Recommendation','Causal','Rebuttal','Prediction','Judgment']),
    keywords_present: z.object({
      conclusion_indicators: z.array(z.string()),
      pivot: z.array(z.string()),
      fabs: z.array(z.string()),
      opinion: z.array(z.string()),
    }),
    argument_parts: z.record(z.string(), z.string()),     // role → sentence
  }).optional(),
});
```

### §6.2 — Workflow at Gate 4 Module 4 session start

1. **Joshua provides 2–3 ground-truth seeds.** Recommend MC-SIM-Q1 (vision-test, First-Sentence) + MC-SIM-Q19 (recycling program, First-Sentence) + one Rebuttal-styled (e.g., MC-SIM-Q10 Apatosaurus). Each seed: full A-E set with `is_correct`, `trait_id`, `fingerprint_note`, `audit_voice` for every wrong distractor.
2. **Claude drafts the remaining 17 questions × 4 wrong distractors = 68 distractors** (plus the correct answer per question — 17 more entries — for a total of 85 entries to author beyond the 3 seeds × 5 = 15 already locked). Each carries `draft_status: 'claude-draft'`.
3. **Trait-tag distribution requirement:** across all 80 distractors, each trait T1–T7 appears at minimum 8 times (so the trait diagnostic has signal density). Claude reports the distribution; Joshua confirms.
4. **Joshua batch-reviews.** Flags via simple notation (e.g., `Q5.B → wrong tag (should be T4 not T5)`, `Q12.D → off-voice ("verdict-style audit", not narrative)`).
5. **Claude reauthors flagged items.** `reauthor_pass++`. Status `claude-draft` → `joshua-reviewed` for unflagged items after first batch pass.
6. **Final lock pass.** Joshua signs off the full set; status flips to `locked`. Lock state is what Gate 5 verifies.
7. **Calibration coverage check:** every M1.13 + M5.8 calibration drill includes ≥1 question whose canonical-trait-target spans T1–T7 (per G2.CALIBRATION).

### §6.3 — Distractor authoring template

```ts
// Claude's draft format (per distractor)
{
  question_id: 'MC-SIM-Q5',
  letter: 'B',
  text: '<distractor text>',
  is_correct: false,
  trait_id: 'T4',
  fingerprint_note: 'Quantifier shift: stimulus said "most" toy-labeling laws; this answer says "all". Subtle scope drift typical of Trait 4.',
  audit_voice: 'Scope shift.',
  draft_status: 'claude-draft',
  reauthor_pass: 0,
}
```

### §6.4 — Storage

Distractor records live in `src/data/simulator-questions.generated.json` (output of `scripts/import-content.ts`). Authoring source is a markdown file per question at `src/content/simulator-questions/MC-SIM-Q*.md` with frontmatter parsed into the schema. Simpler authoring than JSON; preserves voice nuance.

---

## §7 — Drill 3.6 evaluation pipeline (per G2.DRL-3.6-AI)

`src/lib/ai-templates/whimsical-evaluator.ts`. Local-only, offline-capable, zero marginal cost. v1.5 hook for LLM upgrade.

### §7.1 — Contract

```ts
export type Classification = 'Valid' | 'Invalid but interesting' | 'Misses the premises entirely';

export interface EvaluatorInput {
  questionId: string;
  premise_pair: string[];
  student_valid_text: string;
  student_invalid_text: string;
}

export interface EvaluatorOutput {
  valid_classification: Classification;
  invalid_classification: Classification;
  diagnostic_message_for_valid: string;
  diagnostic_message_for_invalid: string;
}

export async function evaluate(input: EvaluatorInput): Promise<EvaluatorOutput>;
```

### §7.2 — Pipeline (per response — runs twice: once for valid, once for invalid)

```
input: { premise_pair, student_response, model_valid, model_invalid }

Step 1 — premise-keyword overlap:
  premise_tokens = contentTokens(premise_pair)        // strip stopwords + punctuation
  student_tokens = contentTokens(student_response)
  overlap_ratio  = |intersect(premise_tokens, student_tokens)| / |premise_tokens|
  outside_knowledge_imported = (overlap_ratio < 0.30)

Step 2 — sentence-embedding similarity (transformers.js MiniLM):
  v_student = encode(student_response)
  v_valid   = encode(model_valid)
  v_invalid = encode(model_invalid)
  sim_valid   = cosine(v_student, v_valid)
  sim_invalid = cosine(v_student, v_invalid)

Step 3 — classify:
  if outside_knowledge_imported:
    return 'Misses the premises entirely' + diagnostic_outside_knowledge
  elif sim_valid > 0.65 and sim_valid > sim_invalid:
    return 'Valid' + diagnostic_valid (model.why_valid)
  elif sim_invalid > 0.65 and sim_invalid > sim_valid:
    return 'Invalid but interesting' + diagnostic_invalid (model.why_invalid)
  else:
    return 'Misses the premises entirely' + diagnostic_generic_mismatch
```

### §7.3 — Diagnostic messages

Authored verbatim by Joshua. Stored in `src/content/drill-3.6-diagnostics.md` with frontmatter, validated at import time.

```yaml
---
diagnostic_outside_knowledge: |
  Your response uses concepts not in the premises — check the X-Ray Scan section in the Reference Vault.
  In logic reasoning, the world of the premises is your whole world.
diagnostic_generic_mismatch: |
  Your response doesn't match either a valid or an invalid pattern from these premises.
  Try again — and stay strictly within whatever the premises happen to be.
---
```

Per-question `diagnostic_valid` / `diagnostic_invalid` live in `src/content/drill-3.6-models/MC-DRL-3.6-Q*.md` (one per question, with model_valid + model_invalid + why_valid + why_invalid). Imported into `src/data/drill-3.6-models.generated.json`.

### §7.4 — Implementation notes

- **transformers.js** loaded lazily (only when student opens Drill 3.6). Model weight ≈ 23 MB cached in browser.
- **Worker thread** for embedding compute. Main thread stays responsive.
- **Tokenizer for premise-keyword check**: lower-case, strip punctuation, drop English stop-words via `lunr-stopwords` or hand-rolled list. Whimsical proper nouns (e.g., "Microphones", "Sophie Spradlin") count as content tokens.
- **Threshold tuning**: 0.30 overlap and 0.65 similarity are starting points; expose as constants in `whimsical-evaluator.ts` for Gate 4 calibration with real student responses.
- **v1.5 hook**: a feature flag `EVAL_MODE: 'local' | 'llm'` swaps Step 2 for an LLM call. Same input/output contract.

---

## §8 — Calibration content sourcing (per G2.CALIBRATION)

### §8.1 — Schema extension

```ts
export const CalibrationDrillItem = SimulatorQuestion.extend({
  calibration_only: z.literal(true),
  calibration_module: z.enum(['M1','M5']),
  trait_target: TrapTraitId,                              // anchor trait for selection-rule coverage
  no_overlap_with: z.array(z.union([DrillId, QuestionId])),  // for the parity check
});
```

### §8.2 — M5.8 sourcing (5 cluster sentences)

**Approved:** sourced from `Cluster Sentences Review.docx` variants — the Alex/Jordan walkthrough family + Level 3 specifier-chain examples NOT used in M5.6 practice or M5.7 Decomposer.

Selection: 5 cluster sentences with progressively increasing specifier counts (3-, 4-, 4-, 5-, 6-specifier). Each tests middle-out + specifier decomposition. `calibration_only: true`. Stored at `src/content/calibration-M5/MC-CAL-M5-Q*.md`.

### §8.3 — M1.13 sourcing (10 questions, **OVERRIDDEN** from canonical 20)

**Constraint:** No overlap with MC-DRL-3.4 (canonical 20), MC-SIM-Q1–Q20, MC-DRL-3.5 (intermediate vs MP items), MC-DRL-3.7 (pronoun-replacement items). Calibration must measure learning, not recognition.

**Candidate pools:**

| Source | Audit tier | Item count | Mechanic | Used elsewhere | M1.13 candidacy |
|---|---|---|---|---|---|
| `Notes/main_conclusion_student_dup1.docx` (7-question MC ID) + answer key | A | 7 | identification | MC-DRL-3.1 *auxiliary* (barely surfaced) | **STRONG** — 7 items, identification mechanic matches calibration intent, not in canonical 20 |
| `Notes/Conclusion mastery question set Valid vs Invalid` | A | 8 | design-the-conclusion | MC-DRL-3.6 (volume 3) | weak — same mechanic as Drill 3.6, would test design not identification |
| `Notes/Intermediate Conclusion Practice.docx` | A | 5–6 | LSAT role/purpose | MC-DRL-3.5 | weak — overlap with Drill 3.5 |
| `Notes/Valid Conclusion Worksheet HW` | S | 8 | design (whimsical) | MC-DRL-3.6 (volume 1) | weak — same mechanic |
| `Homework/Argument parts exercise + AP Answer Key` (multi-paragraph dissection) | A/S | 6+ | dissection (multi-paragraph) | MC-DRL-3.2 | **MEDIUM** — different mechanic (dissection vs identification) IF reframed as identification questions |
| `Notes/LR BODY DRILL PT 1` | A | 10 | highlighting | MC-DRL-3.2 stage 1 | medium — overlap with Drill 3.2 stages, but different presentation could work |
| `Homework/Premise & Conc exercise_dup1.pdf` | S | ~13 | identification | MC-DRL-3.2 | medium — identification matches but heavily reused in Drill 3.2 |

**M1.13 selected pool (10 items, recommended):**

| # | Source | Trait target | Notes |
|---|---|---|---|
| MC-CAL-M1-Q1 | `main_conclusion_student_dup1.docx` Q1 | T1 (sounds like conclusion, no support) | identification |
| MC-CAL-M1-Q2 | `main_conclusion_student_dup1.docx` Q2 | T2 (implicit conclusion / pronoun) | identification |
| MC-CAL-M1-Q3 | `main_conclusion_student_dup1.docx` Q3 | T3 (paraphrase / syntax-equivalence) | identification |
| MC-CAL-M1-Q4 | `main_conclusion_student_dup1.docx` Q4 | T4 (scope shift) | identification |
| MC-CAL-M1-Q5 | `main_conclusion_student_dup1.docx` Q5 | T5 (author would agree) | identification |
| MC-CAL-M1-Q6 | `main_conclusion_student_dup1.docx` Q6 | T6 (vague but right) | identification |
| MC-CAL-M1-Q7 | `main_conclusion_student_dup1.docx` Q7 | T7 (intermediate / cause-effect) | identification |
| MC-CAL-M1-Q8 | `Homework/AP Answer Key (1).pdf` **item 5** (Airbnb / short-term rentals; per G3.M1.13-AP-PARTITION REVISED) | T1 (recommendation framing) | reframed as identification (single-claim-from-multi-paragraph) |
| MC-CAL-M1-Q9 | `Homework/AP Answer Key (1).pdf` **item 6** (biodiversity / ecological preservation; per G3.M1.13-AP-PARTITION REVISED) | T-Concession (item carries `(Concession)` inline tag) | reframed |
| MC-CAL-M1-Q10 | `Homework/AP Answer Key (1).pdf` **item 8** (universal healthcare; per G3.M1.13-AP-PARTITION REVISED) | T2 / T5 (rebuttal-styled with implicit conclusion + opposing-viewpoint inline tag) | reframed |

**Selection rules enforced by `scripts/import-content.ts` parity check:**
1. Every MC-CAL-M1-Q* carries `calibration_only: true`.
2. Set of `MC-CAL-M1-*` `source_anchor.primary` values is disjoint from set of `MC-SIM-Q*` `source_anchor.primary`.
3. Set of `MC-CAL-M1-*` source files is disjoint from MC-DRL-3.4 / MC-DRL-3.5 / MC-DRL-3.7 source files.
4. `trait_target` distribution covers T1–T7 (≥1 per trait, with overlap allowed in remainder).
5. Build error if any rule violated.
6. **Item-level partition rule (per G3.M1.13-AP-PARTITION, REVISED 2026-04-30 after Step 1 smoke test):** when M1.13 reuses a source file that also feeds another drill (specifically `Homework/AP Answer Key (1).pdf` + `Homework/Argument parts exercise (1).pdf`, which feed MC-DRL-3.2), the partition is at the **item level**, not the file level. **Re-anchored to actual present items in the file** (smoke test 2026-04-30 confirmed file numbering is 2–9, not 1–N; item 7 lacks a breakdown):
   - **AP Answer Key items {2, 3, 4} → MC-DRL-3.2 (X-Ray Drill).** Topics: blue light/screens · smart city/privacy · blockchain/financial.
   - **AP Answer Key items {5, 6, 8} → MC-CAL-M1-Q8 / Q9 / Q10 (calibration).** Topics: Airbnb regulations · biodiversity · universal healthcare.
   - **AP Answer Key item 7 SKIPPED.** Stimulus-only (no breakdown); excluded from both partitions.
   - **AP Answer Key item 9 RESERVED** (Jordan/LeBron — strong T7/Intermediate-Conclusion structure with elaborate role tags). Allocation: T7 trait deep-dive sample in `<TraitDeepDive traitId="T7">` (`/simulator/trap-master/7`) AND Drill 3.9 supplemental example. Both consume the same source content; non-conflicting because they're observation surfaces (not drilled-against).
   - The import script (`scripts/import-content.ts`) extracts item-level identifiers from AP Answer Key (numbered claims). Build error if MC-CAL-M1-Q8/Q9/Q10 references item id ∈ {2, 3, 4}, or if MC-DRL-3.2 references item id ∈ {5, 6, 7, 8, 9}.
   - Same-file-different-item counts as a different extraction per Rule 11 (calibration must measure learning, not recognition).

### §8.4 — Diagnostic engine seed

First M1.13 attempt is the diagnostic engine's first input.

```ts
// On capstone completion:
1. Persist 10 CalibrationAttempt rows.
2. Compute initial MistakesProfile:
   - by_mechanic: {identification: {attempts: 10, correct: N}}
   - by_trait: aggregated from picked_trait_id of wrong answers
3. Seed SrsQueue: every wrong item enters with ease=2.5, interval_days=1, due_at=now+24h, lapses=0.
4. Surface "Your weakness profile is ready" toast → `/diagnostics/dashboard` deep link.
```

---

## §9 — Open architecture decisions (resolved unless flagged)

| # | Decision | Lock |
|---|---|---|
| 1 | Workspace shell layout: three-zone (left rail + canvas + right drawer) | **LOCKED** per scaffolding-plan §6 + spec §6 + reference-study cross-cutting takeaway. Revisit at Gate 4 if UX research lands. |
| 2 | Command palette (Cmd+K) scope: surface ID lookup against source-backed slot IDs (`MC-LSN-1.7`, `MC-DRL-3.4`, etc.) + free-text search across lessons, drills, named tools | **LOCKED**. Implementation: Fuse.js index over `manifest.generated.json`. |
| 3 | Right drawer overlay: in-place open with no URL change | **LOCKED** per scaffolding-plan + Linear pattern. ESC closes; backdrop is a 6% black scrim, no dim. 180ms slide. |
| 4 | AI Tutor stub fallback when no template matches: "Try one of these instead" interstitial with suggested-question chips | **LOCKED**. Voice register 1 (procedural). Phrasing: "I can answer questions like these." Followed by 4 chips drawn from current context. |
| 5 | Calibration seed: first M1.13 attempt is diagnostic engine's first input. Until then, dashboard shows placeholder | **LOCKED**. Placeholder copy: "Your weakness profile appears here after Lesson 1.13 calibration." |
| 6 | Audio retention default: keep forever with manual clear-all in Settings | **LOCKED** per G1.6 default. Settings toggle exposes 90-day auto-purge as v1.5 (greyed). |
| 7 | Logo asset: serif wordmark "MAIN CONCLUSION" until Joshua provides SVG | **DEFERRED** (G1.8). Wordmark in Display 36/serif/700, accent-deep gradient stop. SVG drop-in slot prepared at `public/logo.svg`. |
| 8 | Causation Station + Abstraction layout sanity-check | **DEFERRED** (G1.4). Flag at MC-LSN-* + MC-DIA-* surfaces in Gate 4 review. |
| 9 | UX/UI Deep Research packet | **DEFERRED** (G3.UX-RESEARCH). Architecture locks structure; UX research will refine surface details at Gate 4. |

---

## §10 — Verification

How Gate 3 gets approved.

### §10.1 — End-to-end traces

**Trace 1 — `MC-SIM-Q1` (Vision-test driver license):**
1. `CONTENT_INVENTORY.json` → `modules[3].sections.MC-SIM-4.2.stimuli_listing[0]` lists "Vision-test driver license."
2. `CONTENT_PARITY_MAP.json` → `simulator_questions[0].source_anchor.primary` = `Notes/MCFIRST SENTENCE : REBUTTAL.pdf — Q1`.
3. `scripts/import-content.ts` runs OCR on `MCFIRST.pdf`, validates against `SimulatorQuestion` Zod schema, emits `data/simulator-questions.generated.json[0]`.
4. Route `/simulator/bank` is wrapped in `<LockedRoute requirement="MC-DRL-3.4">` per §5.
5. After Drill 3.4 passes all 4 stages, `unlockNext('MC-DRL-3.4')` adds `/simulator/*` to `module_progress.unlocked_routes`.
6. `/simulator/bank` loads `QuestionBank.tsx` → `<QuestionCard question={data[0]} />` renders stimulus + 5 `<AnswerChoiceRow>` (per §6 Distractor schema) + `<CoachsNote view='narrative'>` after submit.
7. Wrong answer reveals `<TraitTag traitId='T1'>` per §6; tap → opens `/simulator/trap-master/T1` → `<TraitDeepDive>` with PT58 S1 Q13 example.
8. `simulator_attempts` row written + `traps_tag` projection updated + `mistakes_profile.by_trait.T1` recomputed.
9. `<RightDrawer mode='reference' payload={{reference_id: 'MC-REF-2.B'}}>` opens in place when student taps a flag-icon next to the answer choice (MC-REF-2.K behavior).

**Trace 2 — `MC-DRL-3.4` (Rebuttal vs First-Sentence Stage-Gate):**
1. `CONTENT_PARITY_MAP.json.entries.MC-DRL-3.4` → route `/drills/3.4`, components `RebuttalStageGate.tsx` + `StageGateTracker.tsx` + `lib/pdf/StageGatePdfReport.ts`.
2. `data/drills.generated.json.MC-DRL-3.4.stages` provides 4 × 5 = 20 questions (per Gate 1's canonical-20 reuse decision; see §8.3 for non-overlap with calibration).
3. Loader reads in-progress `drill_stagegate` for current attempt.
4. On stage-pass (4/5): `unlockNext('/drills/3.4')` checks `allStagesPassed`; if 4/4 stages: adds `/simulator/*` routes.
5. PDF export: `<PdfReportButton>` triggers `lib/pdf/StageGatePdfReport.ts`; `window.print()` against hidden iframe (per scaffolding plan + MC Companion lift).

**Trace 3 — `MC-REF-2.A` (Indicator Vault):**
1. Route `/reference/indicators` → `IndicatorVault.tsx` → renders 6 `<CategoryCard>` from `data/indicators.generated.json`.
2. Each card uses role-color (`--role-conclusion` etc.) + chips + worked example. Component carries `reference_id` slot.
3. From any drill or simulator question, tap reference flag → `<RightDrawer mode='reference' payload={{reference_id: 'MC-REF-2.A'}}>` opens in place. ESC closes. No URL change. (MC-REF-2.K behavior.)

**Trace 4 — `NT-Stage-Gate-Tracker`:**
1. Lexicon entry at `/reference/named-tools/stage-gate-tracker` → `<NamedToolEntry toolId='NT-Stage-Gate-Tracker'>` renders What/Where/Source from `data/named-tools.generated.json`.
2. Live experience is `<StageGateTracker>` — applied as universal frame across all M3 drills + M1.13 capstone via `<Capstone moduleId='M1'>` composing it.
3. Single render of "Named Tools list" enforces the no-double-counting rule per G1.2.

**Trace 5 — `VP-monsters-cluster-sentences`:**
1. Voice passage stored verbatim in `data/voice-passages.generated.json.VP-monsters-cluster-sentences.passage = "monsters called cluster sentences"`.
2. Renders verbatim in `<Why>` (MC-HSL-5.1) and `<WhatIsCluster>` (MC-HSL-5.2).
3. Gate 5 grep verifies the literal string appears in build output.

**Trace 6 — `EX-cake-on-blocks`:**
1. Worked example stored verbatim in `data/worked-examples.generated.json.EX-cake-on-blocks`.
2. Renders verbatim in `<Lesson lessonId='MC-LSN-1.1'>` and `<Lesson lessonId='MC-LSN-1.2'>`.
3. Visual: `<CakeOnBlocks state='stable|unstable|collapsed' onClick={...}>` (lifted from logicalreasoningfoundation Gap Simulator).

### §10.2 — Dry-import verification

```
npm run import -- --dry-run
```

Expected output:
- ✓ All canonical source paths exist (Gate 0 re-verification).
- ✓ All Zod schemas validate against parsed sources.
- ✓ Manifest entry count matches Table A entry count (~173).
- ✓ No source file outside Table A or Table B is referenced.
- ✓ Calibration parity check passes (no overlap).
- ✓ Trait coverage: M1.13 covers T1–T7.

### §10.3 — Component / route coverage

- **Components:** all 63 distinct components in `CONTENT_PARITY_MAP.json` `entries[].components[]` are covered by §1 above (verified 2026-04-30 via `python3` walk).
- **Routes:** all 65 distinct routes in `CONTENT_PARITY_MAP.json` `entries[].route` resolve under §2 above. Notes:
  - Per-named-tool routes (`/reference/named-tools/<toolId>` × 15) collapse to `path: 'named-tools/:toolId'` in §2.
  - Per-trait routes (`/simulator/trap-master/<1..7>`) collapse to `path: 'trap-master/:traitId'` in §2.
  - Per-lesson routes (`/lessons/1.1` … `/lessons/1.12`) collapse to `path: ':lessonId'` in §2. The capstone `/lessons/1.13` has its own literal route.
  - Two parity-map entries — `/reference/companion-mode` (MC-REF-2.K) and `/simulator/answer-key-views` (MC-SIM-4.4) — are **behaviors/UI components**, not routable URLs. MC-REF-2.K = right-drawer reference overlay handler (`components/workspace-shell/RightDrawer.tsx`). MC-SIM-4.4 = `<AnswerKeyToggle>` inside `<CoachsNote>` with `view: 'narrative' | 'structured'`. Both correctly mapped in §1.2.
- **Trait IDs:** every Distractor `trait_id` is in T1–T7 (Zod-enforced via `TrapTraitId` enum in §6.1).

### §10.4 — Approval criteria

Joshua confirms:
- §1 component tree (no missing components, no orphan components).
- §2 route map (every parity-map route present).
- §3 persistence schemas (every record + slot maps cleanly to future Supabase).
- §4 build-time import script (pipeline + cache + dry-run).
- §5 module ordering (Drill 3.4 → Simulator gating).
- §6 trap-tag schema + workflow (drafts/review/lock cycle).
- §7 Drill 3.6 evaluator (overlap + similarity + classification logic + diagnostic message authoring).
- §8 calibration sourcing (M1.13 candidate pool + selection rules + trait coverage).
- §9 architecture decisions (in-place drawer, command palette scope, fallback voice, etc.).

Open: G1.4 + G3.UX-RESEARCH stay deferred. They don't block Gate 3 sign-off; they refine surface details at Gate 4.

---

## Files this plan creates or specifies

**Code files (all created at Gate 3 close → no production code lands until then):**

| Path | Purpose |
|---|---|
| `src/types/source-slots.ts` | Type-checked source-backed slot props |
| `src/persistence/Persistence.ts` | Interface |
| `src/persistence/LocalStoragePersistence.ts` | KV impl |
| `src/persistence/IndexedDBPersistence.ts` | IDB impl with blob store |
| `src/persistence/V1Persistence.ts` | Composite delegating by table |
| `src/persistence/factory.ts` | Exports active adapter |
| `src/persistence/records.ts` | Zod record schemas |
| `src/content/schemas.ts` | Content schemas (lessons, drills, simulator, etc.) |
| `src/lib/ids.ts` | UUID + ISO helpers |
| `src/lib/ordering.ts` | ROUTE_REQUIREMENTS + unlockNext |
| `src/lib/ai-templates/whimsical-evaluator.ts` | Drill 3.6 evaluator |
| `src/lib/recommendations/decisionTree.ts` | M6.4 templated rules |
| `src/lib/audio/MediaRecorder.ts` | Drill 3.8 mic helpers |
| `src/lib/pdf/StageGatePdfReport.ts` | Drill 3.4 PDF export |
| `src/lib/print/QuickReferenceCard.print.tsx` | MC-REF-2.J printable |
| `src/lib/transcripts/diff.ts` | R&R templated diff (v1) |
| `src/hooks/useUser.ts` | Stub user; LSAT U absorption swap-in |
| `src/hooks/useModuleAccess.ts` | Module ordering hook |
| `src/hooks/useStageGate.ts` | Drill stage progression |
| `src/hooks/useTrapTags.ts` | Simulator trait tagging |
| `src/hooks/useReducedMotion.ts` | a11y respect |
| `src/components/primitives/*` | 24 primitives per §1.1 |
| `src/components/workspace-shell/*` | 6 components per §1.2 |
| `src/components/stage-gate/*` | 5 components |
| `src/components/indicator-vault/*` | 3 components |
| `src/components/coachs-note/*` | 2 components |
| `src/components/x-ray-scan/*` | 2 components |
| `src/components/trap-master/*` | 4 components |
| `src/components/argument-structure-map/*` | 3 components |
| `src/components/cluster-decomposer/*` | 3 components |
| `src/components/rr-recorder/*` | 4 components |
| `src/components/ai-tutor/*` | 3 components |
| `src/components/smart-hints/*` | 2 components |
| `src/components/question/*` | 2 components |
| `src/components/progress/*` | 2 components |
| `src/components/named-tools/*` | 2 components |
| `src/modules/lessons/*` | 3 pages |
| `src/modules/reference/*` | 12 pages |
| `src/modules/drills/*` | 10 pages |
| `src/modules/simulator/*` | 5 pages |
| `src/modules/hard-sentences/*` | 9 pages |
| `src/modules/diagnostics/*` | 8 pages |
| `src/routes.tsx` | Router config per §2 |
| `src/App.tsx`, `src/main.tsx` | Entry |
| `scripts/import-content.ts` | Build-time corpus import |

**Content files (authored / OCR'd at Gate 4):**

| Path | Source |
|---|---|
| `src/content/simulator-questions/MC-SIM-Q*.md` | OCR'd from MCFIRST + answer-key files; distractor authoring per §6 |
| `src/content/drill-3.6-models/MC-DRL-3.6-Q*.md` | Joshua-authored model answers + diagnostics |
| `src/content/drill-3.6-diagnostics.md` | Joshua-authored generic diagnostics |
| `src/content/simulator-questions/coach-notes/MC-SIM-Q*.md` | Coach's Note per question |
| `src/content/calibration-M1/MC-CAL-M1-Q*.md` | M1.13 calibration items per §8.3 |
| `src/content/calibration-M5/MC-CAL-M5-Q*.md` | M5.8 calibration items per §8.2 |
| `src/content/drill-3.9-fallback.md` | Only if Drill 3.9 OCR fails per G2.OCR |

**Generated at build time (gitignored):**

`src/data/*.generated.json` (12 files) + `src/data/manifest.generated.json`.

---

## Open inputs flagged at every relevant section

- **G1.4 (Causation Station + Abstraction URLs):** flagged at §1.3 Module 1 + Module 6, §10.4 approval criteria. Will refine layout once URLs land.
- **G3.UX-RESEARCH (UX/UI Deep Research):** flagged at top of file. Architecture locks structure; UX research refines surface details at Gate 4.

These do not block Gate 3 sign-off.
