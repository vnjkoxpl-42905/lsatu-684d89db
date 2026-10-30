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
The action of pushing a Library item to one student with a date. In the redesigned Teacher Workspace, Assign is a top-level area because assigning work is one of Joshua's primary daily jobs. It still has **two doors**, co-equal: (1) from the **Library** — "I have this drill, send it to Lydia"; (2) from a **Student** — "here's Lydia, add a conditional note + the Causation bootcamp." Both doors land in the student's plan/feed. Future: pre-filled / automated from session transcripts.

## Top-level nav (target)

Verb/surface-first, co-equal Library + Students:
- **Today** — the start page for what needs attention now.
- **Students** — door 1: roster -> per-student plan, assign from here, recap, smartboard, conversation, that student's Insights.
- **Assign** — the fast path for giving work to students.
- **Teach** — live teaching tools, teaching materials, review surfaces, and the AI Teaching Assistant.
- **Admin** — accounts + granular feature flags.

Homes still TBD under these areas for: Schedule, Whiteboard, Library, Insights, Conversations, Recaps, Templates, Bootcamp References, Tutor Corpus.

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
The Excalidraw canvas tied to one student. It is **live and co-edited**: during a tutoring session both Joshua and the assigned student open the same board and draw/type/erase together in real time. Outside a live session it is still one student's board — the "teacher presents solo" case is just the student not currently looking. After the session the board **persists into the student's Classroom** so the student can review it later (via `posted_to_classroom` / `linked_recap_item_id`, surfaced as a `smartboard_recap` classroom item). Templates remain a teaching aid Joshua prepares once and reuses; a template is NOT student-assignable (the student receives the live/saved board, not the template). Superseded: the earlier rule that "the student doesn't receive a board" — that wall is removed for the live tutoring surface.

### Command
The route-level home base, now named **Teacher Desk** in the product language. Command is a **task list-centered** hub for triage (what needs a reply), AI draft approvals, today's priorities, and the **transcript inbox** (incoming Session Transcripts awaiting recap-generation/approval). The **AI Teaching Assistant is embedded in the Desk as an always-visible panel** (see AI Teaching Assistant); the Desk and the assistant share one surface. (This intentionally reverses the earlier rule that the Desk was "not the assistant page.")

### Today
The top-level start page for the Teacher Workspace. It replaces "Command" as the user-facing name for the daily home base. Today shows what needs Joshua's attention now and gives him a clear next action. It is organized around only three teacher task modes: Reply, Review, and Assign.

### Daily Command Sheet
The desired feel of the Today page: calm, direct, and action-oriented rather than a dashboard. It emphasizes a small set of task modes and clear next actions. It avoids giant hero sections, scattered stat cards, extra category lists, and empty sections that compete with real work. The **AI Teaching Assistant panel is a permanent, intentional fixture** of the desk (not clutter), but it must still feel calm and precise rather than a busy, generic chat app.

### Instrument Panel Visual Direction
The chosen visual language for the Teacher Workspace is a close adaptation of the quiet technical instrument panel reference, not a loose mood board. The page should use the same basic composition: pale graphite canvas, faint technical grid, top metadata line, compact left-side tool stack, one central wireframe work object, restrained right-side control cluster, small technical labels, thin black strokes, clear active states, and generous empty space. It should feel like a premium operating desk, not a generic SaaS dashboard.

- Borrow: pale gray/blue-gray background, fine grid texture, precise black linework, compact left-side tools, restrained right-side controls, small technical labels, one selected action state, and lots of breathing room.
- Translate: the central "object" becomes the selected teacher task or student decision; left tools become Today task groups and navigation; right controls become reply/assign/review/approve actions.
- Avoid: copying 3D modeling controls literally, decorative cube visuals that do not serve teaching work, low-contrast text, tiny unreadable controls, and empty aesthetic space that hides the next teacher move.

### Today Task Groups
Today uses only three main task modes: **Reply**, **Review**, and **Assign**. These are the only task groups inside Today.

- Reply: student messages or communication tasks Joshua needs to handle.
- Review: drafts, uploads, transcripts, recaps, or student work waiting for Joshua's judgment.
- Assign: work Joshua needs to give next, including suggested assignments surfaced from analytics, transcripts, or student progress.

Everything else is supporting context, not a main category. Schedule appears only as a small "Next session" module. Watchlist disappears as its own category; if a student needs attention, that attention becomes a Reply, Review, or Assign task. Drafts belong inside Review. Later today is a quiet footer or side note, not a full section.

### Students
The top-level area for student-centered work. It contains conversations, student detail, student assignments, student recaps, student progress, and student files.

### Assign
The top-level area for giving work to students. It contains assignments, bootcamps, guided drills, activities, and templates.

### Teacher Desk
The page-level name for Command. It means Joshua's operating desk for the teaching day: the place he starts from before opening a student, assignment, conversation, schedule, insight, or draft.

### Teach
A top-level Teacher Workspace area for live-session work: the surfaces Joshua uses while teaching or preparing an active session. Teach contains session-support tools such as the whiteboard, schedule/session plan, active lesson materials, AI Teaching Assistant, live notes, and transcript tools.

- Not: assignments, bootcamps, guided drills, activities, or templates, which belong under Assign.
- Not: student files, progress, recaps, or student detail, which belong under Students.
- Not: pending drafts, uploads to review, or conversations needing reply, which belong under Today.

### Study Schedule
A student-specific plan of dated LSAT work or sessions that Joshua assigns from the Teacher Workspace. A Study Schedule is created in relation to one student, usually from that student's page or conversation, and the student's context is part of the assignment decision. A Study Schedule may be drafted from an uploaded PDF or HTML file, but it is not active until Joshua reviews and approves it. Once approved, it creates both a student-facing message/notification and rows in the student's LSAT U in-app Schedule. It does not imply writing to the student's personal external calendar.

### Study Schedule Version
An assigned iteration of a student's Study Schedule. Joshua must be able to either edit the current version or replace it with a new version. Edits keep the same schedule assignment and update the affected rows. Replacements create a new version that supersedes the prior schedule. LSAT U should not infer edit-versus-replacement silently when the consequence is meaningful.

### Study Schedule Cadence
The expected rhythm of a Study Schedule. Imported schedules are commonly seven-day plans or weekly templates that a student should consistently follow. The schedule should preserve day-by-day structure, recurring timing patterns, and study focus progression instead of flattening the import into unrelated calendar events. If the source contains real dates, the draft should create dated rows. If the source only names weekdays or day numbers, the draft is a weekly template and Joshua must choose the start week before assigning it.

### Schedule Item
One row in a Study Schedule. A Schedule Item can have an exact time range, a loose time window such as morning or first half of the day, or only a date/day with no specific time. It should tell the student what to do that day even when no precise time exists. Time precision is part of the item and should not be invented when the source only gives a loose window. Draft Schedule Items must let Joshua edit the day/date, time or time window, task/session title, LSAT focus, instructions/notes, item type, and Needs Review status before approval.

### Study Schedule Import
An approval-gated workflow that turns an uploaded schedule file into a draft Study Schedule. It is a platform workflow, not only a Study Partner feature: it can be launched from Study Partner chat, student pages, conversations, or assignment surfaces when Joshua uploads or attaches a PDF, HTML file, or other readable schedule source. The workflow should use deterministic file reading and structured parsing where possible, use AI only for ambiguous extraction or normalization, infer the intended student only when context is clear, and hold the result for Joshua's review. Study Schedule Import prepares the assignment; it never sends the schedule or syncs it to the student's LSAT U Schedule without explicit teacher confirmation.

### Draft Preparation
The maximum automatic action allowed during Study Schedule Import. LSAT U may read the uploaded file, extract schedule text, parse rows, infer a likely student from context, normalize dates/times, flag uncertain fields, and organize an editable draft. Draft Preparation stops before any student-visible change: it cannot assign the schedule, notify the student, update the student's LSAT U Schedule, or replace an existing Study Schedule without Joshua's explicit approval.

### Needs Review
A draft state for imported schedule rows or fields that LSAT U could not read confidently. Needs Review does not mean the import failed; it means Joshua must fix or confirm the unclear parts before the Study Schedule can be assigned. Examples include missing dates, unclear time ranges, ambiguous student context, unreadable PDF text, duplicated rows, or AI-normalized fields with low confidence. Partial imports should still create a draft when useful structure is available; for example, if four of seven days are readable, LSAT U should show those rows and warn that the remaining days may be missing or unreadable. A hard import failure is reserved for files with no useful schedule structure.

### Admin
The top-level area for system management and configuration. Admin contains accounts, permissions, feature flags, tutor corpus/admin review, source management that is not student-facing, and system settings.

- Not: daily teaching work, student assignments, schedule preview, conversations, whiteboard, drafts needing approval, or other active teaching tasks.

### Teacher Workspace Redesign
The project track for making the overall teacher workspace calmer, clearer, and easier to operate. It concerns page structure, navigation, task visibility, student access, assignment flow, analytics access, and reducing unnecessary divisions. It is related to the AI Teaching Assistant but is not the same task.

### AI Teaching Assistant
The operator assistant for Joshua. It knows each student's context, has access to analytics, suggests next assignments, drafts student communications, helps process transcripts/notes/messages into concrete next actions, and learns from what Joshua approves, edits, rejects, and repeats. It uses a memory base to serve Joshua better across sessions. It is more than a chat box. It is **always visible as a panel on the Teacher Desk (Today)** and may also have a dedicated home; wherever it is opened it is **one assistant with one shared conversation history** (`operator_messages`, with reopenable recent chats), powered by the `teacher-operator-chat` engine.

### AI Teaching Assistant Buildout
The project track for making the assistant more capable over time. It concerns drafting, recommendations, analytics-aware student context, memory, learning Joshua's Teaching Profile, approval-gated autonomy, and background review. It is related to the Teacher Workspace Redesign because the workspace is where Joshua primarily accesses it, but it is a distinct task.

### Approval-Gated Autonomy
The operating model for the AI Teaching Assistant. The assistant should prepare drafts, actions, memory updates, and recommendations for Joshua's approval before anything reaches students or changes their plans. Over time, it should get smarter by analyzing Joshua's approvals, edits, rejections, repeated patterns, student outcomes, and teaching preferences, with the long-term aim of handling more teaching operations on Joshua's behalf.

### Teaching Profile
The memory model the AI Teaching Assistant builds about Joshua so it can emulate his teaching operation over time. It includes Joshua's decision-making, teaching judgment, student-handling patterns, student communication voice, curriculum preferences, and workflow habits.

- Teaching judgment: when Joshua assigns review vs. new material, slows down, pushes forward, or changes course.
- Voice: how Joshua writes to students, including tone, length, directness, and encouragement style.
- Student handling: how Joshua responds to low completion, confusion, missed work, strong performance, anxiety, or stalled progress.
- Curriculum preferences: which drills, bootcamps, notes, explanations, and assignment types Joshua prefers for different weaknesses.
- Workflow habits: what Joshua approves quickly, edits, rejects, repeats, or delegates.

### Learning Source
Evidence the AI Teaching Assistant can use to improve the Teaching Profile. Learning Sources include Joshua's explicit instructions, approved drafts, edits before approval, rejected drafts, actual student messages, recaps, assignment choices, transcript-derived notes, and student outcomes. The assistant should learn from both explicit instructions and implicit behavior.

### Background Review
The AI Teaching Assistant's passive mode when Joshua is not actively using the page. It reviews workspace signals, organizes what it notices, and prepares suggestions for making the Teacher Workspace more efficient. It can identify tasks Joshua should consider, but it does not send messages, assign work, change plans, or alter memory without approval.

### Task List-Centered
The Command page is organized by the teacher tasks waiting for Joshua, not by the student roster and not by app sections. A task answers "what do I need to handle next?" Examples: reply to students, approve assistant drafts, review uploads, assign next work, inspect analytics. Students appear inside tasks as the people affected by the work.

### Task
A teacher action or decision waiting for Joshua. Examples include replying to an unread student message, approving an assistant draft, reviewing uploaded work, assigning next work, investigating a progress concern, or processing a session transcript into recap/notes.

- Not: a shortcut to open Students, Library, Schedule, or Insights.

### Student-Centered
An organization model where the student is the primary object: Joshua scans students first, then discovers each student's messages, assignments, recaps, uploads, and analytics. This belongs in **Students** and student detail pages. Command may show student rows inside a queue, but Command is not primarily a student roster.

### Ingestion (Drive + Gmail)
The inbound layer that feeds the workspace from Joshua's Google account. **Import from Google Drive and Gmail.** It supplies two things: (1) **Library material** — notes (often stored as **HTML**), question sets, files Joshua imports to assign; (2) **Session Transcripts** — Meet/Gemini transcripts that arrive by email. Materials are imported (copied in), not read live, so the Library stays the source of truth.

### Note Matching (part of the pipeline)
When a Session Transcript is processed, the pipeline also **finds Joshua's existing corresponding notes** (his HTML notes / materials) for that lesson's topic and links them to the recap/session. So the transcript pipeline is: transcript -> (a) AI-drafted Recap + (b) matched existing Notes, surfaced together for Joshua to approve and attach to the student.

### The pipeline (spine of this redesign)
Session Transcript (from Gmail) -> AI-drafted Recap + matched Notes -> Joshua approves in Command -> attached to the student -> (future) auto-suggested Assignments. This pipeline, not the nav cleanup alone, is the point. The IA must reserve room for it: a transcript inbox in Command, a recap+notes draft surface per student, and an "auto-suggested" state on assignments.
