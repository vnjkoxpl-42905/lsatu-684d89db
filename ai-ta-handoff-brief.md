# AI TA Assistant: Status and Remaining Work

Last updated: April 23, 2026

## Current status: BUILT

The AI TA system is fully implemented end to end. Do not rebuild any of it.

### What exists and works

- `/admin/library`: upload PDFs/docs, text extraction, search, filter, edit, delete
- `/admin/ta`: student selector, conversational chat, real-time subscriptions
- Floating TA widget on all pages (admin-only, permission-gated, shares state with full page)
- `ta-chat` Edge Function: loads student context (profile, 200 attempts, 50 WAJ items, 10 prior assignments, 20 chat history messages, 5 library search results), calls Gemini 2.5 Pro via Lovable AI gateway, parses <<<DRAFT>>> blocks, persists both turns
- DraftCard: approve creates `ta_assignments` + sends inbox notification via `taNotify.ts`, reject updates status, revise sends instructions back
- Classroom page merges homework and TA assignments in one list
- `/classroom/ta/:id`: renders assignment as scrollable HTML, auto-marks "viewed" on open, "Mark complete" button, PDF download via html2canvas + jsPDF
- Admin-side assignment status strip per student (assigned/viewed/completed counts)
- Feature flag: `has_ta_access` on profiles table
- DB tables: `teaching_assets`, `ta_interactions`, `ta_assignments`
- RPC: `search_teaching_assets` for library retrieval

### Full pipeline flow

1. Admin selects student, types instruction in TA chat
2. Edge Function assembles context + calls Gemini
3. Gemini responds (optionally with a <<<DRAFT>>> block)
4. DraftCard renders draft with approve/reject/revise
5. Approve inserts `ta_assignments` row + sends inbox notification with link
6. Student sees assignment in Classroom list
7. Student opens → auto-viewed → reads scrollable HTML → can download PDF → marks complete
8. Admin sees status counts on TA page

---

## Remaining work

### 1. Gmail email notification (the one missing feature)

Inbox notification works. Email does not. When an assignment is approved, nothing emails the student. If they're not logged in, they won't know.

**What to build:**
- Edge Function `send-assignment-email` (or extend approve flow)
- Send from contact@aspiringattorneys.com
- Content: assignment title + link to lsatprep.study/classroom/ta/{assignmentId}
- Trigger: call from DraftCard after successful approve (after the inbox notification)

**What not to change:**
- Do not modify DraftCard's approve/reject/revise logic. Only add an email call after the existing approve flow.
- Do not modify `taNotify.ts` (inbox notification is separate and working)

**Implementation options (pick one):**
- Supabase Edge Function using Resend, Postmark, or SendGrid API
- Supabase Edge Function calling Gmail API directly (more complex, requires OAuth)
- Supabase Database Webhook that triggers on `ta_assignments` INSERT

### 2. Live testing and system prompt tuning

The system prompt in `ta-chat/index.ts` (lines 61-71) defines TA behavior rules. These need live testing:
- Does the TA only suggest when asked?
- Does it always present a draft before assigning?
- Does it cite which library assets it's pulling from?
- Is the tone right?

This is iterative. Test with real assets and adjust the prompt as needed.

### 3. Library search quality verification

The RPC function `search_teaching_assets` returns top 5 results. Verify:
- Does it do full-text search or simple ILIKE?
- Do the right assets surface for relevant queries?
- Does it handle a growing library (20+ assets) gracefully?

### 4. Dead column cleanup (low priority)

`ta_assignments.pdf_url` is never populated. PDFs are generated client-side on demand. Either remove the column or populate it on approve if server-side PDFs become needed later. Not urgent.

---

## What NOT to change

- Do not modify the `ta-chat` Edge Function or Gemini integration (unless tuning the system prompt)
- Do not modify the Teaching Library page or `useTeachingAssets.ts`
- Do not modify the TA admin page layout, TAChatView, or StudentSelector
- Do not modify DraftCard's core approve/reject/revise logic
- Do not modify the FloatingTAWidget
- Do not modify Classroom.tsx or ClassroomTAAssignmentDetail.tsx
- Do not modify `taNotify.ts`
- Do not modify the Foyer, drill system, or inbox UI
- Do not modify `displayName.ts`
- Do not modify existing RLS policies
- Do not add student-facing AI features

## Architectural rules

- Granular feature flags, not roles
- DB mutations never swallow errors
- RLS on all new tables
- Zero layout shift
- No dead buttons
- Admin displays as "Joshua" via displayName.ts

## Verification

- `npx tsc --noEmit -p tsconfig.app.json` must pass
- `npm run lint` must pass
- `npm run build` must pass
- Test full pipeline: admin approves draft → student sees in classroom → opens → views → completes
- Verify admin-only gating on all TA surfaces
