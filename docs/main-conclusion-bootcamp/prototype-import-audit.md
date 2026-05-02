# Prototype Import Audit — Intro to LR Bootcamp

**Date:** 2026-05-02
**Scope:** Five unique prototype HTMLs against current `src/bootcamps/main-conclusion/`.
**Drives:** Plan at `~/.claude/plans/do-not-redesign-the-partitioned-flute.md`.

## Plan reorient: what changed after reading the actual code

The plan was built from a high-level inventory. Reading the actual code revealed two facts that shift execution:

1. **Drills 3.1–3.4 are NOT stubbed at Stages 3–4.** Each has 5 items at every stage (20 items per drill, 80 across the four). The plan's "absorb 20 P-E stimuli" item assumed thin authoring; the drills are well-stocked. Mass-importing prototype items would be noise on top of stronger existing items.

2. **Drill 3.8 already implements free-text restatement.** It has a multi-stage flow (Read → Rephrase → Skeptic's Ear) with Web Speech API + textarea + key-phrase coverage indicator — exactly what the plan called for as a new `ConclusionRestater` primitive. Building `ConclusionRestater` would duplicate shipped work.

These two facts collapse Passes 2 and 4 from the plan and surface a different defect: **Drill 3.8 has the same role-color repurposing defect class I fixed in Capstone on 2026-05-02 (commit `74acb6a`).** Lines 170, 63, 67 of `Drill3_8.tsx` use `tone="conclusion"` and `tone="background"` as status indicators — direct Role-Color Rule violations. This needs the same fix the Capstone surface received.

## Revised execution

| Pass | Original plan | Revised | Reason |
|---|---|---|---|
| 1 | Voice + content audit doc | **This doc** | done |
| 2 | Mass item absorption | **Skip** — drills are well-stocked | drills 3.1–3.4 have 5 items × 4 stages each |
| 3 | PronounUnpacker primitive | **Ship** | genuinely missing, wired into Lesson 1.10 demo |
| 4 | ConclusionRestater primitive | **Skip** — Drill 3.8 already implements this | Drill3_8.tsx already has Read → Rephrase → Skeptic with key-phrase coverage |
| 4-bis | (new) Drill 3.8 polish — same defect class as Capstone | **Ship** | role-color repurposing + Unicode arrows |
| 5 | Absolute Statements lesson | **Defer to next pass** | larger scope; deferring keeps current pass focused |
| 6 | 4th primary role: Opposing | **Ship if budget allows** | locked decision; biggest cascading change |

## Per-prototype findings (verdicts)

### P-A `structuredrill-main` (1711L)
- **Verdict:** Skip wholesale. PT 117–125 citations are likely fabricated (LSAC PrepTests don't go that high). Stage-gate chrome is anti-pattern per PRODUCT.md. Self-grading buttons are anti-pattern. The "Mandatory: replace the pronoun" framing is already covered by Lesson 1.10 + named tool `NT-Pre-Phrase-Goal`.
- **One salvageable beat:** the "Mandatory" voice register is sharper than Lesson 1.10's current hedging. Joshua-side review only — no autonomous import of phrasing.

### P-B `arguments-main` (1056L)
- **Verdict:** Mostly skip; one interaction worth lifting (pronoun-unpack click reveal). Module 07 REBUTTAL_BANK and Module 09 INTERACTIVE_BANK are clean items, but: (a) Drill 3.3 Stage 2 and Drill 3.9 already have authored items, (b) the prototype items don't beat the bootcamp's existing voice-led stimuli (e.g. Monica claimed dinosaurs; pet dragon Daphne).
- **Salvageable:** Module 06's "such laws" pronoun-unpack click → marked text expands inline. This is genuinely missing in the bootcamp and is the strongest interaction in any prototype. **Ship as `PronounUnpacker` primitive in Pass 3 below.**

### P-C `deploy-69ad7ac…` (835L)
- **Verdict:** Skip — duplicate of P-A's stage-gate flow, same fabricated PT cites.

### P-D `deploy-69ae2bfa…` (724L)
- **Verdict:** Skip wholesale for Main Conclusion scope. Stock Analysts flaw question is out of scope (flaw-family question, not MC). X-ray scan toggle is already covered by `RoleLabeler`'s on-submit per-segment paint reveal. "Do not skim. Do not assume. Do not paraphrase too loosely." triplet is sharper than current Lesson 1.4 briefing — but importing copy is Joshua-side voice work, not autonomous.

### P-E `introconclusiondrill-main` (578L)
- **Verdict:** Skip wholesale. The 20 stimuli are 3-sentence composites, but Drills 3.2 and 3.3 already have 4 stages × 5 items each authored at higher voice quality. Per-question hint copy ("Look for a classic indicator word like 'Therefore'") is anti-pattern per PRODUCT.md (don't shortcut the attempt). Trophy + certification hash on completion is Duolingo-shaped gamification, banned.

## Items not absorbed and why

These items would have been imported under the original plan but are skipped:

- **P-E 20 stimuli** — drills are well-stocked; importing on top is noise.
- **P-B Module 07 REBUTTAL_BANK (5 items)** — Drill 3.3 Stage 2 already has 5 rebuttal-family items at high voice quality.
- **P-B Module 09 INTERACTIVE_BANK (10 items)** — Drill 3.9 already has authored items; M1 capstone already has 10 calibration items in `calibration.generated.json`.
- **P-A "Mandatory" pronoun voice** — Lesson 1.10 voice review is Joshua-side, not autonomous.
- **P-D "Do not skim" triplet** — same: voice review is Joshua-side.

## What Pass 3 + Pass 4 ship

**Pass 3 — `PronounUnpacker` primitive** (genuinely missing):
- New attempt-task kind `pronoun-unpack` in the discriminated union.
- New component composing the existing `named-tool-inline` pattern: stimulus rendered with marked pronoun spans; click reveals the antecedent inline with a soft expand.
- Wire into Lesson 1.10 demo phase (replacing the static segments with an interactive walk-through).

**Pass 4 — Drill 3.8 polish** (defect-class carryover from prior `74acb6a` Capstone fix):
- `tone="conclusion"` / `tone="background"` swapped to `tone="success"` / `tone="neutral"` on the key-phrase coverage chips (line 170).
- `tone="background"` swapped to `tone="neutral"` on the device-capability chips (lines 63, 67).
- Unicode arrows in button labels (`Cover and rephrase →`, `Continue →`, `Save and continue →`) replaced with lucide `ArrowRight` icons.

**Pass 5 (if budget allows) — 4th primary role: Opposing.**
- Extends `Role` union to include `'opposing'`.
- Updates `ROLE_PICK_CLASS` / `ROLE_DOT_CLASS` / `ROLE_REVEAL_CLASS` / `ROLE_PREFIX_CLASS` in `RoleLabeler` to use the existing `--role-opposing` token.
- Adjusts Lessons 1.1 + 1.8 attempt-task `allowedRoles` to include `'opposing'` and reclassifies any segment currently tagged `background` that is actually opposing-view material.
- Updates `lessons-phased.test.ts` if it asserts role-set membership.

## Pre-existing dirty files — untouched throughout

`CLAUDE.md`, `docs/main-conclusion-bootcamp/PROJECT_MEMORY.md`, `.audit/session-handoff-2026-04-21-archived.md` remain in their current state.

## Top 2 recommendations after the pass

1. **A Joshua-side voice pass on Lesson 1.10's Pre-Phrase framing.** The prototype's "Mandatory: take the time to replace the pronoun" is sharper than the current bootcamp wording. Voice changes shouldn't be made autonomously — schedule a 30-minute review.
2. **Schedule the 4-bucket role rollout review before any new Drill 3.x slice ships.** Adding Opposing as a top-level role (Decision #1, locked) is the largest-blast-radius change in this plan. If it lands, every subsequent drill stimulus that currently uses `background` for opposing material needs a re-tag pass. Easier to do this once before the next batch of authored content lands than retroactively.
