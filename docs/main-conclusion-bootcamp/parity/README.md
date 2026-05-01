# Gate 2 — Content-Scope Inventory (parity artifacts)

**Status:** Draft delivered 2026-04-30. Pending Joshua's sign-off.

This folder is the parity layer the build is verified against. Every reviewed source from the Stage 1 audit lands either on Table A (`CONTENT_INVENTORY.json`) or Table B (`NOT_INCLUDED_IN_V1.md`). Anything missing from both is a build failure.

---

## Files

| File | Purpose | Source-of-truth? |
|---|---|---|
| [CONTENT_INVENTORY.json](CONTENT_INVENTORY.json) | Table A. Every preserved item: modules, sections, named tools, worked examples, voice passages, indicator categories, source files, prototype extractions, open questions. | **Yes — JSON is canonical.** |
| [CONTENT_INVENTORY.md](CONTENT_INVENTORY.md) | Human-readable view of Table A. | Auto-generated from JSON for review. |
| [CONTENT_PARITY_MAP.json](CONTENT_PARITY_MAP.json) | Every inventory ID → source paths → destination route → component(s) → parity_status. Gate 5 verifies the built app against this map. | **Yes — JSON is canonical.** |
| [CONTENT_PARITY_MAP.md](CONTENT_PARITY_MAP.md) | Human-readable view of the parity map. | Auto-generated from JSON for review. |
| [NOT_INCLUDED_IN_V1.md](NOT_INCLUDED_IN_V1.md) | Table B. Every Tier D drop, superseded duplicate, off-topic prototype content, and v1.5-deferred capability — with reason and v1.5 plan. | **Yes — Markdown is canonical for this file** (per Gate 1 #11). |

Per Gate 1 #11: JSON files are the source of truth for inventory + parity map. Markdown views are auto-generated for review (right now they were authored manually; once `scripts/import-content.ts` exists at Gate 3 scaffolding, the Markdown views regenerate from the JSON on build).

---

## What's in v1 (Table A summary)

| Surface | Count |
|---|---|
| Modules | 6 |
| Lessons (M1) | 13 (incl. capstone) |
| Reference sections (M2) | 11 (incl. QRC + capstone) |
| Drills (M3) | 9 |
| Simulator sections (M4) | 8 |
| Trap Master traits | 7 |
| Hard-Sentences sections (M5) | 8 (incl. capstone) |
| Diagnostics sections (M6) | 10 |
| Named tools (lexicon) | 15 |
| Worked examples preserved verbatim | 23 |
| Voice passages preserved verbatim | 23 |
| Indicator categories | 6 |
| Conclusion types | 5 |
| Notes source files (S/A/B + 1 supplemental B) | 33 mapped to surfaces |
| Homework source files (S/A/B + supplementals) | 15 mapped to surfaces |
| Netlify prototypes (unique) | 5 |
| Canonical Simulator questions | 20 (the 20-arg drill) |
| **Total Table A entries** | **~173** |

---

## What's deferred (Table B summary)

12 categories of deferral, totaling:
- **~16 file-level drops** (Tier D, megadoc twins, misfiled md, superseded duplicates, byte-identical Netlify drop).
- **~12+ feature-level v1.5 deferrals** (LLM-driven R&R semantic flags, AI Tutor open-ended Q&A, LLM Drill 3.6 evaluator, fresh PT bank items, weekly draws, auth, multi-device sync, light mode, audio auto-purge, timed Test Mode, plus three off-topic LSAT Logic Tool modules and four off-topic LR Field Manual modules pending other LSAT U topics).

Every drop is reasoned. No source from the Stage 1 audit is silently dropped.

---

## Open questions (6, surfaced from Gate 2)

These don't block Gate 2 sign-off but should land before Gate 3 architecture lock.

1. **OQ-DRL-3.4** — Drill 3.4 Stage-Gate content sourcing (PT bank refs vs canonical 20 reuse).
2. **OQ-SIM-4.2-AC** — Module 4 Simulator missing answer-choice authorship.
3. **OQ-DRL-3.6-AI** — Drill 3.6 v1 evaluation strategy (templated similarity vs local sentence embeddings).
4. **OQ-DRL-3.9-OCR** — Drill 3.9 fashion-themed source: re-OCR or re-author.
5. **OQ-RR-MOBILE** — R&R Drill mobile fallback exact shape.
6. **OQ-CALIBRATION-CONTENT** — M1.13 + M5.8 capstone calibration content sourcing.

Recommendations for each are inline in `CONTENT_INVENTORY.json` → `open_questions[]`.

---

## Gate 2 → Gate 3 hand-off

If Joshua approves Gate 2:
1. The 173 Table A entries become Gate 3 architecture inputs (each entry must have a typed Zod schema, a route, a component, a persistence shape where applicable).
2. The 6 open questions above resolve before Gate 3 lock.
3. `scripts/import-content.ts` becomes a Gate 3 deliverable: it reads the canonical sources at `/Curriculum/Main Conclusion/`, validates against schemas, emits typed JSON to `src/data/`, and produces `manifest.generated.json` for parity tracking.
4. No production code lands until Gate 3 architecture sign-off (per handoff §7).

---

## Gate 5 verification (forward-look)

At pre-merge, the parity check runs:
1. `manifest.generated.json` lists every Table A entry with a real component file.
2. No source file outside Table A or Table B appears in any `*.generated.json`.
3. No Table B file appears in any `*.generated.json`.
4. Every voice passage renders verbatim in at least one rendered surface (build-output grep).
5. Every named tool renders with its lexicon name unchanged.
6. Every worked example renders in every section listed in `used_in`.

Drift between artifacts and the actual built app is a build failure (handoff §4).
