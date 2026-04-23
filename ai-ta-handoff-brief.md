# AI TA Assistant: Claude Code Handoff Brief (Revised)

Last updated: April 23, 2026

## Status

The AI TA system is built. Teaching Library, TA admin page, floating widget, Gemini 2.5 Pro integration, draft approval flow, and PDF extraction all exist and are wired. This brief covers what's missing and what needs to be connected.

---

## What exists (do not rebuild)

All of the following are implemented and functional:

- `/admin/library` page: upload, search, filter, edit, delete teaching assets
- `/admin/ta` page: student selector, conversational chat, real-time subscriptions
- Floating TA widget on home page (admin-only, permission-gated)
- `ta-chat` Edge Function: assembles student context (profile, attempts, WAJ, assignments, interaction history), searches teaching library, calls Gemini 2.5 Pro via Lovable AI gateway, persists both turns to `ta_interactions`
- DraftCard component: approve creates `ta_assignments` record, reject updates status, revise sends instructions back to the TA
- `useTeachingAssets.ts`: full CRUD with storage cleanup
- `useTAChat.ts`: queries, real-time subscriptions, send mutation
- `pdfExtract.ts`: PDF text extraction via pdfjs-dist (200k char limit)
- Feature flag: `has_ta_access` on profiles table
- DB tables: `teaching_assets`, `ta_interactions`, `ta_assignments`

---

## What's missing (the actual work)

### Gap 1: Classroom does not show TA assignments

**Problem:** The Classroom page (`src/pages/Classroom.tsx`) only queries `homework_assignments`. When the TA approves a draft and creates a `ta_assignments` record, the student never sees it. The classroom and the TA system are disconnected.

**Fix:** The Classroom page needs to also query `ta_assignments` for the logged-in student and render them alongside homework assignments. Each TA assignment should display as scrollable HTML content (already stored in `ta_assignments.content_html`) with a PDF download option.

**Files to modify:**
- `src/hooks/useStudentAssignments.ts`: add a second query for `ta_assignments` where `student_id = auth.uid()` and `status = 'assigned'`
- `src/pages/Classroom.tsx`: render TA assignments in the list (distinct from homework assignments, or unified with a type indicator)
- New component or route: TA assignment detail view that renders `content_html` and offers PDF download

**What not to change:**
- Do not modify `homework_assignments` table or its queries
- Do not change `useAdminAssignments.ts`
- Do not modify the TA admin page or DraftCard

### Gap 2: No notification system

**Problem:** When a TA assignment is approved, nothing tells the student. No in-app notification, no email. The `ta_assignments` row is created silently.

**Fix (two parts):**

**Part A: In-app notification.**
- Option 1: Add a `notifications` table (id, user_id, type, title, message, read, created_at) and insert a row when DraftCard approves. Show unread count on student nav.
- Option 2: Use the existing inbox/messaging system to send a message to the student with a link to the assignment.

Option 2 is simpler and reuses existing infrastructure. The inbox already supports 1:1 messaging with the admin. A system message like "You have a new assignment: [title]" with a link to the classroom detail page would work.

**Part B: Email notification via Gmail.**
- Trigger an email when DraftCard approves
- Send from contact@aspiringattorneys.com
- Content: "You have a new assignment in LSAT U" with a link to lsatprep.study/classroom
- Implementation: new Edge Function `send-notification-email` or extend the approve flow in DraftCard to call an existing email service

**Files to modify:**
- `src/components/ta/DraftCard.tsx`: after successful approve, trigger notification (inbox message and/or email)
- If using inbox: `src/hooks/useInbox.ts` (or call the messaging insert directly)
- New Edge Function for email if Gmail API is the route

**What not to change:**
- Do not modify the inbox UI or messaging components
- Do not change how the TA chat or approval flow works

### Gap 3: TA assignment status tracking

**Problem:** `ta_assignments` has `status`, `viewed_at`, and `completed_at` columns, but nothing updates them. The student can't mark an assignment as viewed or completed.

**Fix:**
- When student opens the assignment detail page: update `status` to 'viewed' and set `viewed_at`
- Add a "Mark complete" button on the assignment detail view: update `status` to 'completed' and set `completed_at`
- Admin should see assignment status on the TA page or admin dashboard

**Files to modify:**
- New TA assignment detail page (or extend ClassroomAssignmentDetail)
- `useStudentAssignments.ts`: add mutation for status updates
- TA admin page or dashboard: show per-student assignment status

### Gap 4: PDF download for TA assignments

**Problem:** TA assignments store `content_html` for web rendering and `pdf_url` for download, but nothing generates the PDF. The `pdf_url` column is never populated.

**Fix:**
- On approve: generate a PDF from `content_html` and upload to Supabase Storage
- Store the storage path in `ta_assignments.pdf_url`
- Student sees a "Download PDF" button on the assignment detail page

**Implementation:** Use a server-side HTML-to-PDF approach in an Edge Function (or generate client-side using a library like jsPDF/html2pdf).

---

## Recommended build order

1. **Classroom integration** (Gap 1): connect `ta_assignments` to the student's classroom view. This is the highest priority because without it, approved assignments go nowhere.

2. **Notification on approve** (Gap 2): send inbox message + email when an assignment is approved. Start with inbox message (Part A, Option 2) since infrastructure exists.

3. **Assignment status tracking** (Gap 3): let students view and complete assignments, let admin see status.

4. **PDF download** (Gap 4): generate downloadable PDFs from assignment content. Lower priority since content renders as HTML on the page.

---

## What NOT to change

- Do not modify the `ta-chat` Edge Function or Gemini integration
- Do not modify the Teaching Library page or `useTeachingAssets.ts`
- Do not modify the TA admin page layout or TAChatView
- Do not modify DraftCard's approve/reject/revise logic (only add notification calls after approve)
- Do not modify the FloatingTAWidget
- Do not modify the Foyer, drill system, or inbox UI
- Do not modify `displayName.ts`
- Do not modify existing RLS policies on other tables
- Do not add student-facing AI features

## Architectural rules

- Granular feature flags, not roles
- DB mutations never swallow errors
- RLS on all new tables
- Zero layout shift
- No dead buttons
- Admin displays as "Joshua" via displayName.ts

## Verification after each gap

- `npx tsc --noEmit -p tsconfig.app.json` must pass
- `npm run lint` must pass
- `npm run build` must pass
- New queries must respect RLS (student sees only their own assignments)
- Test with a real approved TA assignment flowing through to classroom
- Verify admin-only gating on all TA surfaces
