---
status: accepted
date: 2026-06-14
---

# The Activity Centre is its own context, separate from the Drill engine and Homework

Coach-led skill exercises (Activities, e.g. Negation Station) get their own module, types, routes, and tables (`activities` + `activity_assignments`) rather than extending the question-bank Drill engine (`types/drill.ts`, `DrillSession`) or the Homework set/assignment tables. Activities are authored free-text content with their own answer keys and a conversational AI Coach that returns a per-response verdict, which is a fundamentally different shape from a timed run over multiple-choice `qid` questions. The assignment side deliberately mirrors the proven Homework snapshot pattern (per-student immutable copy, status, score) without sharing its tables.

## Considered options

- **Extend the Drill engine.** Rejected: `DrillSession`/`DrillMode` model a timed MCQ run keyed by `qid`; Activities have no qids, no fixed options, and judge free text. Welding them on would overload "drill" and tangle two unrelated lifecycles.
- **Reuse `homework_sets` / `homework_assignments` with a `kind` column.** Rejected: a homework set is a flat `qid[]`; an Activity carries instructions, ordered items, multiple credited answers, and explanations. Forcing both into one table makes each messier and couples their RLS/immutability rules.
- **New standalone Activity Centre context, mirroring the Homework assignment pattern (chosen).** Buys a clean glossary boundary (Drill vs Activity, see `src/features/activity-centre/CONTEXT.md`) and lets the assignment layer reuse a battle-tested snapshot/RLS shape without sharing storage.

## Consequences

- A third parallel "assignable thing" now exists (Drill, Homework, Activity). The Drill-vs-Activity term boundary is pinned in CONTEXT-MAP.md so the word "drill" is never reused for Activities.
- The teacher assign UI and any cross-cutting "assigned to me" views must union three sources, not one.
- The Coach reuses the existing `analyze-stem-response` AI-gateway pattern but must be extended to return a structured verdict (`correct`/`partial`/`incorrect`), not prose alone.
- Deferred hooks (AI item-generation, weakness-driven suggestions) read from `activity_assignments`; designing its score/verdict columns now keeps that path open.
