# NOT INCLUDED IN V1 — Table B

**Status:** Gate 2 draft. Pending Joshua's sign-off.
**Author:** Claude Code, 2026-04-30.

Per handoff §4.D: every reviewed source must be on Table A (CONTENT_INVENTORY.json) or Table B (this file). Anything missing from both is treated as silently dropped — a build failure.

This file lists everything **not** in v1, with the reason and any v1.5 plan.

---

## B.1 — Tier D drops (audit recommended deletion)

These files were graded D in spec.html §3 / §4 with a documented reason. Drop, do not import.

| Source file | Folder | Tier | Audit reason | v1.5 plan |
|---|---|---|---|---|
| `_megadoc_notes_parsing.md` + twin `notes_parsing.md` | Notes/ | D | "Three gdoc filenames as content; zero usable text. Hard delete both." | None — pure deletion. |
| `Sentence structure .pdf` | Notes/ | D | "1-page image-only partial of cluster sentences material. Inferior duplicate." | None — pure deletion. Cluster Sentences Review.docx covers everything in this fragment and more. |

---

## B.2 — Megadoc twins (one of each pair drops)

Five megadocs in Notes/ each have a byte-identical non-prefixed twin. Per spec.html §6 Cluster A: keep the prefixed `_megadoc_*` versions; drop the un-prefixed twins. The prefixed versions tell you it's a megadoc at a glance.

| Drop | Keep | Twin of |
|---|---|---|
| `lecture_main_conclusion.md` | `_megadoc_lecture_main_conclusion.md` | byte-identical |
| `notes_main_conclusion.md` | `_megadoc_notes_main_conclusion.md` | byte-identical |
| `notes_parsing.md` | `_megadoc_notes_parsing.md` | byte-identical (and both go to D, see B.1) |
| `other_main_conclusion.md` | `_megadoc_other_main_conclusion.md` | byte-identical |
| `reference_main_conclusion.md` | `_megadoc_reference_main_conclusion.md` | byte-identical |

**v1.5 plan:** None. The kept megadocs themselves are tier B/C and get superseded by the original PDFs/docx — they're already secondary sources at best. They don't ship as content; they're imported only as a fallback during the Gate 2 import script if a primary source is missing. The Gate 5 parity check verifies no megadoc text reaches the rendered app.

---

## B.3 — Misfiled-in-Notes md duplicates (drop the Notes copies)

Three md files in Notes/ are byte-identical to Homework/ megadocs (per spec.html §6 Cross-R). Drop the Notes copies; keep Homework/ as canonical.

| Drop (Notes/) | Keep (Homework/) | Reason |
|---|---|---|
| `drill_main_conclusion.md` | `_megadoc_drill_main_conclusion.md` | byte-identical, content belongs in Homework |
| `homework_main_conclusion.md` | `_megadoc_homework_main_conclusion.md` | byte-identical |
| `homework_parsing.md` | `_megadoc_homework_parsing.md` | byte-identical |

---

## B.4 — Superseded duplicates (drop in favor of newer/cleaner version)

Per spec.html §7 garbage list:

| Source file | Folder | Tier | Reason | Superseded by |
|---|---|---|---|---|
| `Cluster Sentences.pdf` (9.6 MB) | Notes/ | B | "Image-based duplicate of Cluster Sentences Review.docx. Same content but locked in images." | `Cluster Sentences Review.docx` (S, canonical) |
| `Main_Conclusion_Homework_Rebuttal_vs_First_Sentence_dup1.pdf` | Homework/ | B | "Older version of the Updated drill list. Different PT references in some stages. Superseded." | `Main_Conclusion_Homework_Rebuttal_vs_First_Sentence_Updated.pdf` |
| `_scan_Valid Conclusion Drill_dup1.docx` | Homework/ | A | "Mostly redundant with Notes/Valid Conclusion Worksheet HW. Minor wording variations." | `Valid Conclusion Worksheet HW_dup1.pdf` (Notes/, S, has the meta-explanation kept verbatim) |
| `structure refresher worksheet.md` | Homework/ | A (= S underlying content) | "Markdown sibling of Argument Structure (refresher worksheet)_dup1.pdf. Same content. Drop one — keep the PDF for portability with its answer key." | `Argument Structure (refresher worksheet)_dup1.pdf` (Homework/, S) |

**Note:** drops in B.4 are not silent — the kept source carries forward all unique content. The dropped file's contribution is fully preserved via the kept file.

---

## B.5 — Subsumed Argument-core sources (per spec §6 Cluster D)

| Source file | Folder | Tier | Subsumed by | v1 use |
|---|---|---|---|---|
| `skeletal lecture notes _dup1.pdf` | Notes/ | A (80%) | `Lecture 1 Notes LR Arguments Foundation (1)_dup1.pdf` (S, broadest, adds principle/generalization) | Optional supplement to MC-LSN-1.1 if the import script chooses to pull "alt phrasings"; otherwise not surfaced. Listed as `v1 (supplemental)` in inventory rather than dropped. |
| `Argument  parts (core)_dup1.pdf` | Notes/ | A (77%) | `Lecture 1 Notes LR Arguments Foundation_dup1.pdf` (S) | **v1.5 backlog** — condensed sibling, not unique value. Move to Table B. |

**v1.5 plan (Argument parts (core)):** if a future audit reveals unique phrasings worth preserving, re-author them into the Lesson 1.1 voice notes block. Otherwise, leave dropped.

---

## B.6 — Netlify prototype content not used in v1

Per spec.html §5 + §6 + §8 + handoff §4.B (every prototype question must appear on Table A or Table B):

### B.6.a — index (1) and (2) byte-identical (cluster S)

| Drop | Keep | Reason |
|---|---|---|
| `Curriculum/Netlify/index (2).html` | `Curriculum/Netlify/index (1).html` | MD5 e58dccc... — confirmed byte-identical; same React app deployed to both argumentslr.netlify.app and structuredrill.netlify.app. Treat as one prototype. |

### B.6.b — argumentslr (index 1) — multi-topic content not in v1

The LSAT Logic Tool covers Argument Structure + Conditional Rules + Binary Validity + Conditional Triggers + Trojan Horse Concession + Hunting for Main Conclusion + Practice Simulator + Coach's Note. Per spec.html §5: "Multi-topic scope dilutes Main Conclusion focus."

| Content | v1 status | Reason | v1.5 plan |
|---|---|---|---|
| Argument Structure module | v1 (mechanic absorbed into MC-LSN-1.1, MC-DRL-3.2) | Mechanic ports forward; content already in Notes corpus | — |
| **Conditional Rules module** | **Table B** | Off-topic for Main Conclusion bootcamp | LSAT U absorption — belongs to a Conditional Reasoning topic |
| **Binary Validity module** | **Table B** | Off-topic | LSAT U absorption — belongs to Validity / Necessary-Sufficient topic |
| **Conditional Triggers module** | **Table B** | Off-topic | LSAT U absorption — belongs to Conditional Reasoning topic |
| Trojan Horse Concession framing | v1 (MC-LSN-1.8, MC-REF-2.I) | Framing absorbed verbatim | — |
| Hunting for Main Conclusion section | v1 (concept absorbed; not used as standalone surface) | Restates Lesson 1.4 + 1.5 + 1.6 | — |
| Practice Simulator + Coach's Note framing | v1 (Coach's Note pattern absorbed into MC-SIM-4.5) | — | — |
| React stack (29 useState calls) | v1 (architecture pattern only — useState patterns inform component structure but no code lift) | Per Gate 1 #1: React + TS confirmed; this prototype's structure is a partial reference but spec §6 Cluster U says "skip the React stack (single-prototype outlier)" w.r.t. content lift. Mechanic patterns port; not the code itself. | — |

### B.6.c — introconclusiondrill (index 5) — 20 original stimuli

| Content | v1 status | Reason | v1.5 plan |
|---|---|---|---|
| 20 original (non-PT) stimuli with sentences[], ans, roles, breakdown, hint | **Table B** | Per spec §6 Cluster T: "Stimuli are not real LSAT questions; could feel 'training-wheels' to advanced students." Canonical 20 PT-style content (MCFIRST + main_conclusion_questions) is the v1 simulator content. Adding 20 originals duplicates without strategic value. | Revisit in v1.5 as a "training-wheels mode" gating before students hit the canonical 20 (recommended for absolute beginners). |
| Role-reveal-on-success mechanic | v1 (mechanic ports to MC-DRL-3.2 + MC-DRL-3.4) | — | — |
| Slide-up "ANALYSIS SUCCESSFUL" banner pattern | v1 (success-state pattern ports to drill components) | — | — |

### B.6.d — mainconclusion (index 6) — cyberpunk visual identity

| Content | v1 status | Reason | v1.5 plan |
|---|---|---|---|
| Cyberpunk visual identity (Share Tech Mono, cyan glow, scanner animation) | **Table B** | Per spec §6 Cluster V: rejected for inconsistency with Aspiring Attorneys gold identity. | None — won't return. |
| 20 chunk-tap PT-style questions | v1 (overlap with canonical 20 from Notes/Homework) | Source the canonical version; reuse the chunk-tap mechanic | — |
| Chunk-tap drill mechanic | v1 (ports to MC-DRL-3.4 supplemental + MC-DRL-3.2 chunk-tap variant) | — | — |
| Keyword-glow hint on failure | v1 (ports to MC-DRL-3.2 + MC-SIM-4.5) | — | — |

### B.6.e — MC Companion (index 4) — PT-bank-only drill list

| Content | v1 status | Reason | v1.5 plan |
|---|---|---|---|
| 20 PT references in `hwData` (PT118 S3 Q12, etc.) — actual stimuli | **Table B (v1.5)** | PT bank integration is out of scope for v1 per handoff §6. The MC Companion's drill list is *references* — the actual stimulus text lives in the external PT bank. | v1.5 / LSAT U absorption: PT bank integration enables the original drill list verbatim. Until then, MC-DRL-3.4 uses corpus-sourced stimuli (see OQ-DRL-3.4). |

### B.6.f — logicalreasoningfoundation (index 3) — multi-topic LR foundation

LR Field Manual covers 6 topic modules (Introduction, Anatomy, Core, Components, Process, Context). Only Main-Conclusion-relevant content is in scope.

| Module | v1 status | Reason | v1.5 plan |
|---|---|---|---|
| Introduction (general LR framing) | v1 (concept absorbed into MC-LSN-1.1 framing) | — | — |
| **Anatomy of an Argument (general LR)** | **Table B** | Beyond Main Conclusion scope | LSAT U absorption — belongs to a foundational LR topic shared across question types |
| Core (premise/conclusion identification) | v1 (Monica example absorbed into MC-LSN-1.2; concept already in corpus) | — | — |
| **Components (full LR component breakdown)** | **Table B** | Beyond Main Conclusion scope | LSAT U absorption |
| **Process (LR question approach process)** | **Table B** | Beyond Main Conclusion scope | LSAT U absorption — universal LR pre-question process applies across all question types |
| **Context (LR section context)** | **Table B** | Beyond Main Conclusion scope | LSAT U absorption |
| X-Ray Scan mechanic | v1 (ports to MC-DRL-3.2 + Lesson quote blocks) | — | — |
| Gap Simulator mechanic | v1 (ports to MC-LSN-1.1 cake-on-blocks) | — | — |
| Focus Mode mechanic | v1 (ports to workspace shell as a global toggle) | — | — |
| Sidebar nav + global progress + per-module mastery rings | v1 (ports to workspace-shell layout) | — | — |
| Mastery toggle button (no quiz to verify) | **Table B** | Spec §8 weakness: "no quiz to verify the user actually mastered the module" | Replaced in v1 by the calibration-drill capstone pattern (post-instruction) per Gate 1's pedagogical-flow rule. |

---

## B.7 — Module 4 / R&R / AI Tutor — v1 vs v1.5 capability split

Per Gate 1 #5 + spec §6.7-§6.8, AI features ship in two capability waves. Below: what's deferred from v1 to v1.5.

### B.7.a — R&R Drill flagging

| Capability | v1 | v1.5 |
|---|---|---|
| Live mic capture + IndexedDB storage | v1 ✓ | — |
| Web Speech API transcription | v1 ✓ | — |
| **Templated word-overlap diff (Left Out / Added flags only)** | v1 ✓ | replaced by below |
| **Mischaracterized auto-flag (semantic)** | **Table B (v1.5)** | LLM-driven semantic comparison |
| **Repeated-pattern detection (e.g., always intensifies "all" → "most")** | **Table B (v1.5)** | LLM analysis across recordings |

### B.7.b — AI Tutor

| Route | v1 | v1.5 |
|---|---|---|
| "Why is B the answer?" | v1 (templated → renders Coach's Note) | — |
| "What does FABS mean?" | v1 (templated → jumps to Reference 2.C) | — |
| "What's a Trojan Horse?" | v1 (templated → jumps to Lesson 1.8 + Reference 2.I) | — |
| "What should I work on next?" | v1 (templated → recommendation engine output) | — |
| "Did I replace the pronoun right?" | v1 (templated → 6.5 pronoun-check rules) | — |
| **Open-ended free-text Q&A** | **Table B (v1.5)** | Live LLM with daily token cap per student |
| **Walk through my reasoning on this question** | **Table B (v1.5)** | Live LLM, bounded behavior set |
| **Recommend next steps with diagnostic-grounded reasoning** | v1 stub (template) → v1.5 LLM upgrade | LLM-grounded recommendations |

### B.7.c — Drill 3.6 evaluation (Design-the-Conclusion)

| Capability | v1 | v1.5 |
|---|---|---|
| Pre-authored model answers per question + similarity check (local sentence embeddings) | v1 (per OQ-DRL-3.6-AI recommendation) | — |
| **Free-form valid/invalid evaluation across novel student conclusions** | **Table B (v1.5)** | LLM-driven |
| **"You imported outside knowledge" detection** | **Table B (v1.5)** | LLM-driven; the most pedagogically valuable failure-mode diagnosis |

---

## B.8 — Question Simulator content beyond canonical 20

Per Gate 1 #3, v1 question bank = Notes + Homework + Netlify extractions only. No external PT bank.

| Content category | v1 | v1.5 |
|---|---|---|
| Canonical 20-argument drill (MCFIRST + main_conclusion_questions + main_conclusion_answer_key) | v1 ✓ | — |
| Hard Question Mode (masterclass-only questions) | v1 (sourced from `_scan_Main conclusion part 1.pdf` + `part 2.pdf`) | — |
| **Fresh PT questions for each calibration drill** | **Table B (v1.5)** | Per spec §6 + handoff §6: PT bank integration is v1.5 scope. v1 calibration draws from a curated subset of the canonical 20 (see OQ-CALIBRATION-CONTENT). |
| **Weekly drill draws from external PT bank** | **Table B (v1.5)** | Same as above — PT bank gated. |
| **Spaced-repetition queue surfacing fresh items** | v1 (queue surfaces items already attempted) → v1.5 (fresh PT items added to queue) | LLM-graded fresh items |

---

## B.9 — Auth, multi-device, persistence

Per handoff §6 + §3.A:

| Feature | v1 | v1.5 |
|---|---|---|
| Anonymous user with stub `useUser()` hook | v1 ✓ | — |
| LocalStoragePersistence + IndexedDBPersistence (R&R audio) | v1 ✓ | — |
| Persistence interface (adapter pattern) | v1 ✓ | one-file swap to SupabasePersistence |
| **Auth (login screen, user accounts)** | **Table B (v1.5)** | LSAT U auth wraps the app; `useUser()` returns real user |
| **Multi-device sync** | **Table B (v1.5)** | Supabase backend + per-user data sync |
| **Migration script (localStorage/IndexedDB → Supabase)** | **Table B (v1.5)** | One-time per user on first authenticated sign-in |
| **External PT bank integration** | **Table B (v1.5)** | Live FS-16 pull + caching |

---

## B.10 — Light mode, logo asset, audio retention controls

Per Gate 1 #7 + #6 + #8:

| Feature | v1 | v1.5 |
|---|---|---|
| Dark mode | v1 ✓ | — |
| **Light mode token set** | **Table B (v1.5)** | Token-swap, not a rewrite. Tokens already authored as variables. |
| Aspiring Attorneys logo (final SVG) | **TBD** — ships serif wordmark in v1 until Joshua provides SVG asset | SVG drop-in when provided |
| R&R audio retention auto-purge (90-day option) | **Table B (v1.5)** | Default v1 = keep forever with manual clear-all in Settings (per Gate 1 #6 default) |

---

## B.10.a — Mobile R&R audio capture

| Feature | v1 | v1.5 |
|---|---|---|
| Desktop R&R (live mic + continuous recording across full LR section) | v1 ✓ | — |
| Mobile R&R text-only fallback (read → cover → type rephrase → Skeptic's Ear Check → cumulative recall) | v1 ✓ | — |
| **Audio capture on mobile** | **Table B (v1.5)** | Per OQ-RR-MOBILE resolution. Mobile users are not blocked from R&R in v1; they just type instead of record. |

---

## B.11 — Test-mode (timed) Simulator

Per spec §3.6.2 + UWorld parallel in reference-study.md:

| Feature | v1 | v1.5 |
|---|---|---|
| Tutor mode (per-question feedback) | v1 ✓ | — |
| **Test mode (timed, sequential, no per-question feedback)** | **Table B (v1.5)** | Once instruction has soaked, timed practice unlocks. Pedagogical-flow rule blocks cold timed testing in v1. |

---

## Summary of Table B counts

| Category | Items |
|---|---|
| B.1 Tier D drops | 2 files |
| B.2 Megadoc twin drops | 5 files |
| B.3 Misfiled Notes md drops | 3 files |
| B.4 Superseded duplicates | 4 files |
| B.5 Subsumed Argument-core sources | 1 file (1 v1-supplemental, 1 to v1.5) |
| B.6 Netlify byte-identical drop | 1 file |
| B.6 LSAT Logic Tool off-topic modules (3) | 3 modules → v1.5 / LSAT U |
| B.6 introconclusiondrill 20 originals | content → v1.5 (mechanic in v1) |
| B.6 mainconclusion cyberpunk identity | identity → never (mechanic + content in v1) |
| B.6 MC Companion PT-references | content → v1.5 (mechanic in v1) |
| B.6 LR Field Manual off-topic modules (4 + mastery toggle) | → v1.5 / LSAT U |
| B.7 R&R Mischaracterized + repeat-pattern flagging | → v1.5 |
| B.7 AI Tutor open-ended Q&A | → v1.5 |
| B.7 Drill 3.6 LLM evaluation | → v1.5 |
| B.8 Fresh PT bank items + weekly draws | → v1.5 |
| B.9 Auth + multi-device sync + migration | → v1.5 |
| B.10 Light mode + audio auto-purge | → v1.5 |
| B.11 Timed Test Mode | → v1.5 |

**Total file-level drops:** ~16 files across Notes / Homework / Netlify (all reasoned).
**Total feature-level v1.5 deferrals:** 12+ capabilities (LLM-dependent or PT-bank-dependent).

Every reviewed source from the Stage 1 audit appears either on Table A (CONTENT_INVENTORY.json) or Table B (this file). No silent drops.

---

## Gate 5 verification checklist

At pre-merge, confirm:
1. The `manifest.generated.json` produced by `scripts/import-content.ts` lists every Table A entry, mapped to a real component file.
2. No source file outside Table A or Table B appears in any `*.generated.json`.
3. No Table B file appears in any `*.generated.json`.
4. Every voice passage in CONTENT_INVENTORY.voice_passages renders verbatim somewhere in the built app (grep in build output).
5. Every named tool in CONTENT_INVENTORY.named_tools has its name unchanged in the rendered surface.
6. Every worked example in CONTENT_INVENTORY.worked_examples renders in its specified `used_in` lessons / drills / sections.
