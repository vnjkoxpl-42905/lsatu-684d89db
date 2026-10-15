# Phase 2 — Lovable deploy ask (synthesis)

One new edge function to deploy. Everything else in Phase 2/3 is frontend +
client libs and ships on the next **Publish** (no function deploy).

## Deploy

- **Function:** `supabase/functions/synthesize-session-bundle/index.ts`
- **Secrets it needs (already present for the other AI functions):**
  `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Optional secret:** `SESSION_SYNTHESIS_MODEL` (defaults to
  `google/gemini-3-flash-preview`; set later to swap models, e.g. to Claude).
- **No migration.** It reuses `ai_ta_drafts`, `student_context`,
  `student_sessions`, `session_ingestions` — all already in place.

## Publish (frontend)

The dossier tabs, review UI, hooks, and the client-side publish library
(`publishSessionBundle.ts`, `sessionBundleNotify.ts`) go live on the next
Publish. Publishing approved parts runs under your admin JWT and needs no
function deploy.

## After deploy — E2E

Prereq: at least one **stored** session (Phase 1A/1B ingest done, transcript
attached to a matched student).

1. Open the student in the Teacher Workspace → **Sessions / Transcripts** tab.
2. Click **Build bundle** on a session that has a transcript.
3. Confirm only transcript-supported parts appear (no forced/empty sections,
   no "AI"/"Gemini"/"transcript" labels in student-facing copy).
4. Edit a part, approve parts one by one. The bundle shows "approved, ready to
   publish" only when every included part is approved.
5. **Publish** (all) or **Send** (one student-facing part). Verify in the
   student account: a recap appears in Classroom, homework/quiz appear as
   assignments, the inbox gets a note-voiced message (not "New assignment" for
   the recap), no raw transcript, no source labels.
6. Re-publish: already-sent parts are skipped (idempotent).
7. Regression: the existing `useAITADrafts` draft flow and the rest of the
   student detail page still work.
