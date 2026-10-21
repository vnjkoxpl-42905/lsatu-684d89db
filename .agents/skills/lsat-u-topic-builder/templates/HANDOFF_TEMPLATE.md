# {{TOPIC_NAME_UPPER}} BOOTCAMP

## Claude Code Handoff. {{TARGET_MODE}} project. Future LSAT U absorption planned.

---

## READ THIS FIRST. DO NOT SKIM.

You are building a {{TARGET_MODE}} {{TOPIC_NAME}} bootcamp web app. {{#if standalone}}This is a self-contained v1 project that lives in its own folder. It is NOT inside the LSAT U repo. Future absorption into LSAT U is planned but out of scope for v1.{{/if}}{{#if repo-native}}This is a repo-native rebuild of `{{ROUTE_TARGET}}` inside the LSAT U repo. Match or exceed Causation Station and Abstraction's quality bar.{{/if}}

**The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.**

**No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently. Missing content is a build failure.**

If you finish this work and the question bank, named tools, voice passages, or reference content are incomplete, the build is rejected regardless of UI quality.

The output target is a sophisticated, premium, high-end private-academy bootcamp. Quality bar: match or exceed Causation Station and Abstraction. Anything that feels like generic SaaS, gamified consumer edtech, or a basic course site is rejected at review.

---

## 1. THE END RESULT WE WANT

When v1 ships, a student opens the {{TOPIC_NAME}} bootcamp and finds:

A premium {{TOPIC_NAME}} bootcamp that matches or beats Causation Station and Abstraction in pedagogical depth, interaction quality, visual polish, and analytics integration.

The full {{TOPIC_NAME}} content corpus from `{{CURRICULUM_PATH}}_export_*/` (if prior audit exists), the canonical source folders at `{{CURRICULUM_PATH}}Notes/` and `{{CURRICULUM_PATH}}Homework/`, and any reusable questions / explanations extracted from relevant Netlify prototypes ({{NETLIFY_PROTOTYPES}}). Every reviewed item lands in v1 or on a Not-Included-in-v1 table with a reason. Nothing disappears.

A six-module architecture (candidate, locks at Gate 3): Lessons, Reference Vault plus Indicator Vault (where applicable), Drills plus Calibration, Question Simulator plus Trap Master, Reading Hard Sentences (where applicable to the topic), Diagnostics plus Progress plus Mistake Profile.

A persistence abstraction layer that uses localStorage / IndexedDB in v1, with a typed schema designed to map cleanly to a future Supabase backend.

A clean architecture ready for absorption into LSAT U later: routing patterns, auth-ready hooks (no auth in v1, but stub the surface), progress patterns, analytics event taxonomy, theming tokens. When the absorb happens, it should be a layer swap, not a rewrite.

Visual identity: dark-mode private academy. Editorial typography. Restrained 1px borders. Warm gold accent only on commit and selection. Linear / Arc / Readwise / Superhuman level density. UWorld-level answer review seriousness.

Now work backward from that outcome.

---

## 2. GATE 0: SOURCE-ACCESS CHECK

Before any work, verify that every source path listed in Section 9 exists and is readable. If any path is missing, inaccessible, or empty, stop. List the inaccessible paths to Joshua. Do not proceed with partial source access.

Output a short report:
- Path checked.
- Status: present and readable / missing / unreadable / empty.
- If missing: blocker noted.

Gate 0 must pass before Gate 1 begins.

---

## 3. GATE 1: PROJECT SCAFFOLDING AND REFERENCE STUDY

### 3A. Project Scaffolding

Set up the v1 project at `{{PROJECT_FOLDER}}` (the folder this handoff lives in).

Tech stack defaults (open to discussion, lock at Gate 3):
- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Persistence adapter pattern: app code talks to a `Persistence` interface, never localStorage / IndexedDB / Supabase directly. v1 ships `LocalStoragePersistence` and `IndexedDBPersistence`.
- No backend in v1. No auth in v1, but stub a `useUser()` hook.

Design tokens at scaffolding time:
- Color roles: paper (deep neutral background), ink (high-contrast text), accent (warm gold for commit / selection / coach voice), signal-correct (muted verdant), signal-wrong (muted rust), signal-trap (distinct restrained semantic chips per trap type), muted-meta.
- Typography: Inter or similar tight grotesque for UI. Tiempos / Source Serif Pro for lesson body. JetBrains Mono for indicator codes and source citations.
- Spacing: 8px base grid, 4px in tables and dense rails.
- Borders: 1px low-contrast neutral.
- Motion: 150-220ms eased, no spring overshoot, no parallax, prefers-reduced-motion respected.

### 3B. Reference Study

Study these reference apps. Capture findings at `/docs/reference-study.md`.

- Linear (linear.app)
- Readwise Reader (readwise.io/read)
- Superhuman (superhuman.com)
- Anki (apps.ankiweb.net)
- UWorld
- Causation Station (LSAT U internal, deployed URL pending from Joshua)
- Abstraction (LSAT U internal, deployed URL pending from Joshua)

For each: what to study, what to borrow, what to reject, where it lands in this bootcamp.

### 3C. Output for Gate 1

1. Project Scaffolding Plan: tech stack confirmed, folder structure, persistence adapter sketch, design token list.
2. Reference Study notes at `/docs/reference-study.md`.
3. Open questions for Joshua to decide before architecture (Gate 3) can lock.

No production code yet.

---

## 4. GATE 2: CONTENT-SCOPE INVENTORY (HARD APPROVAL GATE)

**Before implementation, Claude Code must return a content-scope inventory showing source file name, content type, approximate item count, destination module, and status: v1 included / v1.5 backlog / blocked. Do not code until Joshua approves that inventory.**

Three source streams, all mandatory.

### 4A. Notes and Homework Inventory

Pull from `{{CURRICULUM_PATH}}Notes/` and `{{CURRICULUM_PATH}}Homework/`. If a prior `_export_*/spec.html` exists at `{{CURRICULUM_PATH}}_export_*/`, use it as a snapshot but cross-check against the canonical folders.

Account for, by row: every lesson item, guided/worked example, checkpoint question, calibration item, reference section, indicator entry (if applicable), drill module, homework-derived question, simulator question, trap item, hard-sentence practice item (if applicable), diagnostic, named tool, voice passage, source file consumed.

### 4B. Netlify Prototype Extraction Inventory

If any of the six Netlify prototypes contain content relevant to {{TOPIC_NAME}}, inventory them. Prototype source at `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`.

Per-app file mapping (resolved 2026-04-29): file (3) = logicalreasoningfoundation. (4) = mainconclusionrebuttalvsfirst. (5) = introconclusiondrill. (6) = mainconclusion. (1) and (2) are byte-identical React app.

Topic-relevant prototypes for this build: {{NETLIFY_PROTOTYPES}}

For each: questions, answer choices, correct answers, explanations, drills, diagnostics, interaction patterns, widgets, unique teaching value, overlap with Notes/Homework, destination or v1.5 backlog.

### 4C. Output Tables

**Table A: v1 Inventory**

| Source file | Content type | Item count | Destination module | v1 status |

`v1 status` values: `v1 included`, `v1.5 backlog`, `blocked`.

**Table B: Not Included in v1**

| Source file | Reason for exclusion | Proposed v1.5 plan |

Anything missing from both tables is silently dropped and is a build failure.

### 4D. Required Parity Artifacts

Three machine-checkable artifacts at `/docs/parity/`:
- `CONTENT_INVENTORY.md` or `.json`
- `CONTENT_PARITY_MAP.md` or `.json` (every row in CONTENT_INVENTORY must appear here)
- `NOT_INCLUDED_IN_V1.md`

At Gate 5, full content-scope is re-verified against these.

---

## 5. WHAT MUST BE PRESERVED

Preserve all of the following exactly as they appear in the {{TOPIC_NAME}} source corpus:

**Two-register voice.** Register 1 (decisive, verdict-style, procedural) for Reference, Question Simulator, drill instructions. Register 2 (whimsical, parodic, metaphor-led) for Lessons and drill setup. Tighten ALL-CAPS but do not eliminate. Cap confidence-calibration phrasing to once per module.

**Named tools (preserve names exactly):** {{NAMED_TOOLS}}

**Named worked examples** flagged in any prior audit or surfaced during the corpus walk in Gate 2. Preserve verbatim.

**Pedagogical flow.** Lesson first. Guided examples inline. Checkpoint questions after key concepts. End-of-module calibration drill. Post-drill weakness profile. Spaced repetition seeded from end-of-module misses. Never cold-test before instruction.

**Verbatim voice passages.** Every passage tagged "preserve verbatim" in the audit (or surfaced as voicy during Gate 2).

**Tier S / A / B / C content.** Every question, drill, and homework item earning tier S, A, B, or C in any prior audit (or in Gate 2 grading).

If preservation conflicts with a clean architecture choice, surface the conflict to Joshua. Do not silently rewrite.

---

## 6. CANDIDATE SIX-MODULE ARCHITECTURE

*Subject to Gate 1 scaffolding, Gate 2 inventory, and Joshua approval. Locks at Gate 3.*

1. **Lessons.** Progressive teaching. Intro screens, reveal sequence, inline guided examples, typed student-response checkpoints, coach translation, named-tool callouts.
2. **Reference Vault** (and Indicator Vault if applicable to {{TOPIC_NAME}}).
3. **Drills plus Calibration.** End-of-module drills and standalone packs.
4. **Question Simulator plus Trap Master.** Full simulator over the merged question bank.
5. **Reading Hard Sentences** (if applicable to {{TOPIC_NAME}}).
6. **Diagnostics plus Progress plus Mistake Profile.**

Modules can be removed or renamed at Gate 1 based on what {{TOPIC_NAME}} actually needs. Default is the Main Conclusion six-module structure.

### Three-zone workspace shell

- Persistent left rail: module nav, progress per module, named tools list, command palette trigger, review queue badge.
- Main canvas: lesson, drill, simulator, vault, diagnostic content.
- Right drawer: opens in place for audit / coach / reference / journal. ESC closes. No backdrop dim. 180ms slide.

### Persistence (v1)

- Adapter pattern. App code talks to a `Persistence` interface only.
- v1: `LocalStoragePersistence` (default), `IndexedDBPersistence` (R&R audio).
- v1.5 / future: swap in `SupabasePersistence` as a one-file change.
- Schema: UUIDs (UUIDv4), ISO 8601 timestamps, typed records.

### Source-backed UI slot rule

Every component must preserve visible slots for source-backed data:
- `source_item_id`, `question_id`, `lesson_id`, `named_tool_id`, `reference_id`, `trap_tag`, `correct_choice_id`, `review_queue_status`, `parity_status`

Components that hide source identity are rejected.

### AI Tutor

- v1: stub mode. Slot-filled templates anchored to spec content. Suggested-question chips. No live LLM call.
- v1.5: live LLM with daily token cap.

### R&R Drill

- v1: audio recording (IndexedDB) plus templated diff highlighting. Mobile fallback: text-only.
- v1.5: LLM-driven semantic comparison.

---

## 6A. DESIGN SCOUTING TOOLS (HYBRID PIVOT)

### Rule 1: 21st.dev for primitives only. Never for layouts.

Primitives only: buttons, tabs, drawers, command palettes, badges, answer-choice rows, audit rows, coach note cards, reference cards, loading skeletons, empty / error / success / locked states, toasts, compact data rows, timeline rows.

Do NOT use 21st.dev for full workspace shells, dashboards, landing pages, or any layout-scale composition.

### Rule 2: Direct reference apps for layouts.

Per Section 3B reference study. Linear / Readwise / Superhuman / Anki / UWorld / Causation Station / Abstraction.

### Rule 3: 21st.dev MCP is unreliable.

Empirical hit rate: 1 useful primitive per 7 calls. Prefer Inspiration Search over Magic Generate (Magic Generate has timed out 2 of 2 calls). One primitive at a time.

### Rule 4: Primitive prompt template

```
Generate 4 dark-mode premium {COMPONENT} variants for LSAT U.
Style: private academy, precise 1px borders, restrained warm gold accent, dense expert-tool feel.
Must support: keyboard focus, mobile state, loading/disabled/empty where relevant.
Hard no: generic SaaS gradients, confetti, mascot, fake analytics, childish gamification.
Placeholder content only.
```

### Rule 5: Known-good vetted primitive

The Fey.com Button technique: inset 0.5px box-shadow border + after-pseudo crossfade for hover + theme-variable colors. LSAT U adjustments: rounded-md not rounded-full, drop the LockIcon, warm gold accent, class-based dark mode.

### Rule 6: Scouting feeds Gate 3, never replaces it.

### Rule 7: Source-backed slot rule applies to all scouted primitives.

---

## 7. APPROVAL GATES

Each gate is explicit, blocking, and requires Joshua's written sign-off.

- **Gate 0**: Source-Access Check
- **Gate 1**: Project Scaffolding and Reference Study
- **Gate 2**: Content-Scope Inventory
- **Gate 3**: Architecture Plan
- **Gate 4**: Module-by-module build review
- **Gate 5**: Pre-merge final review

Required inputs to Gate 3: approved Gate 1 + approved Gate 2.

No production code before Gate 3 sign-off.

---

## 8. WHAT MUST NOT HAPPEN

- {{TARGET_MODE}} target. Don't drift.
- Do not deploy externally without approval.
- Do not silently drop content. Anything not in v1 sits on Table B with a reason.
- Do not rewrite Joshua's voice into generic editor tone.
- Do not skip gates.
- Do not start with code. Start with Gate 0.
- Do not introduce a backend in v1.
- Do not finish without confirming every reviewed source appears on Table A or Table B.
- Do not silently absorb user edits or chat overrides. Acknowledge them with a JOSHUA OVERRIDE or JOSHUA EDIT callout. Log them in PROJECT_MEMORY.md Decisions Log.

---

## 9. SOURCE PATHS

- Topic source corpus (Notes): `{{CURRICULUM_PATH}}Notes/`
- Topic source corpus (Homework): `{{CURRICULUM_PATH}}Homework/`
- Prior audit export (if exists): `{{CURRICULUM_PATH}}_export_*/`
- Project memory: `{{CURRICULUM_PATH}}_PROJECT.md` (if exists)
- Netlify prototype source: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`
- This {{TARGET_MODE}} project: `{{PROJECT_FOLDER}}`
{{#if repo-native}}- LSAT U repo: local clone path supplied by Joshua at session start. Target route: `{{ROUTE_TARGET}}`{{/if}}

---

## 10. FIRST STEP

1. Run Gate 0. Verify every path in Section 9. Stop and report any inaccessible paths.
2. If Gate 0 passes, run Gate 1: produce the Project Scaffolding Plan and the Reference Study notes. No production code yet.
3. Wait for Joshua's approval before Gate 2.

In your first reply, restate, in your own words, that you have read this handoff and that you understand:

1. The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.
2. No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently.
3. Netlify prototypes (where relevant to {{TOPIC_NAME}}) are reference sources AND extraction sources.
4. This is a {{TARGET_MODE}} v1 project. Future LSAT U absorption is planned but out of scope for v1 (if standalone) or this is repo-native (if repo-native).
5. Persistence is adapter-pattern. v1 ships LocalStorage and IndexedDB.
6. Quality bar matches or exceeds Causation Station and Abstraction.
7. Hybrid pivot for design scouting: 21st.dev for primitives only. Direct reference apps for layouts.
8. User modifications are authoritative and must be emphasized with a JOSHUA OVERRIDE or JOSHUA EDIT callout. Never silently absorbed.

Then run Gate 0 and deliver the result.

---

End of handoff. Loop closes back to Joshua at every gate.

Generated: {{DATE}}
