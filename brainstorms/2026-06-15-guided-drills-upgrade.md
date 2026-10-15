# Guided Drills Admin Upgrade: Brainstorm / Discovery Notes
Date: 2026-06-15 · Goal: Define what "upgrade and enhance" means for the admin-only Guided Drills catalog (`src/pages/admin/GuidedDrills.tsx`) so it can be implemented as small, safe changes.

## Current state (from code inspection)
- File: `src/pages/admin/GuidedDrills.tsx`. Admin-only. Renders a single flat `<table>` of all 108 drills across 11 weeks, no grouping/pagination.
- Filters: search by title, week dropdown, reasoning-type dropdown (hardcoded: Conditional Reasoning, Causation, Comparative Reasoning).
- Columns: Wk (W#.#), Title, Category, Q-Types (badges), Reasoning (badges), Feature, # (question_count), Pool (resolved live from bank_filter; turns amber when pool < needed).
- Per-row actions: Open HTML (`/guided-drills/:slug`), Markdown Preview (sheet, left/right instruction card), Assign (sheet: optional schedule date + student checkboxes → createAssignments + classroom item + notify).
- Data: `listGuidedDrills()` / `resolveGuidedDrillPool()` from `@/lib/guidedDrills`; students from `useHubStudents`.

## Summary / key decisions
- **Real goal is NOT layout/visual.** It's data correctness: every guided drill must have the right *question features* assigned and be correctly configured to pull the *right* questions from the question database. This is a config/audit problem, not a redesign.

## Q&A log
### Q1 — What's actually broken
- Asked: Is the pain findability, visual quality, missing capability, or broken behavior?
- Captured: None of the layout framings. The drills don't have the right question features assigned per drill. Joshua wants each drill verified/configured to pull the correct questions from the question database. Wants help making sure it's "configured properly to the right questions" based on the question DB.
- Interpretation: the `question_features` / `bank_filter` mapping on each drill is the focus. The "Feature" column + Pool count are the surface; the underlying drill→question mapping is what needs to be correct.
- Flags: Need to inspect `@/lib/guidedDrills` (bank_filter shape, resolveGuidedDrillPool) and the question DB schema/feature taxonomy before going further.

## Data model (confirmed by inspection)
- A guided drill maps to questions TWO ways (`src/lib/guidedDrills.ts`):
  1. **Exact list** — `question_qids` on the drill (or per-assignment override). Preferred; deterministic.
  2. **Dynamic filter** — `bank_filter` = { qtypes[], features[], reasoning_types[], difficulty_min/max, count }. Sampled live from the in-memory bank via `resolveGuidedDrillPool`. Falls back to this when no exact qids.
- Pool match logic: qtype (exact, lowercased) ∩ features (ANY match) ∩ reasoning_types (ANY match) ∩ difficulty range. So `bank_filter.features` strings MUST exactly match the bank's `questionFeatures` vocabulary (lowercased compare) or the drill silently pulls the wrong/empty pool.
- Separate display field `question_features` (shown in the "Feature" column) is NOT the same as `bank_filter.features` (the selector). They can drift.
- **Canonical taxonomy:** `src/lib/questionFeatureFamilies.ts` — 60 distinct features grouped into families (Conditional & Formal Logic, Causal, Quantities/Sampling/Math, Argument Structure, Answer Choice Traps, Match/Similarity/Composition, ...). This is the source of truth for valid feature strings.
- Drill seed data lives in supabase migrations (`20260526222555...sql`, `20260507170553...sql`).

### Q2 — Deliverable (audit vs editing tool)
- Asked: audit-first, then fix, then optional inline editor?
- Captured: Joshua redirected to a prerequisite: first produce the inventory — every question feature + count of bank questions tagged with it. (Scope question still open; answered after he sees numbers.)

## Question feature inventory (computed 2026-06-15 from public/data/*.json)
- Bank totals: **3,964 LR questions** across 156 PT section files. **3,402** carry ≥1 feature; **562 have NO feature tag**. **60 distinct features.**
- Source field: `questionFeatures` in each PT JSON. Taxonomy grouping: `src/lib/questionFeatureFamilies.ts`.
- **Drift found:** `Belief / Knowledge / Intent` (59 q) exists in the bank but is missing from `questionFeatureFamilies.ts`, so the family/Build-a-Set UI can't surface it. One-line fix.

Counts by family (feature → # questions):
- Conditional & Formal Logic (848): Conditional Diagramming 222, Sufficient vs. Necessary Flaw 166, Conditional Conclusion 117, Contrapositive Logic 113, Logical Completion 82, Untriggered Conditional 67, Refute a Conditional 61, Complex Conditionals 20
- Causal Reasoning (398): Anti-Causal 171, Causal Difference-Maker 154, Causal Chains 73
- Quantities, Sampling & Math (602): Math-y Stuff 156, Net Effect 154, Quantifiers 114, Sampling 70, Relative vs. Absolute 46, Volume Dial 32, Percentages 30
- Argument Structure (1400): Missing Link / Idea 484, New Concept in Conclusion 222, First Sentence Conclusion 178, Important Pivot 176, Intermediate Conclusions 112, Principles in Stimulus 80, Focused on Evidence 51, Links Between Premises 49, Implicit Principles 35, Implied Conclusion 13
- Answer Choice Traps (1227): Famous Flaws 326, Principles in Answers 221, Defender 220, Argue the Anti-Conclusion 219, Abstract Answers 117, Worst of the Worst 73, Repetitive Answers 51
- Match, Similarity & Composition (399): Analogies 130, Assumes Similarity 121, Assumes Difference 98, Part vs. Whole 50
- Stimulus Style (840): Rebuttals 456, 2-Speaker 263, Dense Stimulus 93, Battle of Opinions 21, Clarification/Misunderstanding 7
- Tasks & Question Goals (1910): Plans / Recommendations 480, Explain Curious Fact 431, Timeframes 224, Alternatives 191, Plausibility 149, Predictions 128, Weighing Tradeoffs 92, Ruling Out Options 88, Binaries 44, Breadcrumbs 43, Proposition/Generalization 40
- Quirks & Topics (613): Science 320, EXCEPT 143, Medical 141, Games-y LR 9
- Uncategorized (in bank, missing from taxonomy): Belief / Knowledge / Intent 59

### Q3 — PIVOT: LSAT Lab → database → sets
- Context: Joshua shared a screenshot of app.lsatlab.com (third-party platform, NOT LSAT U) showing a question table for PT101, section 3, with checkboxes selected on some rows, columns: PT / section / Q# / stem snippet / two numeric cols / comment + play icons. He is logged in.
- Asked (verbatim, cleaned): "select the questions from PT101–PT109, make a database from this, I'm logged in, create sets based off it."
- AMBIGUOUS — three readings:
  1. Read LSAT Lab pages PT101–109 and build a reference database (CSV/sheet) of question metadata (incl. LSAT Lab's own tags/the two numeric cols).
  2. Operate the LSAT Lab UI (via Chrome, since logged in) to check questions and create "sets" inside LSAT Lab for PT101–109.
  3. Use it to build LSAT U guided-drill SETS (map to LSAT U bank, which already contains PT101–109).
- Not yet acted. Need clarification before any browser automation on his real account.

## Open flags (pending input)
- Scope decision (audit vs inline editor) still pending — ask after Joshua reviews the inventory.
- Should `Belief / Knowledge / Intent` be added to `questionFeatureFamilies.ts` (and to which family)?
- Q3 ANSWERED: (1) Database = EXTRACT from LSAT Lab (Chrome, logged in), PT101–109 question metadata incl. LSAT Lab's columns. (2) Sets = create INSIDE LSAT Lab via the UI.
- Q3 follow-up still open: what defines each "set"?

## LSAT Lab UI map (inspected live, tab 1319249138)
- Question Bank: app.lsatlab.com/practice/overview?tab=tab_practice&type=LR&showall=true
- Table columns: TEST / S / Q / NAME(stem snippet) / DIFFICULTY (1–5) / ATTEMPTS / comment icon / play icon. (The two numeric cols in Joshua's screenshot = Difficulty + Attempts.)
- Filters: PT selector (101…), QUESTION TYPES, REASONING TYPES, QUESTION FEATURES, LEVELS, EXPLANATIONS. LSAT Lab has its OWN feature taxonomy (may differ from LSAT U's 60).
- Show-entries combobox set to 100 → full PT fits one page. PT101 LR = 51 questions.
- Set creation = "Create Practice Set" button (ref_15). Selection-mode checkboxes (seen in Joshua's screenshot) appear in that flow.
- Extraction plan: per PT 101–109, set PT filter, get_page_text, parse rows → CSV (TEST,S,Q,NAME,DIFFICULTY,ATTEMPTS [+ feature/type if we capture per-filter]).

## EXECUTION: per-PT set creation (decided: one set per PT, create directly)
- Working flow (verified on PT101):
  1. Click "Create Practice Set" → opens builder panel + checkbox table below.
  2. Confirm PT filter dropdown = target PT.
  3. Click header select-all checkbox → selects all 51 (shown@100/page).
  4. Click "Create" → name modal.
  5. Type name "PT 1XX LR", leave timer/shuffle default → Submit.
  6. Success modal → "Return to Page" resets builder (selection cleared, PT filter persists).
- Naming convention: "PT 1XX LR".
- DONE: **PT 101 LR** (51 questions) ✅ created 2026-06-15.
- PIVOT: Joshua built his own combined set; per-PT creation abandoned after PT101.

## INGESTION RESULT (the real deliverable)
- Discovery: the bank table's DataTables row objects already hold each question's full metadata client-side. The `question.subtypes` array = LSAT Lab's Question Features (+ subtype + topics). No need to click through cards.
- Bridge method (JS-tool returns truncate at ~1KB; clipboard blocked w/o gesture): render CSV into a `<pre>`, read via get_page_text in two 40KB passes.
- File written: `brainstorms/lsatlab-101-109-features.csv` — 608 rows, all PT101–109, cols: PT, Section, Question, QuestionType, QuestionSubtype, Features, Difficulty, Attempts, QID, Name.
- Verified: 609 lines (608 + header), all 9 PTs present. 45 rows have NO features (blank in LSAT Lab too).
- Use: backfill LSAT U's untagged questions (562 bank-wide; this covers the 101–109 subset). Note LSAT Lab's feature vocab is RICHER/different from LSAT U's 60 (108 distinct tags incl. topics like Science/Medical/Animals, reasoning like "Conditional Logic", and flaw subtypes) — will need mapping before importing into LSAT U.
