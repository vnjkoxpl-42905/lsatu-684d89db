## What the uploaded files actually are

Three zips → 13 markdown files covering Weeks 1–12 of "Blue LR Guided Drills." Each file holds multiple drill entries (~80+ total drills across all weeks). Every drill has the same shape:

- **Metadata block** (YAML-ish): `title`, `category` (Patterns / Process / etc.), `estimated_time`, `question_count`, `difficulty_level` (e.g. `1-3`, `3-5`), `question_type` (array — matches our existing qtype taxonomy), `question_feature` (matches the question_features field we just tagged), `start_button_label`.
- **Pre-Start Instruction Card** — two-column rich text (left = concept/why, right = "Try these N questions" with tactical bullets). This is the "note preview" you described.

There are **no hard-coded qids** in the files. Every drill is a *filter spec* (qtype set + feature + difficulty range + count). That's how we'll wire the question bank.

Reasoning type (Conditional / Causation / Comparative) we just tagged is *not* explicit in most cards but is implicit in many (e.g. "Conditional Logic Set 6", "Anti-Causal", "Quantifiers"). We'll infer where the title makes it obvious and otherwise leave it open (any reasoning type allowed).

## How this fits into LSAT U

This is a new product surface: **Guided Drills** — a catalog of admin-curated, instructor-voiced drills. It sits between "freeform Drill" and "Bootcamp." Conceptually:

```text
Bootcamp        →  multi-day curriculum
Guided Drill    →  single drill with Joshua's pre-start framing  ← NEW
Smart Drill     →  adaptive engine, no narrative
Full Section    →  timed PT section
```

Visibility rule (your requirement): **catalog is admin-only** until assigned. Students only see a guided drill once Joshua assigns or schedules it — and when they do, the pre-start card is **mandatory reading** (a "Read & Continue" gate) before the drill engine launches.

## Plan

### 1. Data model (Lovable Cloud)

Two new tables + reuse of `classroom_items` for assignment:

- **`guided_drills`** (admin-curated catalog, RLS = admin read/write, students no direct access)
  - `id`, `slug`, `week` (1–12), `order_in_week`, `title`, `category`, `estimated_minutes`, `question_count`, `difficulty_min`, `difficulty_max`, `question_types text[]`, `question_features text[]`, `reasoning_types text[]` (nullable / empty = any), `start_button_label`, `instruction_card_jsonb` (left/right markdown), `bank_filter_jsonb` (the resolved filter the engine uses), `is_published`.
- **`guided_drill_assignments`** (per-student instance)
  - `id`, `guided_drill_id`, `student_id`, `class_id`, `assigned_by`, `assigned_at`, `scheduled_for` (date, optional), `unlock_at`, `status` (assigned / read / started / completed), `read_card_at`, `started_at`, `completed_at`, `attempt_session_id`. RLS: admin all; student read/update own.
- Mirror into **`classroom_items`** with `type='guided_drill'` so it appears on the student's existing Schedule/Classroom surface alongside other items (matches existing pattern).

### 2. Importer (one-time, scripted)

`scripts/import-guided-drills.mjs`:
- Parse all 13 markdown files → extract YAML metadata + the two-column instruction card.
- Normalize question types to our exact qtype strings; map features to the canonical list we just tagged; infer reasoning_type from title keywords ("Conditional Logic" → Conditional Reasoning, "Causal/Anti-Causal" → Causation, "Quantifier/Comparison/Relative vs Absolute" → Comparative).
- Resolve a candidate question pool per drill (preview matched count vs. requested `question_count`) and write `bank_filter_jsonb`. Print a coverage report so we can spot any drill where the pool is too thin.
- Idempotent upsert by `slug`.

### 3. Admin UI — `/admin/guided-drills`

- **Catalog view**: filterable table by week / category / qtype / feature / reasoning type. Shows pool size vs. needed count.
- **Drill detail**: preview the exact pre-start card the student will see + sample of resolved questions.
- **Assign flow**: pick student(s), optional `scheduled_for` date, optional `unlock_at`. Can assign single, multiple, or "assign all of Week N in order."
- **Schedule builder**: drag drills onto a week-by-week schedule per student (defaults to the natural order from the markdown files; mix-and-match supported).

### 4. Student UX

- Assigned guided drills appear in **Schedule** and **Classroom** (existing surfaces) with a distinct "Guided" badge.
- Clicking opens the **Pre-Start Instruction Card** (full-screen, two-column, exactly as authored) with a "Start Drill" button that's disabled until the card has been visible (or scrolled) — enforcing your "read first" rule. `Info` button on the drill page reopens this card mid-drill.
- "Start" hands off to the existing drill engine with a `TypeDrillConfig` built from `bank_filter_jsonb` (qtypes + features + difficulty range + count, `unseen_only` honored).

### 5. Order, scheduling, mix-and-match

- Default ordering = Week 1 → Week 12, position-in-file (already implicit in the markdown). The importer stores `week` + `order_in_week` so we can render exactly that sequence.
- Admin can: assign one drill, assign a whole week, or build a custom plan by reordering. Scheduling sets `scheduled_for` / `unlock_at`; the student's Schedule respects unlock times (matches existing `classroom_items` policy).

### 6. Three-tier metadata respected

The catalog stores and the engine filters on all three layers we built:
1. **questionType** (always)
2. **reasoningType** (when card implies it)
3. **questionFeatures** (when card specifies one — most do)

So a "Conditional Logic (Medium) Set 6" drill resolves to: qtypes from the metadata × reasoningType=Conditional Reasoning × difficulty 2–4. No duplication, fully consistent with the hierarchy you confirmed last loop.

### 7. Out of scope for this pass

- Authoring UI (admin edits cards in-app). For now, source of truth = the markdown files + importer; admin can re-run import on edits.
- Auto-grading "blue vs red" tags (we're only ingesting blue cards as instructed).
- Bootcamp integration (these are standalone drills, not bootcamp days).

## Open clarification (one)

For the "must read the card before Start" gate — should it be:
- **(A)** soft (button enabled immediately, but we record `read_card_at` when they click Start), or
- **(B)** hard (Start disabled for ~10s OR until they scroll to the bottom of the card)?

I'll default to **(B) hard gate via scroll-to-bottom** unless you say otherwise — it matches your "have them read it before starting" intent best.

---

Hit **Implement plan** to proceed (I'll start with the migration + importer + admin catalog page, then the student pre-start gate).