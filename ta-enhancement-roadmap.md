# AI TA Enhancement Roadmap

Last updated: April 23, 2026

## Overview

The AI TA is evolving from an assignment generator into a full tutoring practice management hub. It should be the central brain where Joshua manages every student, tracks all data (in-app and external), prepares for sessions, and assigns work. Everything flows through the TA.

---

## What's already built

- Teaching Library (permanent curriculum assets)
- TA chat with Gemini 2.5 Pro (conversational, context-aware)
- Draft approval flow (approve/reject/revise)
- Student classroom delivery (HTML + PDF download)
- Floating TA widget on all pages
- In-app inbox notification on assignment approve

---

## Enhancement phases

### Phase A: TA Chat Input Upgrade

**Slash command palette**

When admin types `/` in the textarea, show a dropdown with commands:
- `/diagnose` — full student diagnostic summary
- `/assign` — search library and draft an assignment
- `/plan` — build a multi-week study plan
- `/bootcamp` — recommend next bootcamp based on analytics
- `/waj` — review WAJ and suggest targeted practice
- `/status` — show all assignment statuses for this student
- `/prep` — prepare for next session with this student (see Phase D)

Each command prefills the textarea with a structured instruction. Arrow keys navigate, Tab/Enter selects, Escape closes. Quick action chips shown below input when empty.

**Dropdown toolbar (attachment bar)**

A toolbar above or below the textarea (like Claude's attachment bar) with:
- **Attach file** — upload PDF, image, doc to student's context
- **Attach screenshot** — upload image of student work from another platform
- **Attach transcript** — upload session transcript (video call recording transcript)
- **Add notes** — freeform admin notes about the student

All attachments are student-specific (not the teaching library). They get stored, text-extracted, and added to the student's context so the TA can reference them in future conversations.

**UI polish**
- Auto-resizing textarea (min 60px, max 200px, reset on send)
- Animated typing dots (replaces "TA is thinking..." text)
- Framer Motion animations on command palette and attachments

**Critical constraint:** Nothing sent in the TA chat reaches the student. All data stays in `ta_interactions` and the new student context tables. The only path to the student is DraftCard approve.

---

### Phase B: Student Context Database

**New table: `student_context`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK to profiles |
| context_type | text | 'file', 'screenshot', 'transcript', 'note', 'external_score' |
| title | text | Display name |
| content_text | text | Extracted text for LLM retrieval |
| file_path | text | Supabase Storage path (if file) |
| source | text | Where data came from: 'upload', 'session', 'external_platform' |
| metadata | jsonb | Flexible: date, platform name, score data, tags |
| created_by | uuid | Admin who added it |
| created_at | timestamptz | |

This is separate from `teaching_assets` (which is curriculum, shared across students). `student_context` is per-student intelligence: their external work, session notes, transcripts, screenshots from other platforms.

**RLS:** Admin-only read/write. Students cannot see this table.

**Edge Function update:** `ta-chat` adds a query for `student_context` (recent items for the selected student) and includes them in the Gemini prompt alongside existing analytics, WAJ, and interaction history.

---

### Phase C: Session Transcript Integration

**What it does:**
After a video tutoring session, Joshua uploads the transcript (text file, or copy-paste). The TA stores it as a `student_context` record with `context_type = 'transcript'`.

**How the TA uses it:**
- Summarize key points from the session
- Track what was discussed and what follow-ups were promised
- Reference past sessions when planning next steps ("In your April 15 session, you discussed conditional reasoning. Here's a follow-up drill.")

**Upload flow:**
- Via the attachment bar in the TA chat: "Attach transcript"
- File picker for .txt, .md, .pdf, or a paste-in dialog for raw text
- On upload: extract text, store in `student_context`, TA immediately has access

---

### Phase D: Calendar Integration

**What it does:**
Connect Joshua's calendar (Cal.com is already planned per CURRENT-STATE.md) so the TA knows:
- When the next session with each student is scheduled
- When the last session was
- How many sessions have occurred

**How the TA uses it:**
- `/prep` command: "Your next session with Sarah is tomorrow at 2pm. Since your last session (April 18), she completed 2 of 3 assignments and her LR accuracy improved from 52% to 61%. Here's a suggested agenda: review her WAJ items on necessary assumption, introduce the new parallel reasoning bootcamp, and assign a timed drill."
- Proactive context: when you select a student, the TA automatically shows when the next session is (if scheduled)
- Session history becomes part of the student's context

**Data model:**

New table: `student_sessions`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK to profiles |
| scheduled_at | timestamptz | Session date/time |
| status | text | 'scheduled', 'completed', 'cancelled', 'no_show' |
| duration_minutes | int | Session length |
| transcript_id | uuid | FK to student_context (if transcript uploaded) |
| notes | text | Quick post-session notes |
| created_at | timestamptz | |

**Calendar sync options:**
- Manual: admin logs sessions through the TA ("I had a session with Sarah today, 60 minutes")
- Cal.com webhook: when a booking is created/completed, auto-create a `student_sessions` record
- Both: Cal.com for scheduling, manual for post-session notes and transcript attach

---

### Phase E: Lesson Prep Mode

**What it does:**
The `/prep` command assembles everything the TA knows about a student into a pre-session briefing:

1. **Session info:** When is the next session, how long since the last one
2. **Activity since last session:** What assignments were completed, what's overdue
3. **Analytics changes:** Performance trends since last session (improved/declined areas)
4. **WAJ highlights:** Unresolved wrong answers worth discussing
5. **Transcript recap:** Key points from the last session transcript
6. **External data:** Any screenshots or files you uploaded since last session
7. **Suggested agenda:** Based on all of the above, what to cover in the next session

This runs as a structured Gemini prompt that outputs a formatted briefing. Not a draft assignment. Just a document for Joshua to review before the session.

---

### Phase F: Notification System

**Bell icon (student-facing)**

New table: `notifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| type | text | 'assignment', 'message', 'reminder', 'streak' |
| title | text | Short notification text |
| body | text | Optional detail |
| link | text | Deep link (e.g., /classroom/ta/:id) |
| read | boolean | Default false |
| created_at | timestamptz | |

- Replace the dead Bell icon toast with a real notification dropdown
- Unread badge count on the Bell (like the inbox messenger badge)
- Tapping a notification navigates to the link and marks it read
- Assignment notifications are Facebook-style (not chat messages)
- Messaging stays in the inbox only

**Email notification**

- Edge Function `send-notification-email`
- Triggered on assignment approve (after inbox notification and Bell notification)
- Sends from contact@aspiringattorneys.com
- Simple template: assignment title + link to lsatprep.study

---

## Recommended build order

1. **Phase F: Bell notification** — fixes a dead button (architectural violation), unblocks the notification flow
2. **Phase A: TA chat input upgrade** — slash commands, attachment bar, UI polish
3. **Phase B: Student context database** — new table, upload flow, Edge Function update
4. **Phase C: Session transcripts** — builds on Phase B, just a specific context_type
5. **Phase D: Calendar integration** — depends on Cal.com shipping, can be manual first
6. **Phase E: Lesson prep** — builds on everything above, highest-value feature but needs the data first

Phases A and F have no dependencies and can go in parallel. Phases B-E are sequential.

---

## What NOT to change (across all phases)

- Do not modify the ta-chat Edge Function's core Gemini call logic (only add new context sources)
- Do not modify DraftCard's approve/reject/revise logic (only add notification calls after)
- Do not modify the Teaching Library (student_context is a separate table)
- Do not send TA chat content to students (only DraftCard approve reaches them)
- Do not modify the Foyer orbital ring
- Do not modify the drill system
- Do not modify displayName.ts
- Do not modify existing RLS policies on other tables

## Architectural rules (all phases)

- Granular feature flags, not roles
- DB mutations never swallow errors
- RLS on all new tables (admin-only for student_context and student_sessions)
- Zero layout shift
- No dead buttons
- Admin displays as "Joshua" via displayName.ts
