-- Home message card: clearing becomes server state, not a local dismiss list.
--
-- Before this, whether a message showed on the Classroom Home card depended on
-- a list of "dismiss keys" kept in localStorage and mirrored into bootcamp_kv.
-- It never consulted read state, so reading a message in the inbox left the
-- card sitting there forever, and the card surfaced every conversation the
-- viewer had ever been part of.
--
-- The rule now: a message shows on Home until it is READ or CLEARED, and both
-- are per-participant server state, so the answer is the same on every device
-- and every surface.
--
--   read    -> conversation_participants.last_read_at   (already existed)
--   cleared -> conversation_participants.home_cleared_at (added here)
--
-- Clearing is a Home gesture only. It does not mark the thread read, does not
-- touch the unread badge in the inbox, and deletes nothing: the conversation
-- and every message in it are untouched. A NEWER message from that person has
-- a created_at past home_cleared_at, so it returns to Home as new.

alter table public.conversation_participants
  add column if not exists home_cleared_at timestamptz;

comment on column public.conversation_participants.home_cleared_at is
  'Home card is cleared through this instant for this participant. Messages at or before it never appear on Classroom Home; newer ones do. Not a read receipt and not a delete - the inbox is unaffected.';

-- The floor. Every existing participant row is cleared as of now, so the
-- accumulated backlog never appears on Home again and the card starts empty:
-- "only messages from this point forward". New conversations get NULL and are
-- therefore visible, which is the behaviour we want for anything future.
update public.conversation_participants
   set home_cleared_at = now()
 where home_cleared_at is null;

-- Home reads this per viewer on every load, always filtered to that viewer.
create index if not exists conversation_participants_user_home_cleared_idx
  on public.conversation_participants (user_id, home_cleared_at);

-- No new RLS needed: the existing UPDATE policy on conversation_participants is
-- already scoped to user_id = auth.uid(), so a viewer can only ever clear their
-- own card, and the SELECT policy already covers participants and admins.
