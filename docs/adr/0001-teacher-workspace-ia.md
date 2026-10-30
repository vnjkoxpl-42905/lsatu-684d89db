# 1. Teacher Workspace information architecture

Date: 2026-06-11
Status: Accepted

## Context

The teacher workspace (`/teacher`, admin-only, 23 pages) grew by accretion. Its nav was organized by artifact type and had structural problems:

- Two different surfaces were both named **Bootcamps**: a top-level *analytics* view (`BootcampsHub`) and a buried *assign* action (`Library > Bootcamps`, `TeacherBootcamps`). Same word, two unrelated jobs.
- Daily-use surfaces (Assignments, Guided Drills, Recaps, Uploads) were buried one layer deep inside a "Library" wrapper that actually held *actions*, not content.
- "Bootcamp References" sat next to "Bootcamps" with no clear distinction.
- The nav mapped to nouns, not to how Joshua teaches. Running one student's session meant touching four scattered tabs.

Joshua's actual mental model, surfaced in a grilling session: he thinks **task-first**, and the central task is **assigning prepared material to individual students** (bootcamps, guided drills, question sets, notes). He wants this fast to fire and eventually **automated from Google Meet/Gemini session transcripts** (emailed to him), with the pipeline also matching his existing HTML notes, and material imported from **Google Drive and Gmail**.

## Decision

Reorganize the workspace **verb/surface-first** with these rules:

1. **Top-level nav** (8 → focused set): **Command, Students, Conversations, Library, Whiteboard, Schedule, Insights, Admin.** "Bootcamp References" is demoted below the main set (it is private inspiration, not daily ops).

2. **Material types stay separate** (Bootcamp, Guided Drill, Question Set, Note, Whiteboard Template) — not collapsed into one generic item — but share two co-equal surfaces:
   - **Library** = the content store for everything *assignable*.
   - **Students** = per-student plans.
   **Assign has two doors**: from a Library item ("send this to X") and from a student ("add this to them"). Both land in the student's plan.

3. **Library holds only student-assignable material.** Anything Joshua cannot assign is not Library material. This is the line that separates Library from **Bootcamp References** (his private inspiration shelf, never assigned).

4. **The two old "Bootcamps" are renamed by their verb**: assigning a bootcamp is just **Assign**; bootcamp analytics is **Insights**. The word "Bootcamp" now means only the program.

5. **Recaps are transcript-driven, not hand-written**, and live **inside the student** (no top-level Recaps tab). A **Session Transcript** (Meet/Gemini, via Gmail) is an ingested input that drives an AI-drafted recap + matched notes, approved in Command.

6. **The transcript pipeline is part of this project**, not a later add-on. The IA reserves room for it: a transcript inbox in Command, a recap+notes draft surface per student, an "auto-suggested" state on assignments.

## Consequences

- The duplicate-Bootcamps collision disappears structurally; the terms can never re-collide because each job is named by its verb.
- The "Library" route changes meaning (from an action-wrapper to a content store). Existing `/teacher/library/*` routes and the `TeacherLibrary` sub-nav must be rebuilt; legacy paths get redirects.
- Whiteboard becomes a real top-level surface with a template gallery, not just a per-student canvas.
- New domain concepts (Session Transcript, Ingestion, Note Matching) enter the model and the schema; they did not exist in code at decision time.
- Scope is larger than a nav reshuffle because the transcript/Drive/Gmail pipeline is in-scope. Implementation should sequence: (1) IA + Library/Insights split + rename, (2) student-centric assign, (3) ingestion + pipeline.

See `src/pages/teacher/CONTEXT.md` for the glossary these decisions are written against.
