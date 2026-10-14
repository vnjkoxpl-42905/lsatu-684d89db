# MAIN CONCLUSION / ARGUMENT STRUCTURE BOOTCAMP

## Claude Code Handoff. Standalone project. Future LSAT U absorption planned.

---

## READ THIS FIRST. DO NOT SKIM.

You are building a standalone Main Conclusion / Argument Structure bootcamp web app. This is a self-contained v1 project that lives in its own folder. It is NOT inside the LSAT U repo. Future absorption into LSAT U is planned but out of scope for v1.

**The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.**

**No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently. Missing content is a build failure.**

If you finish this work and the question bank, named tools, voice passages, or reference content are incomplete, the build is rejected regardless of UI quality.

The output target is a sophisticated, premium, high-end private-academy bootcamp. Quality bar: match or exceed Causation Station and Abstraction (the LSAT U internal benchmarks, studied externally as references for v1). Anything that feels like generic SaaS, gamified consumer edtech, or a basic course site is rejected at review.

---

## 1. THE END RESULT WE WANT

When v1 ships, a student opens the standalone Main Conclusion bootcamp web app and finds:

A premium Main Conclusion / Argument Structure bootcamp that matches or beats Causation Station and Abstraction in pedagogical depth, interaction quality, visual polish, and analytics integration.

The full Main Conclusion content corpus from the Cowork audit at `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/`, the canonical source folders at `/Notes/` and `/Homework/`, and every reusable question / explanation extracted from the six Netlify prototypes at `/Curriculum/Netlify/`. Every reviewed item lands in v1 or on a Not-Included-in-v1 table with a reason. Nothing disappears.

A six-module architecture (candidate, locks at Gate 3): (1) Lessons, (2) Reference Vault plus Indicator Vault, (3) Drills plus Calibration, (4) Question Simulator plus Trap Master, (5) Reading Hard Sentences, (6) Diagnostics plus Progress plus Mistake Profile.

A persistence abstraction layer that uses localStorage / IndexedDB in v1, with a typed schema designed to map cleanly to a future Supabase backend. R&R audio recording lives in IndexedDB.

A clean architecture ready for absorption into LSAT U later: routing patterns, auth-ready hooks (no auth in v1, but stub the surface), progress patterns, analytics event taxonomy, theming tokens. When the absorb happens, it should be a layer swap, not a rewrite.

Visual identity that feels like a serious reasoning instrument, a premium private-academy coaching app, a guided LSAT workbench. Editorial typography, restrained 1px borders, warm gold accent only on commit and selection, dark-mode private-academy aesthetic, Linear / Arc / Readwise / Superhuman level density, UWorld-level answer review seriousness.

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

Set up the standalone v1 project at `/Users/joshuaf/Documents/Claude/02_PROJECTS/main-conclusion-bootcamp/` (the folder this handoff lives in).

Tech stack defaults (open to discussion, lock at Gate 3):
- **Vite + React + TypeScript** as the base.
- **Tailwind CSS** for utility classes (or CSS modules if you prefer; flag the choice).
- **React Router** for routing (six module routes plus an index).
- **Persistence adapter pattern**: app code talks to a `Persistence` interface, never localStorage / IndexedDB directly. v1 ships `LocalStoragePersistence` and `IndexedDBPersistence` (the latter for R&R audio). Future LSAT U absorption swaps in `SupabasePersistence` as a one-file change.
- **No backend in v1**. Everything client-side. No auth in v1, but stub a `useUser()` hook that returns a placeholder user (so absorption later wraps the real LSAT U user without a refactor).

Design tokens at scaffolding time:
- **Color roles**: paper (deep neutral background, very dark slate, not pure black), ink (high-contrast text), accent (warm gold for commit / selection / coach voice cues), signal-correct (muted verdant, verdict surfaces only), signal-wrong (muted rust, verdict surfaces only), signal-trap (distinct restrained semantic chips per trap type), muted-meta (timestamps, source citations, helper text).
- **Typography**: Inter or similar tight grotesque for UI. Tiempos / Source Serif Pro grade serif for lesson body. JetBrains Mono or similar for indicator codes and inline source citations.
- **Spacing**: 8px base grid, 4px in tables and dense rails.
- **Borders**: precise 1px borders, low-contrast neutral.
- **Motion**: 150 to 220ms transitions, eased not bounced, no spring overshoot, no parallax, prefers-reduced-motion respected.

### 3B. Reference Study

Study these reference apps for layout, density, interaction, and microinteraction patterns. Capture findings as design notes inside the project at `/docs/reference-study.md`.

- **Linear** (linear.app)
- **Readwise Reader** (readwise.io/read)
- **Superhuman** (superhuman.com)
- **Anki** (apps.ankiweb.net)
- **UWorld**
- **Causation Station** (LSAT U internal, accessed via deployed URL)
- **Abstraction** (LSAT U internal, accessed via deployed URL)

For each, document: what to study, what to borrow, what to reject, where it lands in this bootcamp.

### 3C. Output for Gate 1

Deliver:
1. **Project Scaffolding Plan**: tech stack confirmed, folder structure, persistence adapter sketch, design token list.
2. **Reference Study notes**: `/docs/reference-study.md` populated for all 7 references.
3. **Open questions**: anything you need Joshua to decide before architecture (Gate 3) can lock.

Do not write production code yet. Do not propose architecture. Stay at the scaffolding-and-study level.

---

## 4. GATE 2: CONTENT-SCOPE INVENTORY (HARD APPROVAL GATE)

**Before implementation, Claude Code must return a content-scope inventory showing source file name, content type, approximate item count, destination module, and status: v1 included / v1.5 backlog / blocked. Do not code until Joshua approves that inventory.**

Three source streams, all mandatory.

### 4A. Notes and Homework Inventory

Pull from the Stage 1 to 3 spec at `_export_2026-04-29/spec.html`, the audit tally at `_export_2026-04-29/source_inventory/audit_tally.md`, and the canonical folders at `/Notes/` and `/Homework/`.

Account for, by row:
1. Every lesson item (concept, walkthrough, callout)
2. Every guided / worked example
3. Every checkpoint question
4. Every calibration / capstone item
5. Every reference section
6. Every indicator entry
7. Every drill module and its items
8. Every homework-derived question
9. Every simulator question
10. Every Trap Master item
11. Every hard-sentence practice item
12. Every diagnostic section and item
13. Every named tool with its definition and usage rule
14. Every voice passage tagged "preserve verbatim" in the audit
15. Every question pool referenced in the earlier Cowork review
16. Every source file consumed (file name, file path, audit tier)

### 4B. Netlify Prototype Extraction Inventory

**Required rule, verbatim:** "The six Netlify prototypes are reference sources AND extraction sources. They do not control final architecture, but any question, answer choice, explanation, drill, diagnostic, widget idea, or interaction pattern inside them must be inventoried. If a Netlify prototype contains a question, it must appear in the content inventory or the Not Included in v1 table."

Inventory each of the six prototypes (source code at `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`):
- argumentslr
- logicalreasoningfoundation
- structuredrill
- mainconclusion
- introconclusiondrill
- mainconclusionrebuttalvsfirst

Per-app file mapping: file (3) = logicalreasoningfoundation. (4) = mainconclusionrebuttalvsfirst. (5) = introconclusiondrill. (6) = mainconclusion. (1) and (2) are byte-identical React app, deployed to argumentslr and structuredrill.

For each prototype, extract: questions, answer choices, correct answers, explanations, drills, diagnostics, interaction patterns, widgets, unique teaching value, overlap with Notes/Homework, destination module or v1.5 backlog status.

### 4C. Output Tables

**Table A: v1 Inventory**

| Source file | Content type | Item count | Destination module | v1 status |

`v1 status` values: `v1 included`, `v1.5 backlog`, `blocked`.

**Table B: Not Included in v1**

| Source file | Reason for exclusion | Proposed v1.5 plan |

Anything missing from both tables is treated as silently dropped and is a build failure.

### 4D. Required Parity Artifacts

Three machine-checkable artifacts at `/docs/parity/`:
- `CONTENT_INVENTORY.md` or `.json`
- `CONTENT_PARITY_MAP.md` or `.json`
- `NOT_INCLUDED_IN_V1.md`

Every row in `CONTENT_INVENTORY` must appear in `CONTENT_PARITY_MAP`.

At Gate 5, full content-scope is re-verified against these artifacts. Drift between artifacts and the actual built app is a build failure.

---

## 5. WHAT MUST BE PRESERVED

Preserve all of the following exactly as they appear in the Stage 2 compiled content (`_export_2026-04-29/spec.html`) and the rules folder (`_export_2026-04-29/rules/`):

**Two-register voice.** Register 1 (decisive, verdict-style, procedural) for Reference, Question Simulator, drill instructions. Register 2 (whimsical, parodic, metaphor-led) for Lessons and drill setup. Tighten ALL-CAPS but do not eliminate. Cap confidence-calibration phrasing to once per module.

**Named tools, names unchanged:** FABS, 2-Part Conclusion Check, Skeptic's Ear Check, Upside Down Argument, Trojan Horse Concession, Pre-Phrase Goal, X-Ray Scan, Trap Master, Stage-Gate Tracker, R&R Drill.

**Named worked examples:** cake-on-blocks, stegosaurus eucalyptus, William and Harry standardized testing, gun-laws pronoun replacement, EV cars three-stage chain, Monica claimed dinosaurs, tomato / fruit / seeds, all-nighter paper concession, tornado syntax-equivalence.

**Pedagogical flow.** Lesson first. Guided examples inline. Checkpoint questions after key concepts. End-of-module calibration drill. Post-drill weakness profile. Spaced repetition seeded from end-of-module misses. Never cold-test before instruction.

**Verbatim voice passages.** Every passage tagged "preserve verbatim" in the audit.

**Tier S / A / B / C content.** Every question, drill, and homework item earning tier S, A, B, or C in Stage 1.

If preservation conflicts with a clean architecture choice, surface the conflict to Joshua. Do not silently rewrite.

---

## 6. CANDIDATE SIX-MODULE ARCHITECTURE

*Subject to Project Scaffolding Plan, content inventory, reference study, and Joshua approval.* Locks at Gate 3.

1. **Lessons.** Progressive teaching modeled on Abstraction. Intro screens, reveal sequence, inline guided examples, typed student-response checkpoints, coach translation, named-tool callouts, voice-led prose.
2. **Reference Vault plus Indicator Vault.** Searchable concept reference and indicator-word reference. Dense, scannable, Register 1 voice.
3. **Drills plus Calibration.** End-of-module drills and standalone drill packs. Timed and untimed. Calibration drill seeds the mistake profile.
4. **Question Simulator plus Trap Master.** Full simulator over the merged question bank, Trap Master overlay highlights trap patterns per question.
5. **Reading Hard Sentences.** Sub-module for parsing dense LSAT prose. Cluster-sentences and complicated-sentence material lives here.
6. **Diagnostics plus Progress plus Mistake Profile.** Student review surface, post-module weakness profile, spaced repetition queue.

### Three-zone workspace shell

- **Persistent left rail**: module nav, progress per module, named tools list, command palette trigger, review queue badge.
- **Main canvas**: lesson, drill, simulator, vault, diagnostic content.
- **Right drawer**: opens in place for audit / coach / reference / journal. ESC closes. No backdrop dim. 180ms slide.

### Persistence (v1)

- Adapter pattern. App code talks to a `Persistence` interface only.
- v1 implementations: `LocalStoragePersistence` (default), `IndexedDBPersistence` (for R&R audio).
- v1.5 / future: swap in `SupabasePersistence` as a one-file change.
- Schema: UUIDs (UUIDv4), ISO 8601 timestamps, typed records that map cleanly to future Supabase tables.

### Source-backed UI slot rule

Every component must preserve visible slots for source-backed data:
- `source_item_id`, `question_id`, `lesson_id`, `named_tool_id`, `reference_id`, `trap_tag`, `correct_choice_id`, `review_queue_status`, `parity_status`

Components that visually hide source identity are rejected.

### AI Tutor

- v1: stub mode. Templated responses anchored to spec content. Suggested-question chips. No live LLM call.
- v1.5: live LLM with daily token cap per student.

### R&R Drill

- v1: audio recording (IndexedDB) plus templated diff highlighting.
- v1.5: LLM-driven semantic comparison with Left Out / Added / Mischaracterized auto-flagging.

### PT Bank integration (future)

Out of scope for v1. Planned for v1.5 or LSAT U absorption.

---

## 6A. DESIGN SCOUTING TOOLS (HYBRID PIVOT)

### Rule 1: 21st.dev is for primitives only. Never for layouts.

Use 21st.dev (`21st-dev/magic` MCP) for primitive components only:
- buttons (primary, secondary, icon)
- tabs, segmented controls
- drawer / inspector panel, bottom sheet
- command palette, search input
- filter chips, badges / tags
- answer choice rows (default / selected / committed / correct / wrong)
- audit row, coach note card, reference card
- loading skeleton, empty / error / success / locked states
- toast / inline alert
- compact data row, timeline row

Do NOT use 21st.dev for layouts. The library skews generic SaaS at layout scale.

### Rule 2: Direct reference apps for layouts.

Per Section 3B reference study.

### Rule 3: 21st.dev MCP is unreliable.

Empirical hit rate: 1 useful primitive per 7 calls. Prefer Inspiration Search over Magic Generate (Magic Generate has timed out 2 of 2 calls). One primitive at a time. If matches are rejection-tier, change query.

### Rule 4: Primitive prompt template

```
Generate 4 dark-mode premium {COMPONENT} variants for LSAT U.
Style: private academy, precise 1px borders, restrained warm gold accent, dense expert-tool feel.
Must support: keyboard focus, mobile state, loading/disabled/empty where relevant.
Hard no: generic SaaS gradients, confetti, mascot, fake analytics, childish gamification.
Placeholder content only.
```

### Rule 5: Known good primitive

The Fey.com Button technique (similarity 0.586 on "premium dark button" search):
- Inset 0.5px box-shadow border via `box-shadow: inset 0 0 0 0.5px hsl(var(--border))`
- After-pseudo crossfade for hover (no transform, eased 200ms)
- Subtle radial gradient base
- Theme-variable-driven colors

LSAT U adjustments: `rounded-md` not `rounded-full`, drop the LockIcon, warm gold accent, class-based dark mode.

### Rule 6: Scouting feeds Gate 3, never replaces it.

### Rule 7: Source-backed slot rule applies.

---

## 7. APPROVAL GATES

You do not skip gates. Each gate is explicit, blocking, and requires Joshua's written sign-off.

**Gate 0.** Source-Access Check. Verify all paths in Section 9.

**Gate 1.** Project Scaffolding and Reference Study. Per Section 3.

**Gate 2.** Content-Scope Inventory. Per Section 4. Tables A and B + Parity Artifacts.

**Gate 3.** Architecture Plan. Component tree, route map, persistence adapter sketch, integration points. Required inputs: approved Gate 1 + approved Gate 2.

**Gate 4.** Module-by-module build review. Each of six modules reviewed before next module starts.

**Gate 5.** Pre-merge final review. Full content-scope re-verified against parity artifacts.

---

## 8. WHAT MUST NOT HAPPEN

- Standalone is the v1 target. Do not build inside the LSAT U repo.
- Future LSAT U absorption is planned but out of scope for v1.
- Do not deploy externally without approval.
- Do not silently drop questions, drills, items, named tools, voice passages, or reference sections. Anything not in v1 sits on Table B with a reason.
- Do not rewrite Joshua's voice into generic editor tone.
- Do not skip gates.
- Do not start with code. Start with Gate 0.
- Do not treat the spec as the only source. Notes/, Homework/, Netlify prototypes are canonical.
- Do not introduce a backend in v1.
- Do not finish without confirming every reviewed source appears on Table A or Table B.

---

## 9. SOURCE PATHS

- Stage 1 to 3 full spec: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/spec.html`
- Stage summaries: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/stage_summaries/`
- Decisions log, voice rules, pedagogical flow, named-tools lexicon: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/rules/`
- Feature strategist enhancements: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/enhancements/feature_strategist_22_ideas.md`
- Audit tally: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/source_inventory/audit_tally.md`
- Project memory (read-only): `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_PROJECT.md`
- Notes corpus (canonical): `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Notes/`
- Homework corpus (canonical): `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Homework/`
- Netlify prototype source (canonical local copy): `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`
- This standalone project: `/Users/joshuaf/Documents/Claude/02_PROJECTS/main-conclusion-bootcamp/`

---

## 10. FIRST STEP

1. Run Gate 0. Verify every path in Section 9. Stop and report any inaccessible paths.
2. If Gate 0 passes, run Gate 1: produce the Project Scaffolding Plan and the Reference Study notes. No production code yet.
3. Wait for Joshua's approval before Gate 2.

In your first reply, restate, in your own words, that you have read this handoff and that you understand:

1. The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.
2. No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently. Missing content is a build failure.
3. The six Netlify prototypes are reference sources AND extraction sources. Any question, answer choice, explanation, drill, diagnostic, widget idea, or interaction pattern inside them must be inventoried.
4. This is a standalone v1 project. Future LSAT U absorption is planned but out of scope for v1. Architecture stays clean enough that absorption is a layer swap.
5. Persistence is adapter-pattern: app code talks to a `Persistence` interface, never localStorage / IndexedDB / Supabase directly. v1 ships LocalStorage and IndexedDB.
6. The visual quality bar is a sophisticated, premium private-academy bootcamp that matches or exceeds Causation Station and Abstraction. Generic SaaS, gamification, marketing heroes, vanity metrics, decorative animations are rejected.
7. The hybrid pivot for design scouting (Section 6A): 21st.dev MCP for primitives only. Direct reference apps for layouts. Scouting feeds Gate 3 as input, never replaces a gate.

Then run Gate 0 and deliver the result.

---

End of handoff. Loop closes back to Joshua at every gate.
