

## What's actually stored
- DB confirms admin (`user_id = 5ff160ef…`) has `profiles.display_name = "Joshua Fisseha"` — the only admin row.
- Project rule (CLAUDE.md): "instructor is displayed as **Joshua**".
- Current rendering surfaces use `display_name` verbatim:
  - `ThreadList.tsx` line 17 → joins raw display_names
  - `ConversationView.tsx` line 33 → header uses raw display_name
  - `MessageBubble` → renders raw `senderName`
- So once the RLS-fix RPC lands (previously approved plan), students will see **"Joshua Fisseha"** everywhere, not "Joshua".

## Two issues to resolve together

**Issue 1 — name not visible at all (already-approved fix, not yet shipped)**
RLS on `profiles` blocks students from reading the admin row → `display_name = null` → UI shows "Conversation". Fix: SECURITY DEFINER RPC `get_conversation_participant_names`.

**Issue 2 — when name does appear, it should say "Joshua" (per product rule), not "Joshua Fisseha"**
Need a single canonical formatter for the admin's display name across inbox surfaces.

## Proposed plan

### 1. Ship the RLS fix (from prior approved plan)
- New migration: `get_conversation_participant_names(_user_ids uuid[])` SECURITY DEFINER RPC, returns `(user_id, display_name)` only for users who share a conversation with the caller.
- `src/hooks/useInbox.ts` lines 80–85: replace direct `profiles` select with the RPC. (Code already references this RPC with a `@ts-expect-error` — migration just needs to actually create it.)

### 2. Add admin-name normalizer
- New util `src/lib/displayName.ts` with `formatParticipantName(displayName, isAdmin)` that returns `"Joshua"` when `isAdmin === true`, otherwise the trimmed `display_name`.
- Extend `useInbox.ts`:
  - Also fetch which participant `user_id`s have the `admin` role (via existing `has_role` / `user_roles`) and attach `is_admin: boolean` to each `Participant`.
  - Type update: add `is_admin?: boolean` to the `Participant` interface.
- Apply formatter in:
  - `ThreadList.tsx` line 14–17 (thread title + avatar initial → "J")
  - `ConversationView.tsx` lines 30–35 (header + `nameById` map for sender labels)
  - `MessageBubble` indirectly via the passed `senderName`

### 3. Verification
- As a student, open `/inbox`:
  - Thread title reads **"Joshua"**, avatar initial **"J"**
  - Conversation header reads **"Joshua"**
  - Incoming bubbles labeled **"Joshua"**
- As admin (Joshua), student names still render as their real `display_name` (admin path unchanged).
- No regression: non-admin participant names still appear verbatim.

## Files
- `supabase/migrations/<new>.sql` — `get_conversation_participant_names` RPC
- `src/hooks/useInbox.ts` — call RPC, fetch admin user_ids, set `is_admin` on participants
- `src/lib/displayName.ts` — new `formatParticipantName` helper
- `src/components/inbox/ThreadList.tsx` — use formatter
- `src/components/inbox/ConversationView.tsx` — use formatter

## Out of scope
- No `profiles` RLS changes
- No changes to admin-side rendering (admin keeps seeing real student names)
- No changes to `display_name` stored in DB (stays "Joshua Fisseha")

