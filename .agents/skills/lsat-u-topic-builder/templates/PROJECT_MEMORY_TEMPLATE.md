# PROJECT MEMORY: {{TOPIC_NAME}} Bootcamp

**This is the running working document.** Claude Code reads this at every session start and updates it at every gate close, decision, or rule change. Joshua reviews updates between sessions. Single source of truth for project state.

---

## STATUS

- **Current gate**: Gate 0 (Source-Access Check) — pending
- **Last gate closed**: none (project just initialized)
- **Next gate**: Gate 1 (Project Scaffolding and Reference Study)
- **Last updated**: {{DATE}}
- **Last action**: Project bootstrapped via lsat-u-topic-builder skill

---

## DECISIONS LOG (TIMESTAMPED, AUTHORITATIVE)

(No decisions yet. Each gate's decisions are logged here as new dated rows. Do not edit historical entries.)

---

## RULES LEARNED (CROSS-TOPIC BASELINE FROM MAIN CONCLUSION)

These 14 rules came out of the Main Conclusion build. They form the baseline for every LSAT U topic-bootcamp. Add topic-specific rules below as patterns surface during this build.

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
11. **Module ordering can be a curriculum constraint, not just a UX nicety.** When two surfaces share content, enforce encounter order architecturally so the second surface tests learning, not recognition. Calibration content must come from a different extraction than drill / simulator content.
12. **Distractor authorship for multiple-choice questions inverts cleanly.** Claude drafts with explicit trap-tag proposals; Joshua reviews in batch. 2-3 ground-truth seed examples scale to N distractors faster than N individual authoring tasks.
13. **Outside-knowledge import is the highest-leverage diagnostic in voice-led drills.** For whimsical-premise / "stay in the world of the premises" mechanics, premise-keyword overlap is a cheap, deterministic signal — surface it as its own classification.
14. **User modifications are authoritative and must be emphasized, never silently absorbed.** Whenever Joshua edits any file in the project OR overrides a decision in chat, Claude Code MUST: (a) detect the change, (b) acknowledge it explicitly with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" callout, (c) log it in the Decisions Log as a new dated row, (d) treat the user version as authoritative — never revert, (e) if the change conflicts with an existing rule or decision, surface the conflict explicitly and ask which wins before proceeding.
15. **Be forward. After every unit of work, surface 2 next-move recommendations.** When Claude Code completes a deliverable, end the response with two concrete next-move suggestions tied to what just shipped. Format: a "NEXT-MOVE RECOMMENDATIONS" section with two numbered items, each one sentence stating the move + one sentence stating why it matters. Stick to the approved plan; recommendations are *additive*, not deviations.
16. **Take the lead. Make the most of every turn.** Within the approved plan and locked rules, Claude Code uses judgment to execute the longest sensible run of moves per turn — auto-approving its own additive low-risk recommendations, applying remediations to detected gaps without confirmation round-trips, and bundling related work into a single push. Only stop and ask when: (a) a directive-level decision is needed, (b) a destructive or hard-to-reverse action is in play, (c) ambiguity prevents progress, or (d) Rule 14 requires explicit override acknowledgement.
17. **Recommendation format: only ask when uncertain; mark the best option; use simple words.** When surfacing recommendations: only present them when Claude genuinely doesn't know what Joshua would want; always mark the recommended choice with a "**Best:**" tag; use simple language; for each option give one sentence describing it + one sentence describing how it differs; cap at 2; skip entirely if neither would change the build trajectory.
18. **Never lock review surfaces. Ship a review-mode bypass with every gate.** Any feature using progressive unlocks, `LockedRoute`-style gates, completion prerequisites, paywalls, or any mechanism that hides content behind state MUST ship simultaneously with a review-mode bypass — an env flag, build-time switch, or equivalent toggle that opens ALL gates so Joshua can walk the entire product end-to-end before ship. Defaults: review-mode ON during pre-ship review (all gates open), OFF in production (gates enforced normally). Application: every gated lesson, drill stage, simulator, diagnostic, premium-feature paywall, onboarding-locked surface. **If you build a gate, you build the bypass at the same time.** Never ship gated content for review without a review-mode toggle. (Source: Main Conclusion 2026-05-01 incident — locked lessons + Simulator looked broken during voice walkthrough; routes were fine, gating just hid them. Don't repeat.)

(Add topic-specific rules below as they surface in this build.)

---

## TOOLS APPROVED / REJECTED (BASELINE FROM MAIN CONCLUSION)

| Tool | Status | Notes |
|---|---|---|
| Claude Code (CLI / Desktop) | Approved | Primary build driver. Reads CLAUDE.md auto on session start. |
| 21st.dev MCP — Inspiration Search | Approved (limited) | Primitive components only. ~1 useful match per 7 calls. Run one at a time. |
| 21st.dev MCP — Magic Generate | Rejected | Timed out 2 of 2 calls in Main Conclusion. Use Inspiration Search instead. |
| Claude Design (Anthropic) | Optional | Useful for visual iteration on specific screens after v0 ships. Not required for build. |
| Direct reference apps | Approved | Primary source for layout-scale design. |
| Bash / Linux sandbox | Limited | Read-write to mounted folders only. Cannot delete in /Curriculum/ mount (permissions). Cannot reach Mac paths outside mounts. |
| Write tool | Full Mac access | Can write to any Mac path (auto-creates folders). |

(Add topic-specific tool findings below as they emerge.)

---

## QUALITY BAR

- **Visual**: match or exceed Causation Station and Abstraction.
- **Pedagogical depth**: every lesson has guided examples, checkpoint questions, named-tool callouts, voice intact.
- **Interaction**: commit-before-reveal on every drill question; audit drawer per choice; coach drawer with named-tool callouts; reference vault opens in place; quiet review queue updates.
- **Density**: information-rich without crowding. Linear / Arc / Readwise / Superhuman level.
- **Microinteractions**: 150-220ms eased transitions, no spring overshoot, no parallax, no auto-play, prefers-reduced-motion respected.

---

## SOURCE CORPUS INVENTORY (FILLS AT GATE 2)

(To be populated at Gate 2 close.)

---

## ARCHITECTURE NOTES (FILLS AT GATE 3)

(To be populated at Gate 3 close.)

---

## BUILD PROGRESS (FILLS AT GATE 4+)

(To be populated per module as Gate 4 progresses.)

---

## LESSONS FOR NEXT TOPIC PROJECT (TEMPLATE INPUTS)

(Capture observations as we go that should inform the template for the NEXT topic project. These bubble up into the lsat-u-topic-builder skill v2 over time.)

Lessons inherited from Main Conclusion build:
- **Calibration content sourcing should be decided at Gate 1**, not Gate 2. Deciding calibration content + main-bank content together early avoids the recognition-not-learning trap.
- **Source-anchor pass should run during Gate 2 inventory generation**, not as a follow-up audit.
- **OQ-SIM-4.2-AC pattern is a default template approach**: when source files contain stimuli + correct answers but not full multiple-choice distractor sets, invert authorship — Claude drafts with proposed trap-tags + voice-aligned audit lines; Joshua reviews in batch with 2-3 ground-truth seeds.

(Add this topic's lessons below as they surface.)

---

## OPEN QUESTIONS PARKED FOR LATER

(Not blocking current gate but should be resolved before relevant gate. Move resolved items to Decisions Log.)

Inherited baseline:
- AI Tutor live LLM cost economics for v1.5 (need usage data from v1)
- Spaced repetition interval tuning (defer to v1.5 with real data)
- LSAT U absorption migration script timing
- PT bank integration approach for v1.5

(Add this topic's parked questions below.)

---

## HOW TO USE THIS DOC

**Claude Code:** Read this file on every session start. Update it at every gate close, every decision change, every rule learned. Append to Decisions Log with new rows; do not edit historical entries (they're the audit trail). Update Status section every time. Add to Lessons For Next Topic Project whenever you spot a pattern. Apply Rule 14 — emphasize user modifications.

**Joshua:** Review updates between sessions. Override decisions in chat with the new version + dated reason; Claude Code logs the override.

**Skill v2 path:** When 2-3 topic projects ship, this doc's Rules Learned + Lessons For Next Topic Project sections become the seed for refining the lsat-u-topic-builder skill template.

Generated: {{DATE}}
