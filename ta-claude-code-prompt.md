# AI TA Enhancement: Claude Code Execution Prompt

## Context

Read these files before doing anything:
1. `ai-ta-handoff-brief.md` — current system status (everything that's built)
2. `ta-enhancement-roadmap.md` — the full enhancement plan with six phases

The AI TA system is fully built and working. You are enhancing it, not rebuilding it.

## Your role

You are executing enhancements to the AI TA system. For each phase below, you must:

1. **Read the roadmap description for that phase**
2. **Explore the actual codebase** to understand how the current implementation works
3. **Propose a plan** that includes any improvements, corrections, or additions you think would make it better. You have freedom to suggest features or refinements not listed in the roadmap if they clearly improve the system. Flag these as "suggested addition" so Joshua can approve or reject them.
4. **Wait for "go"** before executing
5. **Execute, commit, verify**

You are not a blind executor. You are expected to audit the existing code, identify opportunities, and propose improvements. If you see something in the current implementation that could be better (naming, structure, error handling, UX flow), call it out in your plan.

---

## Phase F: Bell Notification System (do first)

### Goal
Replace the dead Bell icon on the Foyer dock with a real notification system. Assignment notifications show here (Facebook-style), not in the inbox. Messaging stays in the inbox only.

### Requirements
- New `notifications` table: id, user_id, type, title, body, link, read, created_at
- RLS: users can only read/update their own notifications
- Bell icon in `src/components/foyer/FoyerDock.tsx`: replace the toast placeholder with a real dropdown
- Dropdown shows recent notifications, newest first
- Unread badge count on the Bell icon (red pill, same style as inbox messenger badge)
- Tapping a notification navigates to its link and marks it read
- "Mark all read" option
- On TA assignment approve (in `src/components/ta/DraftCard.tsx`): insert a notification record for the student. Do this AFTER the existing `taNotify.ts` inbox message call. Do not modify the inbox notification or the approve/reject/revise logic.
- Notification type for assignments: type='assignment', title='New assignment: {title}', link='/classroom/ta/{assignmentId}'
- Real-time: subscribe to notifications table so new ones appear without page refresh

### Files to modify
- `src/components/foyer/FoyerDock.tsx` — Bell icon, dropdown
- `src/components/ta/DraftCard.tsx` — add notification insert after approve
- New hook: `src/hooks/useNotifications.ts` — query, subscribe, mark read
- New component: notification dropdown (could be inline in FoyerDock or separate)
- New migration: `notifications` table with RLS

### Files NOT to modify
- `src/lib/taNotify.ts` — inbox notification is separate, do not touch
- `src/components/inbox/FloatingMessenger.tsx` — messaging stays as-is
- `src/components/foyer/FoyerHeroRing.tsx`
- `src/components/foyer/FoyerSidebar.tsx`

### Your audit should check
- How the inbox unread badge currently works (in `useInbox.ts`) and match the pattern for notification badge
- Whether FoyerDock has other dead buttons (the Help icon). If so, note them but do not fix them in this phase.
- Whether the notification dropdown should also be accessible outside the Foyer (e.g., on every page via a header bar). Propose if you think it should.

---

## Phase A: TA Chat Input Upgrade (do second)

### Goal
Upgrade the TA chat textarea with a slash command palette, attachment toolbar, auto-resize, and animated typing indicator.

### Requirements

**Slash command palette:**
- When admin types `/` in textarea, show dropdown above input
- Commands: /diagnose, /assign, /plan, /bootcamp, /waj, /status, /prep
- Each has: icon (lucide-react), label, description, prefill text
- Arrow keys navigate, Tab/Enter selects, Escape closes
- Typing after `/` filters the list
- Quick action chips below textarea (visible when empty) for the same commands

**Attachment toolbar (dropdown bar):**
- Button row above or integrated with the textarea (like Claude's attachment bar)
- Options: Attach file, Attach screenshot, Attach transcript, Add notes
- File picker for PDFs, images, docs, text files
- On attach: store in `student_context` table (see Phase B below), extract text, make available to TA
- If Phase B table doesn't exist yet, build it as part of this phase

**Auto-resizing textarea:**
- Min height 60px, max 200px
- Grows as content is typed
- Resets to min on send

**Animated typing indicator:**
- Replace "TA is thinking..." with three animated dots
- Staggered pulse animation
- Use Framer Motion

**Critical constraint:** Nothing in the TA chat reaches the student. Slash commands prefill the textarea and send to `ta-chat` Edge Function, which writes to `ta_interactions` only. The only path to students is DraftCard approve. Do not create any new path to student-visible tables.

### Files to modify
- `src/components/ta/TAChatView.tsx` — main changes
- New migration: `student_context` table if not already created in Phase F

### Files NOT to modify
- `src/hooks/useTAChat.ts` — the hook stays the same, commands just prefill text
- `src/components/ta/DraftCard.tsx` — do not touch (already modified in Phase F)
- `src/lib/taNotify.ts`
- `supabase/functions/ta-chat/index.ts` — do not modify yet (Phase B will update it)

### Your audit should check
- Current textarea implementation in TAChatView.tsx (is it a plain textarea? shadcn Textarea? What props does it use?)
- Whether the FloatingTAWidget uses the same TAChatView component (it does). Confirm slash commands work there too.
- Whether any keyboard shortcuts conflict with existing ones (Ctrl+Enter for send)

---

## Phase B: Student Context Database (do third)

### Goal
The TA should be able to ingest external student data (files, screenshots, transcripts, notes from other platforms) and use it in future conversations.

### Requirements

**Table: `student_context`** (if not already created in Phase A)
- id (uuid PK), student_id (FK to profiles), context_type ('file', 'screenshot', 'transcript', 'note', 'external_score'), title, content_text, file_path, source, metadata (jsonb), created_by, created_at
- RLS: admin-only read/write

**Edge Function update: `ta-chat`**
- Add a query for recent `student_context` records for the selected student
- Include summaries in the Gemini prompt (after existing analytics, before conversation history)
- Cap at 10 most recent items, truncate content_text to reasonable length

**Upload flow:**
- When file is attached via the Phase A toolbar, upload to Supabase Storage under `student-context/{studentId}/{filename}`
- Extract text (reuse `pdfExtract.ts` for PDFs, read raw text for .txt/.md)
- Insert `student_context` row with extracted text
- TA chat immediately shows "Added {filename} to {studentName}'s context"

### Files to modify
- `supabase/functions/ta-chat/index.ts` — add student_context query and prompt injection
- `src/components/ta/TAChatView.tsx` — wire upload handler from Phase A to storage + DB
- New hook: `src/hooks/useStudentContext.ts` — upload, query, delete

### Your audit should check
- Current token budget in ta-chat. Adding student_context on top of analytics + WAJ + assignments + chat history + library search could get large. Propose a strategy for keeping total context under the Gemini token limit.
- Whether `pdfExtract.ts` handles images (it doesn't, it's text-only). For screenshots, you may need OCR or just store the image and let the admin describe it. Propose an approach.

---

## Phases C, D, E (plan only, do not build yet)

For these phases, **only propose a plan**. Do not implement.

**Phase C: Session Transcript Integration** — transcripts stored as student_context with type='transcript'. Propose how to handle long transcripts (summarization? chunking?).

**Phase D: Calendar Integration** — student_sessions table, Cal.com webhook or manual entry. Propose the simplest path that gives the TA session awareness.

**Phase E: Lesson Prep Mode** — /prep command that assembles a full pre-session briefing. Propose the prompt structure and output format.

---

## General rules for all phases

- Granular feature flags, not roles
- DB mutations never swallow errors
- RLS on all new tables
- Zero layout shift
- No dead buttons
- Admin displays as "Joshua" via displayName.ts
- Do not add student-facing AI features
- Do not modify existing RLS policies on other tables
- Do not modify the Foyer orbital ring, drill system, or inbox UI

## Verification after each phase

- `npx tsc --noEmit -p tsconfig.app.json` must pass
- `npm run lint` must pass
- `npm run build` must pass
- Phase F: verify Bell shows unread count, clicking notification navigates correctly, approve creates notification record
- Phase A: verify slash commands prefill and send correctly, verify nothing reaches student tables
- Phase B: verify uploaded file appears in student's TA context, verify ta-chat includes it in next Gemini call

## Suggest improvements

After auditing the codebase for each phase, if you see opportunities to improve the TA system beyond what's specified here, propose them. Examples: better error handling, smarter context assembly, UX improvements, performance optimizations, additional slash commands that would be useful. Flag these clearly as "suggested addition" in your plan so they can be approved or rejected individually.
