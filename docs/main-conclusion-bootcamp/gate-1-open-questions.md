# Gate 1 — Open Questions for Joshua

**Status:** Resolved. Joshua's decisions logged 2026-04-30. See "Resolutions" below.
**Author:** Claude Code, 2026-04-30.

These were the items I could not decide alone. Joshua's resolutions are recorded inline under each entry.

---

## RESOLUTIONS — 2026-04-30 (locked unless re-opened)

| # | Decision |
|---|---|
| 1 | **React + TypeScript** confirmed. Per scaffolding-plan.md §1. |
| 2 | **15 named tools** (lexicon authoritative). Indicator Vault and Coach's Note are *also* module / UI surfaces — treat consistently across the architecture; do not double-count when rendering "the named-tools list." |
| 3 | **v1 question bank = Notes + Homework + Netlify extractions only.** PT Bank stays v1.5. |
| 4 | URLs to be supplied (or screenshots). Reference-study sections for Causation Station + Abstraction stay placeholder until then. |
| 5 | **AI Tutor stub:** slot-filled templates as the default. Hand-authored copy allowed for the top 5–10 most-specific responses. |
| 6 | (Audio retention) — to revisit before Gate 4. Default for now: keep forever, with manual clear-all in Settings. |
| 7 | **Dark-only for v1.** Color tokens are role-based so light mode is a token-swap, not a rewrite. |
| 8 | (Logo asset) — pending; ship serif wordmark until Joshua provides SVG. |
| 9 | **Build-time import script.** Source stays canonical at `/Curriculum/Main Conclusion/`. `scripts/import-content.ts` generates typed data files into `/src/data/` at build time. No copies in the repo. |
| 10 | (Voice-passage surface) — confirmed via #2; entries live in `src/content/voice-passages/`, parity-checked at Gate 5. |
| 11 | **Dual JSON + Markdown for Gate 2 inventory.** JSON is source of truth; Markdown auto-generated for review. |

### Framing correction logged

**Stage summaries and audit tally are AUTHORITATIVE, not archived.** The on-disk `audit_tally.md` and `stage_summaries/*.md` files are 3-line redirects pointing to `spec.html` Stage 1 sections — that is where the live tally lives:
- spec.html §3 — Notes inventory (49 files), tier-graded S/A/B/C/D.
- spec.html §4 — Homework inventory (21 files), tier-graded S/A/B/C/D.
- spec.html §5 — prototype inventory (6 deployed, 5 unique), UX + Code tiers.

**Gate 2 directive:** every tier S/A/B/C item in §3 + §4 must be preserved (lands on Table A). Tier D items land on Table B with the audit's "DELETE" / "DROP candidate" rationale recorded. The tally is a **primary input to Gate 2**, not a secondary one.

---

## #1 — Tech stack: React (handoff default) vs vanilla-JS spine (spec §11)

**Conflict.** The handoff §3.A defaults to **Vite + React + TypeScript + Tailwind**. The spec.html §11 "Brainstorm: the golden version" recommends **vanilla JS + CSS variables + localStorage + PDF export, lifted from MC Companion (S/100% codebase)**, and explicitly says "skip the React stack (single-prototype outlier)."

**Why it matters now.** Determines `package.json`, the folder structure, every component's authoring style, and what the 21st.dev primitives output. Reversing this after Gate 3 is a rewrite.

**My recommendation:** **Stay with React + TS** as the handoff specifies. The vanilla-JS recommendation in the spec is a "lift-the-codebase" optimization that made sense when the goal was reusing the MC Companion HTML. For a six-module bootcamp with shared workspace shell, command palette, route-driven persistence, R&R recorder, SRS engine, AI Tutor stub, and Trap Master overlay, React + TS earns its weight in component composition, type safety, and routing. We *port the patterns* from the prototypes (Stage-Gate, X-Ray Scan, chunk-tap + keyword-glow, role-reveal-on-success, PDF export via `window.print()`) into React components. We do not lift the HTML files. LSAT U absorption likely runs React anyway.

**Options for you:**
- A. Confirm React + TS (recommended).
- B. Switch to vanilla JS / vanilla TS + a small reactive layer (Lit, Preact Signals, or hand-rolled). Slower velocity, harder to onboard, but matches the spec recommendation literally.
- C. Hybrid: React shell, but per-drill "drill containers" are vanilla-JS islands that lift the prototypes verbatim. Higher complexity. Not recommended.

---

## #2 — Named tools count: 10 (handoff) vs 15 (lexicon)

**Conflict.** Handoff §5 + CLAUDE.md list **10 named tools to preserve verbatim**: FABS, 2-Part Conclusion Check, Skeptic's Ear Check, Upside Down Argument, Trojan Horse Concession, Pre-Phrase Goal, X-Ray Scan, Trap Master, Stage-Gate Tracker, R&R Drill.

The `/rules/named_tools_lexicon.md` documents **15 named tools** — the 10 above **plus**: Stegosaurus Interrogation, Indicator Vault, Coach's Note, Pronoun & Reference Library, Concession Decoder.

**Why it matters now.** The named-tools lexicon page in the Reference module renders this list. Naming consistency across LSAT U topics (per the lexicon's "platform-wide vocabulary" framing) hinges on which list is canonical.

**My recommendation:** Treat the lexicon's **15** as canonical (it's the more recent, more detailed source) and update the handoff/CLAUDE.md to match. All 15 names render verbatim in the Named Tools Lexicon page. Confirm.

---

## #3 — Module 4 Question Simulator content: PT bank (spec §2) vs canonical 20 (spec §11)

**Conflict.** Spec §2 working hypothesis says Module 4 sources from "the external PT bank (FS-16, P0)." Spec §11 "golden version" says Module 4 is the "20-argument PT-style classification drill (canonical content from MCFIRST + main_conclusion_questions + main_conclusion_answer_key)." Handoff §6 says PT Bank integration is **out of scope for v1**.

**My read:** v1 ships **the canonical 20-argument bank only** (MCFIRST/main_conclusion_questions). PT Bank integration moves to v1.5 / LSAT U absorption. This matches handoff §6 "PT Bank integration (future) — Out of scope for v1."

**Confirm:** Question Simulator v1 = the canonical 20 only.

---

## #4 — Causation Station and Abstraction URLs

I need the deployed URLs (or local paths if either is a local artifact) to inspect them before Gate 3. The reference-study.md notes for those two apps are placeholders until I see the actual UI.

**Need from you:**
- Causation Station URL (or path).
- Abstraction URL (or path).
- Login credentials if either is gated. *(I will not enter credentials — I'll ask you to load the URL in a Chrome tab and let me read the rendered DOM via the Chrome MCP.)*

---

## #5 — AI Tutor scope for v1

Handoff §6 says: "v1: stub mode. Templated responses anchored to spec content. Suggested-question chips. No live LLM call."

**Question:** Where do the templated responses live?
- A. Authored in `src/content/ai-tutor/` as a static lookup keyed by `{lessonId, conceptId, questionId, traitId}`. Cheap, deterministic, no surprises.
- B. Authored as a small set of templates with slot-fills against the spec content. More flexible but easier to drift from voice.

**My recommendation:** A. Hand-authored, voice-locked, per-context. v1.5 swaps in the LLM — at that point we have the labeled corpus to fine-tune against.

---

## #6 — R&R Drill audio retention policy

Handoff §6 + spec §3.6.2: R&R recordings live in IndexedDB v1. **How long do we keep them?**

**Question:** What's the retention policy?
- A. Keep forever, with a manual "clear all R&R recordings" button in Settings.
- B. Auto-purge after N days (90? 30?). Show a banner when nearing expiry.
- C. Keep only the last N recordings per drill (e.g. last 3).

Audio blobs grow fast. A 20-minute LR section recording at 64 kbps Opus ≈ 9.6 MB. Ten sessions ≈ 100 MB in IndexedDB.

**My recommendation:** Default to **A** with a Settings toggle to opt into B (90-day auto-purge). Show storage usage in Settings.

---

## #7 — Theme: dark default vs light parallel

Spec §3.1 says "dark mode default. Light-mode token set ships in parallel; same names, lighter values." Handoff §3.A says "dark-mode private-academy aesthetic."

**Question:** Does v1 ship light mode at all, or is it dark-only with light queued for v1.5? Light-mode token authoring + a11y audit is non-trivial work.

**My recommendation:** **v1 dark-only.** Note the CSS variable layer makes light mode a token-swap — easy to add post-v1.

---

## #8 — Brand wordmark / logo asset

Spec §3.2.1 mentions "Aspiring Attorneys logo" in the Stage-Gate header and PDF export footer. Do you have a logo asset (SVG preferred)? If not, we ship the wordmark in `font-family: var(--serif); font-weight: 700` until you provide one.

---

## #9 — Source corpus: read-only vs imported into project

Handoff §9 lists source paths under `lsat-u/Curriculum/...`. **How does the build access them?**

**Options:**
- A. **Read-only at build time.** Vite plugin / build script reads from the canonical paths and emits typed JSON into `src/content/`. The bootcamp folder stays self-contained at runtime; canonical paths are the authoring surface.
- B. **Copy at scaffolding.** Snapshot the canonical content into `src/content/` once; updates require re-running the import script.
- C. **Symlink.** Risky on Windows / iCloud / Dropbox.

**My recommendation:** **A.** Build script `scripts/import-content.ts` reads the canonical paths, validates against Zod schemas, emits typed JSON + a manifest. Re-run on demand. Canonical truth stays in `lsat-u/`.

---

## #10 — Voice-passage preservation surface

Voice calibration rule: every passage tagged "preserve verbatim" in the audit lands in v1. **Where do they live in the build?**

**My recommendation:** A `src/content/voice-passages/` folder, one file per passage, with frontmatter recording the source filename, the passage tag, and which lessons / drills / Coach's Notes consume it. The Gate 5 parity check verifies every entry actually renders somewhere in the built app.

Confirm.

---

## #11 — Gate 2 inventory format: Markdown vs JSON

Handoff §4.D says: `CONTENT_INVENTORY.md or .json`, `CONTENT_PARITY_MAP.md or .json`, `NOT_INCLUDED_IN_V1.md`.

**My recommendation:** Author both `CONTENT_INVENTORY.json` and `CONTENT_PARITY_MAP.json` for machine checkability (Gate 5 re-verification runs against them). Generate the `.md` views from the JSON for human review. `NOT_INCLUDED_IN_V1.md` stays Markdown.

---

## #12 — Confirmation needed for Gate 1 sign-off

For Gate 1 to close, I need:
- ✅ Acknowledgement of `docs/scaffolding-plan.md`.
- ✅ Acknowledgement of `docs/reference-study.md`.
- ✅ Resolutions on **Open Questions 1, 2, 3, 5, 7, 9, 10, 11** (the rest can wait but ideally land before Gate 3).
- ✅ URLs for Causation Station + Abstraction (Open Question 4).

When those are in, Gate 1 closes and Gate 2 (Content-Scope Inventory) begins. Gate 2 produces the three parity artifacts under `/docs/parity/`. **No production code lands until Gate 3 architecture sign-off.**
