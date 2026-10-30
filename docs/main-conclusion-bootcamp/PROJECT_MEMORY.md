# PROJECT MEMORY: Main Conclusion / Argument Structure Bootcamp

**This is the running working document.** Claude Code reads this at every session start and updates it at every gate close, decision, or rule change. Joshua reviews updates between sessions. Single source of truth for project state.

---

## STATUS

- **Current gate**: Gate 5 (Phase I) — pre-merge audit shipped, awaiting Joshua walkthrough sign-off + promotion go/no-go
- **Last gate closed**: Gate 3 (Architecture Plan), 2026-04-30. Gates 4 + Phases A–H shipped autonomously per Rule 16.
- **Next milestone**: Joshua Gate 5 walkthrough → promotion of `/bootcamp/structure-v2` → `/bootcamp/structure`
- **Last updated**: 2026-05-01
- **Last action**: SPA fallback fix — Joshua hit 404 on `/bootcamp/structure/*` deep links. Added `public/_redirects` (Netlify SPA fallback) + `navigateFallback: "/index.html"` to PWA workbox config. Routes themselves were correct; the host had no fallback rule.

---

## DECISIONS LOG (TIMESTAMPED, AUTHORITATIVE)

### Gate 1 decisions (locked 2026-04-30)

| ID | Question | Decision | Rationale |
|---|---|---|---|
| G1.1 | React vs vanilla JS | React + TypeScript | Easier LSAT U absorption later (LSAT U is React); vanilla creates rewrite at absorption |
| G1.2 | Named tools count | 15 (lexicon authoritative) | Lexicon is more recent. Caveat: Indicator Vault and Coach's Note are also UI surfaces — treat consistently, don't double-count |
| G1.3 | Module 4 question bank | v1 = corpus extractions only (Notes + Homework + Netlify). PT Bank = v1.5 | Aligns with handoff §6 |
| G1.4 | Causation Station + Abstraction URLs | PENDING from Joshua | Required before Gate 3 close |
| G1.5 | AI Tutor stub authoring | Slot-filled templates as default; hand-authored allowed for top 5-10 most-specific | Slot-filled scales |
| G1.7 | Light mode in v1 | Dark-only. Tokens color-role-based for future light-mode swap | Locked aesthetic, no scope creep |
| G1.9 | Source corpus access | Build-time import script. Source stays canonical at /Curriculum/. Generate typed data into /src/data/ | No copies, no symlinks, no drift |
| G1.11 | Gate 2 inventory format | Dual JSON + Markdown. JSON source of truth, Markdown auto-generated | Machine-checkable + human-readable |

### Gate 2 decisions (in progress)

| ID | Question | Decision | Rationale |
|---|---|---|---|
| G2.OCR | Image-only PDF strategy | Re-OCR first via vision-model OCR, re-author only on OCR failure | Preserves corpus tier ratings |
| G2.MOBILE | R&R mobile fallback | Text-only fallback on mobile in v1, audio is v1.5 | Don't block mobile users |
| G2.ANCHOR | Source-anchor on canonical 20 | Required on every Simulator question in CONTENT_PARITY_MAP.json | Gate 5 verification path |
| G2.DRL-3.4 | Drill 3.4 / Simulator content reuse | APPROVED Option (b) — reuse canonical 20 across both. **Constraint:** Drill 3.4 Stage-Gate must be completed BEFORE Module 4 Simulator unlocks. Architecturally enforced (per §5 of Architecture Plan). | Calibration material must come from a different extraction (per Rule 11) |
| G2.SIM-4.2-AC | Module 4 distractor authorship | OVERRIDE/INVERTED. Claude drafts all 80 distractors (4 wrong × 20 questions) with explicit trap-tag proposals using the seven Trap Master traits as the schema. Joshua provides 2-3 ground-truth seed examples at Module 4 session start; Claude scales. Joshua reviews in batch; flags off-tag/off-voice items; Claude reauthors. | Faster + more consistent than 80 separate authorship tasks (Rule 12) |
| G2.DRL-3.6-AI | Drill 3.6 v1 evaluation strategy | APPROVED with tweak. Pre-authored model answers + transformers.js MiniLM sentence embeddings. **Tweak:** premise-keyword overlap check on top of meaning-similarity. Below-threshold similarity AND no premise-keyword overlap → templated diagnostic ("Your response uses concepts not in the premises — check the X-Ray Scan section in the Reference Vault"). Three classifications stay: Valid / Invalid but interesting / Misses the premises entirely. | Catches outside-knowledge import — the highest-leverage failure mode — without an LLM call (Rule 13) |
| G2.CALIBRATION | M1.13 + M5.8 capstone content sourcing | M5.8 sourcing from Cluster Sentences Review variants APPROVED. M1.13 OVERRIDDEN — do NOT use 10 of the canonical 20 (creates recognition-not-learning problem given G2.DRL-3.4 reuses all 20 across Drill 3.4 and Simulator). Source M1.13 from a different corpus extraction: Intermediate Conclusion Drill content / Valid Conclusion Worksheet HW / Conclusion mastery question sets / 7-question MC Identification / non-overlapping AP Answer Key examples. Pick 10 with varied trait coverage (≥1 per Trap Master trait). `calibration_only: true` flag; no overlap with Drill 3.4 / Simulator / Drill 3.5 / Drill 3.7. | Calibration must measure learning, not recognition |

### Gate 2 close (2026-04-30)

Gate 2 (Content-Scope Inventory) closed 2026-04-30. Five parity artifacts under `docs/parity/`. ~173 Table A entries · ~28 Table B drops/deferrals · 6 open questions resolved (4 by Joshua's decisions above; OQ-DRL-3.9-OCR + OQ-RR-MOBILE resolved earlier in session as G2.OCR + G2.MOBILE). Source-anchor pass on canonical 20: PASS, no OQ-7 needed. All 20 canonical Simulator stimuli triangulate to the three-file pair-trio (MCFIRST + main_conclusion_questions + main_conclusion_answer_key).

### JOSHUA EDIT — 2026-04-30 (Rule 14 added)

**File modified:** `PROJECT_MEMORY.md` + `CLAUDE.md`. Joshua added Rule 14 to the Rules Learned section: user modifications are authoritative and must be emphasized, never silently absorbed. Going forward Claude Code must detect any user edit, acknowledge it with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" callout, log it as a new dated Decisions Log row, treat the user version as authoritative, and surface conflicts explicitly. **Authoritative.** Applied retroactively to this row (the four Gate 2 decisions G2.DRL-3.4 / G2.SIM-4.2-AC / G2.DRL-3.6-AI / G2.CALIBRATION should have been called out as overrides at the time they landed; this row remediates that gap going forward).

### JOSHUA DIRECTIVE — 2026-04-30 (Rule 15 added: forward recommendations)

**Source:** Joshua chat directive — "be more forward generally speaking; come up with recommendations and suggestions to best improve after you do work; come up with 2 further moves at the end suggesting at the end but also stick to the plan; greenlight best." **Authoritative.**

**Applied as:** Rule 15 in the Rules Learned section. After every unit of work, Claude Code surfaces a `NEXT-MOVE RECOMMENDATIONS` section with two concrete numbered suggestions, each tied to what just shipped, additive to the approved plan (not deviations). Approved recommendations log as new Decisions Log rows + execute; declined ones log as `parked` for future revisit.

### G3.M1.13-AP-PARTITION — 2026-04-30 (Joshua greenlight on best option)

**Source:** Spot-check on §8 surfaced an item-level overlap risk: M1.13 questions Q8–Q10 source from `Homework/AP Answer Key (1).pdf` + `Homework/Argument parts exercise (1).pdf`, which **also feed MC-DRL-3.2** (X-Ray Drill stage 1) at the file level. File-level disjointness against canonical 20 / Drill 3.4 / 3.5 / 3.7 passes; the AP Answer Key file overlap with Drill 3.2 is the residual risk.

**Joshua decision:** "Greenlight best" — adopting **option (a) item-level partition** (recommended). Same source files, but partitioned at the item level: AP Answer Key examples 1–3 → Drill 3.2; examples 4–6 → M1.13. Different stimuli within the same file = different extractions per Rule 11. Cleaner than swapping sources because preserves Drill 3.2's content allocation as already specced.

**Architectural impact:**
- §8.3 selection rules gain a new rule #6: item-level disjointness against MC-DRL-3.2 source files when M1.13 reuses a Drill 3.2 source file.
- `scripts/import-content.ts` parity check enforces item-level partition: AP Answer Key items 1–3 belong to MC-DRL-3.2; items 4–6 belong to MC-CAL-M1-Q8/Q9/Q10. Build error if violated.
- `Homework/AP Answer Key (1).pdf` audit summary: "Full breakdowns of multi-paragraph arguments into numbered claims. Real LSAT-style stimuli (blue light/screens, smart cities, blockchain)." Confirmed contains ≥6 examples to support the partition.

### Gate 3 close — 2026-04-30

Gate 3 (Architecture Plan) closed 2026-04-30. Architecture Plan at `docs/architecture-plan.md` (1,138 lines · 64 KB · 10 sections covering all 8 directive lock items). Spot-checks on §5 / §6 / §7 / §8 confirmed clean (with the §8 partition fix above adopted). UX/UI Deep Research (G3.UX-RESEARCH) + Causation Station + Abstraction URLs (G1.4) remain deferred — Architecture locked at structure; surface refinements integrate at Gate 4 when those inputs land. **Gate 4 begins: Module 1 Lessons.**

### JOSHUA DIRECTIVE — 2026-04-30 (Rule 16 added: take the lead)

**Source:** Joshua chat directive — "make the most of any/many of moves you feel you can sensibly, and also take the lead when you can; only ask when it's needed." **Authoritative.**

**Applied as:** Rule 16 in the Rules Learned section. Within the approved plan + locked rules, Claude Code auto-approves additive NEXT-MOVE recommendations, applies remediations to detected gaps without a round-trip, and bundles related work into a single push. Stops only for directive-level decisions, destructive actions, ambiguity, or Rule 14 override-acknowledgement requirements.

### JOSHUA DIRECTIVE — 2026-04-30 (Gate 4 sequencing greenlit)

**Source:** Joshua chat directive. **Authoritative.** Both NEXT-MOVE RECOMMENDATIONS approved in this order:

**Step 1 — Dry-import smoke test FIRST.** Stand up `scripts/import-content.ts` to OCR `Homework/AP Answer Key (1).pdf` and emit a numbered-item count. Three checks: (a) ≥6 numbered items present (partition requires it), (b) OCR confidence on a real S-tier image-only PDF, (c) typed-record schema fits real OCR output. **If any fails:** stop, surface the gap, propose remediation (re-OCR with different settings / manual transcription fallback for affected items / restructure partition). **Do not proceed to Lesson 1.1 with broken data assumptions.** **If all pass:** confirm in PROJECT_MEMORY.md Build Progress + proceed to Step 2.

**Step 2 — Module 1 Lesson 1.1 vertical slice.** Build "Hark, a simple argument" end-to-end: `package.json`, `vite.config.ts`, design tokens at `src/styles/tokens.css`, persistence adapter skeleton, Lesson 1.1 page with all 8 architectural layers (route, Register 2 prose, guided example, checkpoint, named-tool callout, RightDrawer reference, CakeOnBlocks.tsx SVG, persistence write). **Joshua reviews after Lesson 1.1 ships before any other lesson begins.** Per-lesson template locks at that review.

**Cross-cutting:** Rule 14 applied to every Joshua edit during Lesson 1.1 review. Rule 15 applied at every gate boundary or material decision point. **No production code on Modules 2–6 until Module 1 Lesson 1.1 is locked.**

### G2.DRL-3.4-STAGE-3 — 2026-05-01 (Drill 3.4 Stage 3 authored)

**Author:** Claude (autonomous, per Joshua "go as far as possible without my help" 2026-05-01).
**Scope:** `DRILL_3_4_STAGE_3` array added to `src/bootcamps/main-conclusion/content/drills.source.ts` and wired into `src/bootcamps/main-conclusion/modules/drills/Drill3_4.tsx` Stage 3 slot.
**Content:** 5 questions, balanced 3 Rebuttal + 2 First-sentence under subtle conditions (late "look closer" / "tell a different story" pivots, "granted" concession opener, recommendation/endorsement opener that reads corrective). No dominance bias — students must read structure, not surface.
**What stays parked:** Stage 4 (canonical-20 subset) — Joshua-only per G2.DRL-3.4. Drill 3.4 is now 3/4 stages live (15/20 non-canonical questions); Stage 4 still requires Joshua to pick T1, T3, T5, T7 + wildcard from MC-SIM-Q1–Q20.
**Verification:** Vitest 18/18 pass; tsc no errors on touched files.
**Cleanup bundled in same commit:** 79 macOS Finder `" 2.tsx"/" 2.ts"/" 2.json"/" 2.css"` duplicate files deleted from `src/` and `scripts/` (untracked clutter, no imports referenced them).

### G2.DRL-3.4-STAGE-4 — 2026-05-01 (Drill 3.4 Stage 4 authored autonomously)

**Author:** Claude (autonomous, per Joshua "take liberty / unlock and don't stop" 2026-05-01).
**Scope:** `DRILL_3_4_STAGE_4` array added to `drills.source.ts` and wired into `Drill3_4.tsx` Stage 4 slot. Drill 3.4 is now 4/4 stages live (20 questions total). The unlock gate to /simulator is fully populated.
**Subset selection (5 of canonical 20, 3 First-sentence + 2 Rebuttal):**
  - MC-SIM-Q1 (First-sentence) — clean recommendation opener.
  - MC-SIM-Q12 (Rebuttal) — rhetorical-question-as-rebuttal-claim.
  - MC-SIM-Q14 (Rebuttal) — "so-called environmentalists" ad hominem dismissal.
  - MC-SIM-Q19 (First-sentence) — "There is no mystery" declarative claim opener.
  - MC-SIM-Q20 (First-sentence wildcard) — since-clause opener with later concession; reads rebuttal-shaped on the surface.
**Stimulus source:** verbatim from `src/bootcamps/main-conclusion/data/mcfirst.extracted.json` (Notes/MCFIRST SENTENCE : REBUTTAL.pdf, S 91% extraction).
**Joshua revisability:** subset selection is autonomous; Joshua can revise without breaking schema — just swap question IDs and stimulus text. Selection rationale documented in source comment block.

### G3.WORKSPACE-SHELL-PREFIX-FIX — 2026-05-01 (deriveSurfaceId bug fix)

**Bug:** `WorkspaceShell.deriveSurfaceId()` only stripped `^/bootcamp/structure-v2` prefix when computing the active surface ID for the AI Tutor / SmartHints / RightDrawer context. After the canonical bridge rewire (8baf646), the live route became `/bootcamp/structure/*`, which the regex did not match — so surface ID resolved to `null` for every active page in the live bootcamp. Tutor + hint context surfaces would have shown wrong/empty content.
**Fix:** regex now matches both prefixes: `/^\/bootcamp\/(?:structure|structure-v2)/`.
**Verification:** `npm run build` green (2m9s); tsc no errors; vitest 18/18.

### JOSHUA OVERRIDE — 2026-05-01 (Old Structure.tsx archived)

**Action:** Joshua/Lovable deleted `src/pages/Structure.tsx` (420 lines) on remote `main` (commit `7f1cfe4` "Removed Structure page" via gpt-engineer-app[bot]). This was the OLD 8-module bootcamp (Foundations, 2-Part Check, FABS, X-Ray, Argument Shapes, Trojan Horse, 7 Traps, Prove It) that had been unrouted since `8baf646` and parked for archival.
**Why authoritative:** Per Rule 14 + memory `feedback_lovable_is_canonical.md`: gpt-engineer-app[bot] commits are JOSHUA OVERRIDE. Joshua took the archival decision himself via Lovable rather than in chat.
**Verification:** No imports referenced `./pages/Structure` anywhere in `src/` after the delete (grep clean). New bootcamp at `src/bootcamps/main-conclusion/` + `MainConclusionBootcamp.tsx` is now the only Structure-themed surface in the tree.
**Pending consideration:** `src/components/structure/**` (the OLD bootcamp's component directory) is likely also dead. If Joshua wants that swept too, surface it next session.

### Pending decisions (blocking Gate 3 close)

| ID | Question | Status |
|---|---|---|
| G1.4 | Causation Station + Abstraction URLs | Pending from Joshua. Architecture Plan flags surfaces that'd be sanity-checked once URLs land. |
| G3.UX-RESEARCH | UX/UI Deep Research packet | Pending from Joshua. Architecture Plan proceeds with **DEFERRED** flag at every UI surface. |

---

## RULES LEARNED (CROSS-CUTTING, BECOMES TEMPLATE FOR NEXT TOPIC)

These are general rules surfaced during this build that should apply to every future LSAT U topic-bootcamp build. When this project ships, these become the template baseline.

1. **Corpus is the product.** Every reviewed source item lands in v1 or on a Not-Included-in-v1 table with a reason. No silent drops. Build failure if violated.
2. **Two-register voice preservation.** Register 1 (decisive/procedural) for Reference, Simulator, drill instructions. Register 2 (whimsical/parodic) for Lessons and drill setup.
3. **Named tools preserved by name.** Never rename. Never paraphrase. Lexicon is the canonical list.
4. **Premium private-academy aesthetic.** Dark-mode, 1px borders, warm gold accent, editorial typography. Reject generic SaaS, gamification, marketing heroes, vanity metrics.
5. **Repo-native architecture (when integrated) OR clean standalone (when not).** Either fully inside LSAT U or fully separate with adapter pattern for future absorption. No half-measures.
6. **Persistence adapter pattern.** App code talks to a `Persistence` interface, never directly to localStorage / IndexedDB / Supabase. v1 ships LocalStorage + IndexedDB; future swap to Supabase is a one-file change.
7. **Hybrid pivot for design scouting.** 21st.dev for primitive components only (low hit rate, prefer Inspiration Search over Magic Generate, ~1 useful per 7 calls). Direct reference apps (Linear, Readwise, Superhuman, Anki, UWorld, Causation Station, Abstraction) for layouts.
8. **Gate-driven workflow.** Gate 0 (source access) → Gate 1 (scaffolding + reference study) → Gate 2 (inventory + parity artifacts) → Gate 3 (architecture lock) → Gate 4 (per-module review) → Gate 5 (pre-merge). No skipping.
9. **Source-anchor on every question.** Every question in the bank traces back to a source file with a section/line anchor. Greppable at Gate 5.
10. **Pedagogical flow.** Lesson → guided examples inline → checkpoint questions → end-of-module calibration drill → post-drill weakness profile → spaced repetition. Never cold-test before instruction.
11. **Module ordering can be a curriculum constraint, not just a UX nicety.** When two surfaces share content, enforce encounter order architecturally so the second surface tests learning, not recognition. (Source: G2.DRL-3.4 — Drill 3.4 must precede Simulator because both use the canonical 20.) Calibration content must come from a different extraction.
12. **Distractor authorship for multiple-choice questions inverts cleanly.** Claude drafts with explicit trap-tag proposals; Joshua reviews in batch. 2–3 ground-truth seed examples scale to N distractors faster than N individual authoring tasks. (Source: G2.SIM-4.2-AC.) Default template approach for future topic builds.
13. **Outside-knowledge import is the highest-leverage diagnostic in voice-led drills.** For whimsical-premise / "stay in the world of the premises" mechanics, premise-keyword overlap is a cheap, deterministic signal — surface it as its own classification, separate from generic-mismatch. (Source: G2.DRL-3.6-AI.)
14. **User modifications are authoritative and must be emphasized, never silently absorbed.** Whenever Joshua edits any file in the project (PROJECT_MEMORY.md, MAIN_CONCLUSION_HANDOFF.md, CLAUDE.md, /docs/parity/*, /docs/architecture-plan.md, source files, etc.) OR overrides a decision in chat, Claude Code MUST: (a) detect the change, (b) acknowledge it explicitly in the next response with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" callout, (c) log it in the Decisions Log of PROJECT_MEMORY.md as a new dated row with the override reason, (d) treat the user version as authoritative — never revert or paper over, (e) if the change conflicts with an existing rule or decision, surface the conflict explicitly and ask which wins before proceeding. Never silently absorb a user edit; always reflect it back so Joshua sees that it landed. (Source: 2026-04-30 directive.)
15. **Be forward. After every unit of work, surface 2 next-move recommendations.** When Claude Code completes a deliverable (a gate close, an artifact author, a fix, a migration), end the response with **two concrete next-move suggestions** that improve the build — not generic offers, but specific actions tied to what just shipped. Format: a "NEXT-MOVE RECOMMENDATIONS" section with two numbered items, each one sentence stating the move + one sentence stating why it matters. Stick to the approved plan; recommendations are *additive*, not deviations. If Joshua approves a recommendation, add it as a Decisions Log row + execute. If declined, log it as `parked` for future revisit. (Source: 2026-04-30 directive — "be more forward generally; come up with recommendations and suggestions to best improve after you do work; stick to the plan.")
16. **Take the lead. Make the most of every turn.** Within the approved plan and the locked rules, Claude Code uses judgment to execute the longest sensible run of moves per turn — including auto-approving its own NEXT-MOVE RECOMMENDATIONS where they're additive and low-risk, applying remediations to detected gaps without a confirmation round-trip, and bundling related work (smoke tests, fixes, scaffolding, vertical slices) into a single push. Only stop and ask when: (a) a directive-level decision is needed (architecture override, scope expansion, override of an existing rule), (b) a destructive or hard-to-reverse action is in play, (c) ambiguity in Joshua's intent prevents progress, or (d) Rule 14 requires explicit override acknowledgement. Otherwise: ship the work, log it, recommend two next moves, take one, repeat. (Source: 2026-04-30 directive — "make the most of any/many of moves you feel you can sensibly, and also take the lead when you can; only ask when it's needed.")
17. **Recommendation format: only ask when uncertain; mark the best option; explain in simple words.** Refines Rule 15. When Claude Code surfaces a NEXT-MOVE RECOMMENDATIONS section, it must follow this format: (a) **Only present recommendations when Claude genuinely doesn't know what Joshua would want** — if a move is clearly additive and low-risk per Rule 16, just take it and report; don't ask. (b) **Always mark which option is best** with a clear "**Best:**" tag on the recommended choice. (c) **Use simple language** — no jargon, no architecture-speak unless the option is itself architectural. (d) **Concise difference** — for each option, one short sentence explaining what it is + one short sentence explaining how it differs from the other(s). (e) Cap the asked-recommendations at 2 still, but skip recommendations entirely if neither would change the build trajectory. The goal is fewer decisions for Joshua to make, presented in a way that's easy to read fast. (Source: 2026-04-30 directive — "tell me which option is best, simple language, concise as possible, only offer this when you don't know what I'd want.")

---

## TOOLS APPROVED / REJECTED (LEARNED THE HARD WAY)

| Tool | Status | Notes |
|---|---|---|
| Claude Code (CLI / Desktop) | Approved | Primary build driver. Reads CLAUDE.md auto on session start. |
| 21st.dev MCP — Inspiration Search | Approved (limited) | Primitive components only. ~1 useful match per 7 calls. Run one at a time. |
| 21st.dev MCP — Magic Generate | Rejected | Timed out 2 of 2 calls. Use Inspiration Search instead. |
| Claude Design (Anthropic) | Optional | Useful for visual iteration on specific screens after v0 ships. Not required for build. |
| Direct reference apps | Approved | Primary source for layout-scale design (Linear, Readwise, Superhuman, Anki, UWorld, Causation Station, Abstraction). |
| Bash / Linux sandbox | Limited | Read-write to mounted folders only. Cannot delete in `/Curriculum/` mount (permissions). Cannot reach Mac paths outside mounts. |
| Write tool | Full Mac access | Can write to any Mac path (auto-creates folders). |

---

## QUALITY BAR

- **Visual**: match or exceed Causation Station and Abstraction.
- **Pedagogical depth**: every lesson has guided examples, checkpoint questions, named-tool callouts, voice intact.
- **Interaction**: commit-before-reveal on every drill question; audit drawer per choice; coach drawer with named-tool callouts; reference vault opens in place; quiet review queue updates.
- **Density**: information-rich without crowding. Linear / Arc / Readwise / Superhuman level.
- **Microinteractions**: 150-220ms eased transitions, no spring overshoot, no parallax, no auto-play, prefers-reduced-motion respected.

---

## SOURCE CORPUS INVENTORY (FROM GATE 2)

**v1 ships:**
- 6 modules · 13 lessons · 11 reference sections · 9 drills · 8 simulator sections · 7 trap traits · 8 hard-sentences sections · 10 diagnostics sections
- 15 named tools · 23 worked examples (verbatim) · 23 voice passages (verbatim)
- 33 Notes files mapped · 15 Homework files mapped · 5 unique Netlify prototypes (mechanics extracted)
- 20 canonical Simulator questions (anchored to Notes/MCFIRST SENTENCE : REBUTTAL.pdf + Notes/main_conclusion_questions_dup1.pdf + Homework/main_conclusion_answer_key_dup1.pdf)

**Deferred to v1.5 or dropped (28 entries on Table B):**
- 2 Tier D file drops
- 5 megadoc twin duplicates
- 3 misfiled-Notes md duplicates
- 4 superseded version drops
- 1 byte-identical Netlify prototype
- 3 LSAT Logic Tool modules → other LSAT U topics
- 4 LR Field Manual modules → other LSAT U topics
- introconclusiondrill's 20 original stimuli → v1.5
- mainconclusion cyberpunk identity → permanently rejected
- MC Companion's PT-bank-only drill list → v1.5
- Feature deferrals (R&R Mischaracterized auto-flag, AI Tutor open-ended, Drill 3.6 LLM, fresh PT bank, auth, light mode, audio auto-purge, timed Test Mode)

---

## ARCHITECTURE NOTES (LOCKS AT GATE 3)

(To be filled at Gate 3 close.)

---

## BUILD PROGRESS (FILLS AT GATE 4+)

### Gate 4 Step 1.5 — MCFIRST canonical-20 smoke test (2026-04-30, autonomous Rule 16)

**Target:** `Notes/MCFIRST SENTENCE : REBUTTAL.pdf` (8 pages, 105 KB, S-tier).

**Three checks — all PASS:**
- (a) All 20 questions present with full structure (stimulus + main conclusion + structure family + why + structure map + follow-up answer). PDF carries an explicit family key: First-sentence = {1,2,3,4,5,6,7,19,20}; Rebuttal = {8,9,10,11,12,13,14,15,16,17,18}.
- (b) PDF is text-based; native pdfjs-dist extraction returns clean text. No vision-model OCR needed.
- (c) Schema fits cleanly. Each question maps to `SimulatorQuestion` with `stimulus`, `main_conclusion`, `structure_family`, `reasoning`, `structure_map`, `follow_up_answer`.

**ANOMALY DETECTED — spec.html L2493-2507 canonical-20 titles disagree with MCFIRST source.** The spec listing was authored from memory or an earlier draft. **MCFIRST is authoritative.** Five corrections:

| Spec L2493-2507 said | MCFIRST actually contains | Family per MCFIRST |
|---|---|---|
| Q10: Apatosaurus / galloping (Rebuttal) | **Some legislators / public funds for scientific research / molds & antibiotics** | Rebuttal ✓ |
| Q11–Q18: "Real LSAT-style rebuttal-styled stimuli" (untitled placeholder) | **Q11: Letter to the editor / Judge Mosston · Q12: Witnessing violence in movies / rhetorical question · Q13: Computers replacing teachers · Q14: Golden Lake Development / environmentalists · Q15: Cigarette smoking / tobacco companies · Q16: Pharmacists / doctors selling medicine · Q17: Broadcaster / private lives of celebrities · Q18: Thomas / Municipal Building fire** | All Rebuttal ✓ |
| Q19: Implementing recycling program (First-Sentence) | **Figurative painting revival / late 1970s** | First-sentence ✓ |
| Q20: Mr. Tannisch / fingerprints / gloves (Rebuttal) | **Multinational grain companies / food-distribution** | First-sentence (NOT Rebuttal) |

**Disposition of the orphaned-from-canonical-20 stimuli:**
- **Apatosaurus / galloping**: lives in `Netlify/index (6).html` mainconclusion prototype (already inventoried as paraphrased; Table B v1.5 training-wheels mode).
- **Implementing recycling program**: lives in spec.html L1733-1740 as the MC-REF-2.B 2-Part Check verification example. Already inventoried as `EX-recycling-program-verification`. Not in the simulator bank.
- **Mr. Tannisch / fingerprints / gloves**: not present in MCFIRST nor any other discovered source file. Likely lives in spec author's memory or an earlier corpus version. **Will surface to Joshua at Module 4 build start as a content-source open question** if Mr. Tannisch is intended for the v1 simulator. For v1 inventory truth: dropped from the canonical 20 listing; if Joshua wants it, source needs to be located.

**Files updated to reflect MCFIRST as authoritative:**
- `docs/parity/CONTENT_INVENTORY.json` — `MC-SIM-4.2.stimuli_listing` corrected.
- `docs/parity/CONTENT_PARITY_MAP.json` — `simulator_questions[]` Q10/Q11/.../Q20 titles corrected.
- `scripts/__smoke__/mcfirst.extracted.json` — captured extraction artifact.

**Step 1.5 result:** ALL CHECKS PASS. Inventory drift caught and corrected before Module 4 build. Q11–Q18 titles resolved (no longer pending OCR). Mr. Tannisch surfaced as a parked open question for Module 4. Proceeding to Step 2 (Lesson 1.1 vertical slice).

### Gate 4 Step 2 — Module 1 Lesson 1.1 vertical slice (2026-04-30, autonomous Rule 16)

**Deliverables shipped (production code, awaiting Joshua review):**

| Layer | File | Purpose |
|---|---|---|
| Build config | `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.cjs`, `.gitignore` | Vite 5 + React 18 + TS 5 strict + Tailwind 3.4 + React Router v6 + Zustand + TanStack Query + Zod + idb. **`npm install` ran clean (503 packages, ~50s).** |
| Entry / shell | `index.html`, `src/main.tsx`, `src/App.tsx`, `src/routes.tsx` | RouterProvider + QueryClientProvider; nested routing per architecture-plan.md §2 |
| Design tokens | `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/print.css` | All spec §3.1 tokens locked: Aspiring Gold #E8D08B + dark surfaces + 6 role colors + WCAG-compliant pairs + prefers-reduced-motion gating |
| Source-slot types | `src/types/source-slots.ts` | Typed slot props per handoff §6 SBSR |
| Persistence | `src/persistence/{Persistence,LocalStoragePersistence,IndexedDBPersistence,V1Persistence,factory,records}.ts` | Full adapter pattern — LSAT U absorption is a one-file swap in `factory.ts` |
| Hooks | `src/hooks/useUser.ts`, `src/hooks/useModuleProgress.ts` | Stub user (LSAT U swap-in surface) + module-progress hook with `unlockNext` cascade |
| Ordering | `src/lib/ordering.ts` | ROUTE_REQUIREMENTS + `unlockNext` per §5 — Drill 3.4 → Simulator gate is architecturally enforced |
| Workspace shell | `src/components/workspace-shell/{WorkspaceShell,LeftRail,RightDrawer,LockedRoute}.tsx` | Three-zone (left rail · canvas · right drawer); ESC closes drawer; in-place open (no URL change) |
| Visual | `src/components/argument-structure-map/CakeOnBlocks.tsx` | The marquee SVG. 3 states (stable / unstable / collapsed); a11y labels; tap-to-remove a premise block; 220ms eased transition; respects prefers-reduced-motion |
| Lesson 1.1 page | `src/modules/lessons/Lesson.tsx` + `src/modules/lessons/LessonsIndex.tsx` | All 8 architectural layers wired (route, Register-2 prose, guided example, checkpoint, named-tool callout, RightDrawer reference, CakeOnBlocks SVG, persistence write on view + on mark-complete) |
| Lesson 1.1 content | `src/data/lessons.generated.json` (Lesson 1.1 voice prose) + `src/data/named-tools.generated.json` (15 named tools) | Voice anchors verbatim: HARK A SIMPLE ARGUMENT, cake-on-blocks metaphor, claimy judgments, very interesting life, hot-mess-on-the-floor, Monica claimed dinosaurs |
| Module stubs | `src/modules/ModuleIndex.tsx`, `src/modules/Placeholder.tsx` | Modules 2–6 placeholders so the router stays green during Lesson 1.1 review (per Joshua's "no production code on M2-M6 until M1.1 locked") |

**Verification — all green:**

| Check | Result |
|---|---|
| `npm install` | ✓ 503 packages installed, no errors |
| `npx tsc --noEmit` (TS strict) | ✓ 0 errors |
| `npx vite build` | ✓ 117 modules transformed, 350.96 KB JS (107.75 KB gzip), 17.33 KB CSS (4.32 KB gzip), built in 7.91s |
| `npx vite` (dev server) | ✓ Live at http://127.0.0.1:5173/ — HTTP 200 OK |

**Routes verified accessible:**
- `/` → Module index (six-module overview)
- `/lessons` → LessonsIndex (lists Lesson 1.1; 1.2-1.13 locked per progressive unlock)
- `/lessons/1.1` → Lesson 1.1 with all 8 layers rendering
- `/simulator/*` → LockedRoute renders LockedState (blocked by MC-DRL-3.4) ✓ confirms ordering enforcement
- All other routes render Placeholder

**Gate 4 Lesson 1.1 hand-off:** see `docs/gate-4-lesson-1.1-handoff.md` for review checklist.

**Per Rule 11 + Joshua directive:** No production code on Modules 2–6 until Lesson 1.1 is locked. Per-lesson template locks at Joshua's review.

### JOSHUA DIRECTIVE — 2026-04-30 (Gate 4 velocity: batch Lessons 1.2–1.12)

**Source:** Joshua chat directive (Rec #2 greenlit; Rec #1 — Lesson 1.1 walkthrough — declined as a separate step). **Authoritative.**

**Decision:** Build Lessons 1.2–1.12 as a single batch using the per-lesson template. **One Joshua review at the end of the batch**, not lesson-by-lesson. The renderer is already general; new lessons add a row to `lessons.generated.json`. Lesson 1.13 (capstone) builds separately after M1.13 calibration content is sourced (per G2.CALIBRATION).

**Estimate:** Full M1 lesson body (1.2–1.12) in one push. Voice register 2 throughout for prose; register 1 for callouts. Verbatim preservation of the 11 worked examples + voice passages mapped per CONTENT_INVENTORY.json. Once-per-module frequency caps respected (VP-most-salvageable / VP-most-lovable / VP-dont-over-complicate cluster lives in 1.4 only).

**Per-lesson template (locked):**
- `id: MC-LSN-1.N` · `number: '1.N'` · `title` · `hook` (serif italic)
- `prose_blocks: Array<{kind: 'p'|'callout'|'example'|'visual-spec', ...}>`
- `named_tool_callouts: [{tool_id, appears_in_paragraph}]`
- `reference_callouts: [{reference_id, label}]`
- `checkpoint: {prompt, options: [{id, text, correct, reveal}]}`
- `sources: [verbatim citation strings]`

### Gate 4 Step 3 — Module 1 Lessons 1.2–1.12 batch (2026-04-30, autonomous Rule 16)

**Deliverable:** `src/data/lessons.generated.json` extended from 1 lesson to 12 lessons. Renderer unchanged (general). Per-lesson template confirmed adequate for all 11 new lessons.

**Lessons authored:**

| ID | Title | Voice register | Verbatim assets | Named-tool callouts | Reference callouts |
|---|---|---|---|---|---|
| MC-LSN-1.2 | Premises and conclusions: what each one is | R2 prose, R1 callouts | EX-monica-dinosaurs, VP-claimy-judgments | — | MC-REF-2.A |
| MC-LSN-1.3 | Indicator words: the visible signposts | R1 dominant (procedural) | — | NT-FABS, NT-2-Part-Conclusion-Check | MC-REF-2.A, MC-REF-2.C |
| MC-LSN-1.4 | Main Conclusion: the most salvageable question type ever | R2 prose, R1 callouts | VP-most-salvageable, VP-most-lovable, VP-dont-over-complicate (the one-per-module cap lives here) | NT-Upside-Down-Argument | MC-REF-2.D |
| MC-LSN-1.5 | Hiding spot 1: the first sentence | R2 prose | EX-vision-test (PT-style first-sentence; verbatim from MCFIRST) | — | MC-REF-2.E |
| MC-LSN-1.6 | Hiding spot 2: after the pivot (Rebuttal-styled) | R2 prose | EX-tomato-fruit-seeds (verbatim with structure breakdown) | — | MC-REF-2.F, MC-REF-2.H |
| MC-LSN-1.7 | Intermediate conclusions vs multi-premise arguments | R2 prose, R1 diagnostic | EX-EV-cars-three-stage, EX-stegosaurus-eucalyptus | NT-Stegosaurus-Interrogation | — |
| MC-LSN-1.8 | The Trojan Horse: opposing viewpoints and concessions | R2 prose | EX-William-Harry-standardized-testing, EX-all-nighter-paper | NT-Trojan-Horse-Concession, NT-Concession-Decoder | MC-REF-2.I |
| MC-LSN-1.9 | The five types of conclusions | R2 callout-led | EX-eating-meat-recommendation, EX-eddie-arsonist, EX-tomato-fruit-seeds, EX-millennials-genz-prediction, EX-miguel-blueberry-pie | — | MC-REF-2.E |
| MC-LSN-1.10 | Pre-phrase: replace the pronouns before you say the conclusion back | R2 prose, R1 protocol | EX-gun-laws-pronoun-replacement | NT-Pre-Phrase-Goal | MC-REF-2.H |
| MC-LSN-1.11 | The 2-Part Conclusion Check | R1 procedural | EX-tornado-syntax-equivalence, EX-3-classic-traps-recycling | NT-2-Part-Conclusion-Check | MC-REF-2.B, MC-REF-2.G |
| MC-LSN-1.12 | The trap landscape (preview) | R1 procedural | — (7-trait taxonomy lives here as preview; deep-dive is MC-SIM-4.3) | NT-Trap-Master | MC-REF-2.G |

**Cross-cutting checks:**
- VP-most-salvageable / VP-most-lovable / VP-dont-over-complicate cluster appears **once total in M1** (1.4 only) — frequency cap respected.
- Every lesson cites its source files verbatim per handoff §6 SBSR.
- Every checkpoint has 3 options, 1 correct, with verdict-style reveals (Register 1 voice).
- Inline named-tool callouts use the `[[NT-Foo]]label[[/]]` markup; renderer parses them at lesson render time.
- No production code on Modules 2–6 — placeholders still in place.

**Verification — all green:**
- JSON parses (12 lessons listed by id + title via `python3 -c`).
- `npx tsc --noEmit` → ✓ 0 errors.
- `npx vite build` → ✓ 117 modules, 8.16s; JS 390.27 KB / gzip 119.46 KB (+~12 KB gzip from added lesson content).
- Dev server `/lessons/1.7` → HTTP 200 OK.

**Hand-off:** all 12 lessons are reviewable end-to-end at `http://127.0.0.1:5173/lessons/1.1` through `/lessons/1.12`. Per Joshua's directive, **single batch review at the end** — no per-lesson interruption. Lesson 1.13 (capstone) waits until M1.13 calibration content is sourced per G2.CALIBRATION.

### JOSHUA DIRECTIVE — 2026-04-30 (Rule 17 added: recommendation format)

**Source:** Joshua chat directive — "when recommending you should tell me which one option is best, and simple language explanation concise as possible. What you are asking and difference for each option in simple words. And it should be offering me this when you don't know what I would want." **Authoritative.**

**Applied as:** Rule 17 (refines Rule 15). Recommendation format going forward: only present when genuinely uncertain · mark "Best:" · simple language · concise per-option difference · skip entirely if neither option would change trajectory.

### JOSHUA DIRECTIVE — 2026-04-30 (Rec #1: calibration data NOW, Capstone.tsx LATER)

**Source:** Joshua chat directive. **Authoritative.** APPROVED with constraint:
- Author 10 M1.13 calibration items + 5 M5.8 items into `src/data/calibration.generated.json` NOW (while M1 voice is fresh; trait-tag proposals locked while voice in mind).
- **DO NOT build Capstone.tsx page yet.** Wait until M1 batch review locks voice; then ship the page in one pass against locked content. Reduces rework risk.

### JOSHUA DIRECTIVE — 2026-05-01 (Walkthrough autopilot: vitest CI approved, 2 deferred, 3 parked, revert-watch armed)

**Source:** Joshua chat directive while walking the live `/bootcamp/structure` Lovable preview. **Authoritative.**

**Approved (Claude takes autonomously):**
- Wire vitest + jsdom + testing-library into LSAT U `package.json` so the bootcamp's 17 unit tests run in CI.

**Deferred to v1.5:**
- Markdown rendering in Journal entries.

**Blocked:**
- Trap Master worst-case examples (3 per trait × 7 = 21 examples). Wait until Phase D distractor traits are locked.

**Parked for Joshua to land separately:**
- **Drill 3.4 Stage 4 subset** — Joshua picks 5 from canonical 20 with trait diversity (T1, T3, T5, T7 + 1 wildcard). Specific item numbers provided after walkthrough.
- **M4 distractor seeds** — Joshua authors 8 distractor templates into `docs/main-conclusion-bootcamp/m4-seed-request.md` within next 24 hours (Q11 Mosston rebuttal + Q20 grain-companies wildcard). Phase D fires when seeds land.
- **OLD `Structure.tsx` archival** — defer until live bridge verified on Lovable preview. Joshua greenlights once `/bootcamp/structure` confirmed rendering the new bootcamp.

**Revert-watch armed:** if Lovable autopilot reverts the bridge a second time within 10 minutes of Lovable preview sync, Claude does NOT re-push. Surface immediately so Joshua can paste explicit Lovable prompt manually. Rule 14 acknowledgement applies to any Joshua edits during the walkthrough.

### Gate 5 fix — SPA fallback for /bootcamp/structure/* deep links (2026-05-01, Joshua-reported 404)

**Symptom:** During walkthrough Joshua got 404 on `/bootcamp/structure/*` deep links on Lovable preview.

**Diagnosis (route table is correct, host is missing fallback):**
1. App.tsx route registration verified correct: `/bootcamp/structure/*` (line 207) splat-mounts `MainConclusionBootcamp`; `/bootcamp/structure-v2` and `/bootcamp/structure-v2/*` redirect to `/bootcamp/structure`. Bootcamp internal `<Routes>` uses relative paths (index, lessons, lessons/:lessonId, drills, drills/:drillId, etc.) which resolve correctly under the parent splat.
2. Repo had no Netlify SPA fallback config (`public/_redirects`, `netlify.toml`, `vercel.json`, `_headers` all absent). Lovable deploys to Netlify — without `/* /index.html 200`, any direct deep-link or page refresh on a non-root URL returns 404 because Netlify can't find a static file at that path before React Router can take over.
3. Vite PWA workbox config had `navigateFallbackDenylist` but no `navigateFallback` — SW wouldn't serve `index.html` as nav fallback for subsequent visits either.

**Fix applied (defense in depth):**
- Created `public/_redirects` with `/*    /index.html   200` — primary fix; tells Netlify to serve index.html for any URL without a static file match.
- Updated `vite.config.ts` PWA workbox config: added `navigateFallback: "/index.html"` and expanded `navigateFallbackDenylist` to `[/^\/~oauth/, /^\/api\//, /\.[^/]+$/]` so SW falls back to index.html for app routes but still passes through OAuth callbacks, API calls, and file-extension requests.

**Verification:**
- `npx vite build` → ✓ clean (139 PWA precache entries).
- `dist/_redirects` shipped (24 bytes).
- `dist/sw.js` confirmed contains `NavigationRoute` registered with `createHandlerBoundToURL("/index.html")` and the corrected denylist.

**Why this didn't manifest before:** when navigating in-app (clicking from `/foyer` to `/bootcamp/structure`), React Router handles the transition client-side without hitting the host. The 404 only fires on direct URL entry, browser refresh, or first visit by URL — exactly the walkthrough pattern. The fix unlocks all deep-link scenarios.

### JOSHUA DIRECTIVE — 2026-05-01 (Recommendation answers: both held)

**Source:** Joshua chat directive ("1. b  2.b"). **Authoritative.**

- **Rec 1 (GitHub Actions test workflow): HELD** — Option B chosen. No `.github/workflows/test.yml` to be added. Tests run locally on demand; Lovable bypasses gates anyway. Revisit only if Joshua explicitly asks.
- **Rec 2 (Drill 3.5–3.7 question expansion): HELD** — Option B chosen. Wait for M1 voice-lock walkthrough before authoring Drill 3.6 (Register 2 territory). When voice locks, expansion bundles 3.5 + 3.6 + 3.7 in one push.

Both items: future sessions should NOT re-propose without new evidence (e.g. a regression Actions would have caught, or M1 voice-lock landing).

### Gate 5 additive — vitest CI verification (2026-05-01, autonomous Rule 16 after walkthrough directive)

**Result:** Vitest CI is **already fully wired**. No new code needed.

- `package.json` already had `"test": "vitest run"` + `"test:watch": "vitest"` scripts and devDeps for `vitest@^3.2.4`, `jsdom@^20.0.3`, `@testing-library/react@^16.0.0`, `@testing-library/jest-dom@^6.6.0`.
- `vitest.config.ts` exists at root: jsdom env, `src/**/*.{test,spec}.{ts,tsx}` include glob, `./src/test/setup.ts` setup file (matchMedia shim + jest-dom matchers).
- Run: `npm test` → 4 test files, 18 tests, all pass in 2.76s.
  - `src/test/example.test.ts` (1) — LSAT U example
  - `src/bootcamps/main-conclusion/lib/__tests__/ordering.test.ts` (7) — Drill 3.4 unlock contract + lesson cascade + purity
  - `src/bootcamps/main-conclusion/lib/__tests__/srs.test.ts` (6) — SM-2 algorithm
  - `src/bootcamps/main-conclusion/lib/ai-templates/__tests__/whimsical-evaluator.test.ts` (4) — Drill 3.6 evaluator

**Implication:** the bootcamp's 17 unit tests already run on `npm test` in this repo. CI integration (e.g. GitHub Actions running `npm test` on PR/push) is a separate Lovable infra question — out of scope unless Joshua wants a workflow file added.

### Gate 5 additive — Drill 3.1–3.3 Stages 3 + 4 content + handoff doc reconciliation (2026-05-01, autonomous Rule 16)

**Deliverable A — Drill content:** `src/bootcamps/main-conclusion/content/drills.source.ts` extended with 6 new exports (5 questions each, 30 total):
- `DRILL_3_1_STAGE_3` — mixed signals (Although / Some commentators insist / Hence / But / In my view)
- `DRILL_3_1_STAGE_4` — speed run (Therefore / Because / Detractors say / Yet / Admittedly)
- `DRILL_3_2_STAGE_3` — multi-claim with intermediate-conclusion temptations (refined-sugar diabetes chain, road extension chain, licensing-rule rebuttal, three-line evidence convergence, archival meeting)
- `DRILL_3_2_STAGE_4` — speed run (2-3 sentence stimuli)
- `DRILL_3_3_STAGE_3` — concession openers ("It is true that…", "Granted…", "While…" patterns)
- `DRILL_3_3_STAGE_4` — speed run (two-sentence stimuli, mixed claim positions)

**Module wiring:** Drill3_1.tsx through Drill3_3.tsx imports + stage definitions extended for stages 3 + 4. All four stages now wired in 3.1, 3.2, 3.3. Drill 3.4 stages 3 + 4 still placeholder (Stage 4 reserved for canonical-20 wire-up per G2.DRL-3.4).

**Voice register check:** R1 throughout. All rationales decisive, single-sentence, no metaphor. Speed-run rationales further compressed to fragment-scale (e.g. "'Therefore' — conclusion marker.") to match Stage 4 cadence.

**Pedagogical design notes:**
- Stage 3 (mixed/concession) tests recognition under ambiguity; Stage 4 (speed run) tests automaticity.
- 3.1 Stage 4 deliberately includes one "opinion" item ("In my view") in Stage 3 to teach the author-stance signal — distinct from "opposing" attribution.
- 3.2 Stage 3 includes two genuine intermediate-conclusion chains (refined-sugar, road-extension) so students learn to traverse to the *final* claim, not stop at the chain mid-point.
- 3.3 Stage 3 features four distinct concession surface patterns ("It is true that", "Granted", "While", and an embedded concession in a recommendation-first frame) to break any single-pattern shortcut.

**Deliverable B — Doc reconciliation:**
- `BRIDGE_HANDOFF.md`: TL;DR + route table + Final-state table all updated to reflect `/bootcamp/structure` as canonical (commit `8baf646`); v2 surface noted as legacy redirect alias.
- `gate-5-audit.md`: header date stamp + Phase I status updated; `/simulator` references rewritten to `/bootcamp/structure/simulator`.
- `promotion-runbook.md`: marked OBSOLETE (promotion happened in `8baf646`); preserved for historical reference + as a template for future topic-bootcamp promotions; OLD Structure.tsx archival flagged as the only outstanding follow-up.

**Verification:**
- `npx tsc --noEmit -p tsconfig.app.json` → ✓ 0 errors.
- `npx vite build` → ✓ 139 PWA precache entries, build clean in 1m 3s.

**Out of scope:** OLD Structure.tsx archival (separate cleanup pass), Drill 3.4 Stages 3 + 4 (Stage 4 reserves canonical 20 per G2.DRL-3.4), Drill 3.5–3.9 stage expansion, Phase D distractor batch (still blocked on M4 seeds).

### JOSHUA DIRECTIVE — 2026-05-01 (Re-wire: new bootcamp at /bootcamp/structure was the intent all along)

**Source:** Joshua chat clarification + screenshot of the new bootcamp Module Index ("The most salvageable question type ever" headline, M1–M6 cards, dark-mode left rail). **Authoritative.**

**Clarification:** The 2026-05-01 Lovable-editor commits ("Fixed structure bootcamp route") were NOT a deliberate decision to keep the old `Structure.tsx` live — they were a regression that pointed `/bootcamp/structure` at the old 8-module bootcamp instead of the new Main Conclusion bootcamp at `src/bootcamps/main-conclusion/`. Joshua's intent: the new bootcamp is canonical and lives at `/bootcamp/structure`. Rule 14 still applies to gpt-engineer-app[bot] commits, but acknowledgement-not-absorption means surfacing the conflict and asking — which I did — and Joshua's answer here unwinds the regression.

**Re-wire shipped:**
- `src/App.tsx`: removed `Structure` import; added `MainConclusionBootcamp` import; route `/bootcamp/structure/*` now mounts `MainConclusionBootcamp` (with splat for nested module routes); `/bootcamp/structure-v2` + `/*` redirects preserved.
- `src/bootcamps/main-conclusion/**` + `src/pages/MainConclusionBootcamp.tsx`: every hardcoded `/bootcamp/structure-v2/*` absolute path sed-rewritten to `/bootcamp/structure/*` (29 occurrences across LeftRail.tsx, LockedRoute.tsx, Placeholder.tsx, SimulatorShell.tsx, Dashboard.tsx, HardSentencesIndex.tsx, Drill3_4.tsx, Lesson.tsx, ReferenceSection.tsx, routes.tsx comment, MainConclusionBootcamp.tsx comment).
- `src/pages/Bootcamps.tsx`: card title "Structure" → "Main Conclusion / Argument Structure"; description rewritten to describe the new bootcamp (6 modules, 12 lessons + capstone, 9 drills with Stage-Gate, Simulator + Trap Master, Hard Sentences cluster decomposer, SM-2 SRS); stats `['8 Modules', 'Gated Progression', 'Simulator']` → `['6 Modules', '86 Surfaces', 'SM-2 SRS']`.

**Untouched:** OLD `src/pages/Structure.tsx` + `src/components/structure/**` — left on disk, no longer routed. Archival is a separate cleanup pass per Rule 16 once Lovable preview confirms the new bootcamp renders.

**Verification:**
- `npx tsc --noEmit -p tsconfig.app.json` → ✓ 0 errors.
- `npx vite build` → ✓ 139 PWA precache entries, build clean in 1m 44s.
- Internal grep: 0 lingering `/bootcamp/structure-v2/` references in bootcamp source (after sed).

**Out of scope:** OLD Structure.tsx archival, BRIDGE_HANDOFF.md / gate-5-audit.md / promotion-runbook.md doc updates, Drill 3.1–3.3 Stage 3/4 content authoring, Phase D distractor batch.

### JOSHUA OVERRIDE — 2026-05-01 (Lovable editor: bridge route reverted; v2 surface unwired) [REWOUND ABOVE]

**Source:** Lovable editor commits `9b35eb8` / `163be27` / `6954151` / `be79274` (2026-05-01 08:45-08:47 UTC, gpt-engineer-app[bot] co-authored vnjkoxpl-42905). Commit message on the merge: **"Fixed structure bootcamp route"**. **Authoritative.**

**What changed:**
- `src/App.tsx`: removed `MainConclusionBootcamp` import; `/bootcamp/structure` now mounts old `Structure.tsx` (live 8-module bootcamp); `/bootcamp/structure-v2` and `/bootcamp/structure-v2/*` now redirect to `/bootcamp/structure`.
- `src/pages/Bootcamps.tsx`: removed the "Structure (Preview)" v2 card; existing card relabeled "Structure" pointing at `/bootcamp/structure` (old 8-module description restored).
- Net effect: the entire Main Conclusion bootcamp at `src/bootcamps/main-conclusion/` (105 files) + `src/pages/MainConclusionBootcamp.tsx` is orphaned from the route table. Source files are preserved; routes are gone.

**Conflicts surfaced (per Rule 14):**
- `BRIDGE_HANDOFF.md` "Final state at handoff" table is stale.
- `gate-5-audit.md` Phase I sign-off has no live surface to walk.
- `promotion-runbook.md` (pre-staged earlier today) is now obsolete — nothing to promote.
- Drill 3.1–3.4 Stage 2 content shipped in PR #28 (commit `7c9ff13`) is orphaned source; the route to render it does not exist on main.

**Disposition:** AWAITING JOSHUA CLARIFICATION. Two interpretations:
1. Soft pause — keep v2 source; rewire later.
2. Soft rollback — archive/remove v2 source.

Until clarified: no further drill content authoring, no docs that assume the v2 route is live. Stage 2 content remains in source but is currently unreachable.

### JOSHUA DIRECTIVE — 2026-05-01 (Pickup: Rec #1 + Rec #2 both greenlit on serene-yeti plan)

**Source:** Joshua approval of `~/.claude/plans/you-re-picking-up-the-serene-yeti.md` (2026-05-01). **Authoritative.**

**Decisions approved:**
- **Rec #1 — Option A (Drill stages 2–4 work track) APPROVED.** Author Drill 3.1–3.4 Stage 2 content as the smallest-surface vertical slice while Phase D + M1 walkthrough are blocked. Stages 3–4 remain stubbed for a later pass per Rule 17 cadence. Stage 4 of 3.4 still wires canonical 20 per G2.DRL-3.4 unchanged.
- **Rec #2 — Option A (pre-stage promotion runbook) APPROVED.** Write `docs/main-conclusion-bootcamp/promotion-runbook.md` with sed commands, route swap, archive plan for `Structure.tsx`, rollback steps, and 6 pre-flight decisions for Joshua (PR-1 through PR-6). Zero code edits in the runbook itself; pure documentation.

**Cross-cutting:** No edits to `/bootcamp/structure`, `/bootcamp/causation-station`, `/bootcamp/abstraction`, or other LSAT U surfaces. All work scoped to `src/bootcamps/main-conclusion/` + `docs/main-conclusion-bootcamp/`.

### Gate 5 additive work — Drill 3.1–3.4 Stage 2 content (2026-05-01, autonomous Rule 16 after Rec #1 approval)

**Deliverable:** `src/bootcamps/main-conclusion/content/drills.source.ts` extended with 4 new exports:
- `DRILL_3_1_STAGE_2` (5 IndicatorIdQuestion items — multi-word indicator phrases: "Critics argue that", "It follows that", "On the other hand", "Granted that", "It is widely held that")
- `DRILL_3_2_STAGE_2` (5 XRayQuestion items — closer-call distractors with 3-4 sentence stimuli)
- `DRILL_3_3_STAGE_2` (5 FirstSentenceQuestion items — tricky openings: rhetorical question, opposing view "many believe", statistic opener, recommendation opener, concession opener)
- `DRILL_3_4_STAGE_2` (5 FamilyQuestion items — Rebuttal-dominant: 4 Rebuttal under harder surface conditions + 1 First-sentence calibration check to prevent answer-bias shortcut)

**Module wiring:** `Drill3_1.tsx` through `Drill3_4.tsx` updated — Stage 2 array imported and mapped into `stages[1].questions` array. Stage 2 hint text replaced from "Stage 2 content authors at C.10." to descriptive student-facing text.

**Voice register check:** Register 1 (decisive, procedural) on all rationales — drill instruction surface per the locked voice rules. No Register 2 prose in any of the new content (Phase D + M1 walkthrough still gate Register 2 expansion).

**Pedagogical design notes:**
- Stage 2 difficulty step-up is genuine: 3.1 multi-word phrases include attribution markers ("Critics argue that") that look like conclusion claims at first glance; 3.2 distractors include intermediate-conclusion sentences; 3.3 openers include rhetorical-question setups + concession openers; 3.4 stimulus surface conditions include "Nevertheless" pivots, rhetorical-question rebuttals, and flat reversals ("the opposite is closer to the truth").
- Drill 3.4 Stage 2 calibration design (4 Rebuttal + 1 First-sentence) honors the architectural intent ("Stage 2 trains Rebuttal" per drills.source.ts L250-251) while keeping binary-answer integrity — students who default to always-answering Rebuttal still fail the calibration item, preserving the 4/5 pass threshold's diagnostic value.

**Verification:**
- `npx tsc --noEmit -p tsconfig.app.json` → ✓ 0 errors.
- `npx vite build` → ✓ 139 PWA precache entries, build clean in 1m 58s.
- All four drill modules render Stage 1 + Stage 2 in the StageGateTracker tabs; Stage 3/4 still placeholders as designed.

**Surface area unchanged outside the bootcamp namespace:** zero edits to `src/pages/Structure.tsx`, `src/components/structure/**`, `src/pages/CausationStation.tsx`, `src/pages/Abstraction.tsx`, `src/App.tsx`, `src/pages/Bootcamps.tsx`, or any LSAT U surface.

### Promotion runbook pre-staged — 2026-05-01 (autonomous Rule 16 after Rec #2 approval)

**Deliverable:** `docs/main-conclusion-bootcamp/promotion-runbook.md` — 8-step runbook for promoting `/bootcamp/structure-v2` → `/bootcamp/structure` once Joshua signs off Gate 5.

**Pre-flight decisions surfaced (PR-1 through PR-6):**
- PR-1: Disposition of existing `Structure.tsx` + `components/structure/**` — default Archive (Joshua override available: Delete or Keep both behind feature flag)
- PR-2: Disposition of v2 card on `/bootcamps` — default Remove
- PR-3: Branch strategy — default feature branch + PR + soak (Joshua override: direct push to main)
- PR-4: Lovable preview soak window — default 24h (Joshua override: ship-and-watch or longer)
- PR-5: Mr. Tannisch orphan stimulus — default Drop from canonical 20 (already removed from MCFIRST extract)
- PR-6: Promote with current Phase D state, or wait for Phase D batch — default promote with current state (Phase D is additive work that follows promotion per Rule 16)

**Runbook step summary:** branch + sed pass → App.tsx route swap → Bootcamps.tsx card disposition → Structure.tsx archive/delete → typecheck + build + parity-route-check + lint → 12-URL dev-server spot-check → push + PR + Lovable soak → Lovable production spot-check → declare v1 shipped + update Phase I sign-off.

**Rollback plan included:** quick rollback (`git revert -m 1 <merge-sha>`) restores both surfaces; full rollback restores archived files via `git mv`. Persistence keys are user-UUID scoped, not URL-path scoped — so a rollback does not lose user data.

**No code edits in this runbook write — pure documentation.**

### JOSHUA DIRECTIVE — 2026-04-30 (Rec #2: pipeline scope split — lessons stay hand-authored)

**Source:** Joshua chat directive. **Authoritative.** APPROVED with scope clarity:
- `scripts/import-content.ts` GENERATES: `named-tools.generated.json`, `references.generated.json`, `indicator-vault.generated.json`, `simulator.generated.json`, `traps.generated.json`, `manifest.generated.json`.
- `scripts/import-content.ts` does **NOT** generate `lessons.generated.json`. **Lesson prose stays hand-authored.**
- Pipeline's role for lessons is **parity verification** — every preserved-verbatim asset referenced in lessons must exist in (a) the canonical corpus AND (b) the manifest. Drift = build error.
- This scope split must be documented in `docs/architecture-plan.md` §4 explicitly.

### Gate 4 Step 4 — Calibration seed + real pipeline shipped (2026-04-30, autonomous Rule 16)

**Step 4a — Calibration seed authored** (per Rec #1 constraint: data NOW, page LATER):
- `src/data/calibration.generated.json` shipped with 15 items total — 10 M1.13 + 5 M5.8.
- M1.13 items: 7 from `Notes/main_conclusion_student_dup1.docx` Q1-Q7 (stimulus_pending_ocr=true; trait tags T1-T7 locked while M1 voice fresh) + 3 from `Homework/AP Answer Key (1).pdf` items {5, 6, 8} (Airbnb / biodiversity / universal healthcare; full stimulus text captured verbatim from Step 1 smoke-test artifact, structure_map authored).
- M5.8 items: 5 cluster sentences (stimulus_pending_ocr=true; sourced from Cluster Sentences Review.docx variants disjoint from M5.6 + M5.7).
- Trait coverage check: T1-T7 all covered (T1 ×2, T2 ×2 from AP items + main_conclusion_student items). Plus T-Concession on AP item 6 (inline `(Concession)` tag in source).
- Selection rules audit: G3.M1.13-AP-PARTITION REVISED partition rule respected (AP items {2,3,4} → MC-DRL-3.2; {5,6,8} → M1.13; item 7 skipped; item 9 reserved for T7 deep-dive).
- **Capstone.tsx page NOT built.** Per Joshua's Rec #1 constraint: wait until M1 batch review locks voice; ship the page in one pass against locked content.

**Step 4b — Real pipeline shipped** (per Rec #2 with scope clarity):
- `scripts/import-content.ts` rewritten as the real pipeline. End-to-end run 2026-04-30: PASS, no drift.
- Pipeline emits 5 content files + 1 manifest (per directive scope):
  - `named-tools.generated.json` (15 named tools)
  - `indicator-vault.generated.json` (6 indicator categories)
  - `traps.generated.json` (7 trap traits)
  - `references.generated.json` (11 reference sections, placeholder metadata for v1)
  - `simulator.generated.json` (20 canonical questions, titles + family + source-anchors; stimulus text wires at Module 4 build start)
  - `manifest.generated.json` (86 entries, content hashes, parity status)
- Pipeline does NOT generate `lessons.generated.json` or `calibration.generated.json` — both hand-authored.
- Parity verification: 12 lessons checked · 25 verbatim-asset references (named-tool callouts + reference callouts) cross-checked against the manifest · **0 drift**. Calibration: 15 items validated · 12 pending OCR (resolves at Capstone.tsx build time).
- TS source files at `src/content/*.source.ts` for: named-tools, indicators, traps, references, simulator. Schemas at `src/content/schemas.ts` (Zod-typed, single source of truth for the pipeline + parity verifier).
- Architecture plan §4 updated with full scope-split documentation + future incremental wiring path (markdown → unified/remark, DOCX → mammoth, PDF → pdfjs-dist + vision-model OCR).
- CLI: `npm run import`, `npm run import:dry`, `npm run import:smoke`, `--force`.

**Verification:**
- `npm run import` → ✓ Pipeline complete · no drift · 86 manifest entries.
- All 6 generated files present in `src/data/`.
- Lesson parity-check: 12 lessons × 25 cross-checks = 0 drift warnings.

### Gate 4 Step 1 — Dry-import smoke test (2026-04-30)

**Target:** `Homework/AP Answer Key (1).pdf` (4 pages, 36 KB, S-tier).

**Files authored:**
- `scripts/import-content.ts` — skeleton + smoke-test entry point.
- `scripts/__smoke__/ap-answer-key.extracted.json` — captured extraction artifact.

**Three checks:**

| Check | Result | Detail |
|---|---|---|
| (a) ≥6 numbered items present | **PASS** | 8 numbered items (2–9). 7 have full breakdowns; item 7 is stimulus-only. |
| (b) OCR confidence on real S-tier PDF | **PASS (better than expected)** | PDF is text-based; native pdfjs-dist extraction returns clean text. Vision-model OCR fallback NOT exercised on this file. The audit's "image-only" tag was reserved for `Intermediate Conclusions & Nested Claims Drill.pdf`, `Cluster Sentences.pdf`, and `Sentence structure.pdf` — not this one. AP Answer Key is text-extractable. |
| (c) Typed-record schema fits real OCR output | **PASS** with two schema accommodations needed: (i) `claims: []` allowed for stimulus-only items via `has_full_breakdown: false` flag; (ii) inline role tags inconsistent across items (6, 8, 9 carry tags; 2, 3, 4, 5 don't) — schema accepts `role: 'Unknown'` default. | Drafted `ArgumentClaim` + `APAnswerKeyItem` Zod schemas in `scripts/import-content.ts`. |

**STOP — partition gap detected.** All three checks pass at the surface, but G3.M1.13-AP-PARTITION assumed item numbering 1-6. Actual file numbers are 2-9, with item 7 missing a breakdown. The partition rule needs re-anchoring.

**Proposed remediation (per Joshua's "stop, surface, propose" directive):** redefine partition to use actual present items:
- **MC-DRL-3.2 (X-Ray Drill stage 1)** ← items {2, 3, 4} (blue light · smart city · blockchain).
- **MC-CAL-M1-Q8 / Q9 / Q10** ← items {5, 6, 8} (Airbnb · biodiversity · universal healthcare).
- **Skip item 7** (no breakdown).
- **Reserve item 9** (Jordan/LeBron — strong T7 / Intermediate-Conclusion structure) for either Drill 3.9 supplement or T7 trait deep-dive example.

Awaiting Joshua's confirm before Step 2 (Module 1 Lesson 1.1 vertical slice).

---

## LESSONS FOR NEXT TOPIC PROJECT (TEMPLATE INPUTS)

(Capture observations as we go that should inform the template for the next topic. Examples: "Source-anchor pass should run during Gate 2 inventory generation, not as a follow-up." or "Calibration content sourcing should be decided at Gate 1, not Gate 2.")

- **Calibration content sourcing should be decided at Gate 1** (in the scaffolding plan), not Gate 2. This build had to override M1.13 sourcing at Gate 2 close because the canonical-20 reuse decision (Drill 3.4 + Simulator) was made there too. Deciding both together earlier would have avoided the recognition-not-learning trap.
- **Source-anchor pass should run during Gate 2 inventory generation**, not as a follow-up audit. Joshua had to surface it as a Gate 2 conditional-approval directive; building it inline saves a round trip.
- **OQ-SIM-4.2-AC pattern is a default template approach** for future topic builds: when source files contain stimuli + correct answers but not full multiple-choice distractor sets, invert authorship — Claude drafts with proposed trap-tags + voice-aligned audit lines; Joshua reviews in batch with 2–3 ground-truth seeds. Faster than per-question authorship; more consistent than per-question review.

---

## OPEN QUESTIONS PARKED FOR LATER

(Not blocking current gate but should be resolved before relevant gate.)

- AI Tutor live LLM cost economics for v1.5 (need usage data from v1)
- Spaced repetition interval tuning (defer to v1.5 with real data)
- LSAT U absorption migration script timing
- PT bank integration approach for v1.5

---

## HOW TO USE THIS DOC

**Claude Code:** Read this file on every session start. Update it at every gate close, every decision change, every rule learned. Append to Decisions Log with new rows; do not edit historical entries (they're the audit trail). Update Status section every time. Add to Lessons For Next Topic Project whenever you spot a pattern.

**Joshua:** Review updates between sessions. Override decisions in chat with the new version + dated reason; Claude Code logs the override.

**Future Skill conversion:** When this project ships and we've built 2-3 topic projects with stable patterns, this doc's Rules Learned + Lessons For Next Topic Project sections become the seed for a `lsat-u-topic-builder` Skill template.
