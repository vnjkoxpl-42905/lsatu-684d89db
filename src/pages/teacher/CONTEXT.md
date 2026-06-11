# Teacher Workspace — Context

The teacher workspace (`/teacher`, admin-only) is Joshua's operator surface for running 1:1 LSAT bootcamps. This file is the glossary: what each term means here, so the nav and code stop colliding. It is not a spec.

## Organizing principle

The nav is **verb-first**: organized by what Joshua does, not by artifact type. The central verb is **Assign** — pushing prepared material to a student. The long-term goal is to make assignment fast to fire and eventually automated (driven by session transcripts), pulling from a library of prepared materials.

## Glossary

### Assignable (material type)
A kind of prepared material Joshua can give a student. These stay SEPARATE object types — they are NOT collapsed into one generic item. The types: **Bootcamp**, **Guided Drill**, **Question Set**, **Note**, **Homework**, and (future) **Whiteboard Template**. Each keeps its own builder/editor. What unifies them is not their shape but two shared surfaces: the **Library** (where all of them live) and **Assign** (how any of them reach a student).

### Library (content store)
The single place that holds ALL of Joshua's prepared materials, grouped by type: every Bootcamp, every Guided Drill, every Question Set, every Note, every Whiteboard Template. This is a CONTENT store, not an action menu. (The current app misuses "Library" as a wrapper for assign-actions; that is the bug being fixed.) From the Library Joshua browses/edits material and can assign it.

### Assign (the verb / action)
The action of pushing a Library item to one student with a date. NOT its own top-level tab. It has **two doors**, co-equal: (1) from the **Library** — "I have this drill, send it to Lydia"; (2) from a **Student** — "here's Lydia, add a conditional note + the Causation bootcamp." Both doors land in the same place (the student's plan/feed). Future: pre-filled / automated from session transcripts.

## Top-level nav (target)

Verb/surface-first, co-equal Library + Students:
- **Command** — home base (triage, AI drafts, today's priorities).
- **Students** — door 1: roster -> per-student plan, assign from here, recap, smartboard, conversation, that student's Insights.
- **Library** — door 2: all prepared material by type (bootcamps, guided drills, question sets, notes, whiteboard templates), assign from here.
- **Insights** — analytics (absorbs old top-level "Bootcamps" topic-analytics + the "Analytics" Library tab).
- **Admin** — accounts + granular feature flags.

Homes still TBD for: Schedule, Smartboard, Recaps, Conversations, Templates, Bootcamp References.

### Bootcamp
A multi-day topic program (Causation Station, Intro to LR, etc.). It is ONE kind of Assignable. NOTE the old collision: two surfaces were both called "Bootcamps" —
- the **assign** action (`TeacherBootcamps`, toggle a bootcamp on for a student) → this is just Assign.
- the **analytics** view (`BootcampsHub`, per-topic completion/accuracy) → this is **Insights**, NOT Assign.
"Bootcamp" the word now means only the program itself. The two jobs are named by their verb.

### Insights
Read-only analytics: per-student and per-topic progress, completion, drill accuracy, flashcard reviews. Absorbs the old top-level "Bootcamps" (topic analytics) and the "Analytics" Library tab.

### Bootcamp Reference
Inspiration material **for Joshua only** (`data/bootcampReferences.ts`): example bootcamps and sources he draws from when *building* his own bootcamps. **Never assigned to students.** This is the hard line that defines the Library: References are teaching-prep for Joshua, so they do NOT belong in the Library (which holds only assignable, student-facing material). References get their own separate top-level home (a personal reference shelf). Only **Bootcamps** — the finished programs — are assignable.

### Library (rule)
**Library holds only things a student can receive.** If Joshua can't assign it to a student, it is not Library material (that rules out Bootcamp References, which are his private inspiration shelf).

### Session Transcript (new term, not yet in code)
The raw record of a live lesson, produced by **Google Meet / Gemini** and **emailed to Joshua**. Should sync into the workspace automatically. It is an **ingested input**, not something Joshua writes. It is the trigger source for: (1) generating a **Recap**, and (2) future auto-suggested assignments. One transcript belongs to one student's session.

### Recap
A post-session summary for a student. **Not hand-written** — AI-drafted from the student's **Session Transcript**, then Joshua approves it (same approve-draft flow as Command). Lives inside the student (each recap belongs to one session). Generation is a Command/AI pipeline; there is no batch "Recaps" writing tab. A teaching output, not an Assignable.

### Whiteboard (Smartboard)
The Excalidraw canvas for live teaching. Its own **top-level tab**: a template gallery (reusable boards prepped per lesson type — conditional, causal) plus saved sessions. Opened standalone or attached to a student. Templates are a teaching aid Joshua prepares once and reuses; they are NOT a student-assignable material (the student doesn't receive a board, Joshua presents on it).

### Command
The home base: triage (what needs a reply), AI draft approval queue, today's priorities, and the **transcript inbox** (incoming Session Transcripts awaiting recap-generation/approval). Contains the operator AI assistant. (The separate "AI TA" route was already merged into Command — `/teacher/ai-ta` redirects to `/teacher`.)

### Ingestion (Drive + Gmail)
The inbound layer that feeds the workspace from Joshua's Google account. **Import from Google Drive and Gmail.** It supplies two things: (1) **Library material** — notes (often stored as **HTML**), question sets, files Joshua imports to assign; (2) **Session Transcripts** — Meet/Gemini transcripts that arrive by email. Materials are imported (copied in), not read live, so the Library stays the source of truth.

### Note Matching (part of the pipeline)
When a Session Transcript is processed, the pipeline also **finds Joshua's existing corresponding notes** (his HTML notes / materials) for that lesson's topic and links them to the recap/session. So the transcript pipeline is: transcript -> (a) AI-drafted Recap + (b) matched existing Notes, surfaced together for Joshua to approve and attach to the student.

### The pipeline (spine of this redesign)
Session Transcript (from Gmail) -> AI-drafted Recap + matched Notes -> Joshua approves in Command -> attached to the student -> (future) auto-suggested Assignments. This pipeline, not the nav cleanup alone, is the point. The IA must reserve room for it: a transcript inbox in Command, a recap+notes draft surface per student, and an "auto-suggested" state on assignments.
