## Goal

When a student clicks **Show Answer** in the official drill runner and they got the question **wrong**, an AI tutor panel auto-opens with:

1. A precise, surgical explanation of **why their specific choice is wrong** (not generic).
2. A clean **structural breakdown** of the question (conclusion / evidence / objection / crucial insight).
3. A **Next Question** button when they're done.
4. The full conversation **persisted to the database** so it appears in the Wrong Answer Journal.

Tone: concise, nuanced, specific — like the existing Joshua tutor, but tightened.

## Files to edit / create

**Edit:**
- `src/pages/Drill.tsx` — auto-open tutor on Show Answer when wrong; pass `onNext`; pass mode flag.
- `src/components/drill/TutorChatModal.tsx` — add structural breakdown header card, "Next Question" CTA, persistence hook, typography polish, `mode="post-answer"`.
- `supabase/functions/tutor-chat/index.ts` — small prompt tweak so the **first turn** in `post-answer` mode is allowed to (a) name the correct answer, (b) explain crisply why the student's pick is wrong, and (c) reference the structural breakdown. Persist user + assistant messages when a `qid` + `user_id` is present.

**Create:**
- `supabase/migrations/<ts>_tutor_conversations.sql` — new table `tutor_conversations` (one row per message, scoped to user + qid + session) with RLS.

## Behavior spec

### Trigger
- In official runner, when user clicks **Show Answer**:
  - If their selected answer === correct answer → no tutor (current behavior).
  - If wrong → set `answerRevealed`, then auto-open `TutorChatModal` in `mode="post-answer"`.

### Tutor panel (post-answer mode)
- Header shows compact structural breakdown card (rendered from `currentQuestion.breakdown`):
  - Conclusion · Evidence · Objection · Crucial insight (collapsible "Show breakdown" toggle, default expanded).
- First assistant message (auto-streamed) does exactly:
  1. One sentence: why **(X)** — the student's pick — fails, quoting the trap phrase.
  2. One sentence: what the correct answer **(Y)** does that (X) didn't.
  3. One sentence: the takeaway / pattern.
- Markdown rendered with sleek typography (Inter, 14px, tight leading, neutral palette consistent with existing modal).
- Followups allowed (existing input).
- Footer: **Next Question →** primary button (advances drill via `onNext`); secondary **Close** button.

### Persistence
- New table `tutor_conversations`:
  - `id uuid pk`, `user_id uuid`, `qid text`, `session_id text null`, `role text`, `content text`, `created_at timestamptz default now()`.
  - RLS: users can select/insert their own rows.
- `TutorChatModal` writes each user message + completed assistant reply to the table once streaming finishes (best-effort, fire-and-forget).
- WAJ surface (out of scope here) can later read these rows; the schema is set up to support it.

### Edge function
- Add optional `mode: 'post-answer' | 'socratic'` to body. Default `socratic` keeps current Show-Answer-less behavior unchanged.
- In `post-answer` mode the system prompt allows naming the correct answer and contrasting it; still concise (≤3 sentences for first turn). All other guardrails preserved.
- Persist messages server-side using service-role insert into `tutor_conversations` if `user` is resolved.

## Out of scope
- No changes to classic layout, smart drill flow, routing, auth, or anything outside the post-answer tutor flow.
- No changes to the WAJ page (data is just stored; UI integration later).

## QA
- Wrong answer in official mode → tutor opens automatically, breakdown visible, response is specific to the chosen letter.
- Correct answer → no tutor.
- Followup question → streams; conversation saved.
- Next button → closes modal and advances to next question.
- Typecheck + build pass.
