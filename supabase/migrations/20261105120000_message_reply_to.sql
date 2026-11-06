-- Swipe-to-reply: a message can quote an earlier message in the same thread.
--
-- Additive and nullable, so every existing message and every insert that does
-- not mention the column keeps working unchanged.
--
-- Deliberately NOT a foreign key. When the original is deleted the reply must
-- still know it was a reply, so the thread can say "Message deleted" instead
-- of silently turning into an ordinary message (ON DELETE SET NULL would erase
-- that). The client only resolves the id against messages already loaded for
-- the same conversation, so a stray id can never surface another thread's text.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid;

COMMENT ON COLUMN public.messages.reply_to_message_id IS
  'Id of the message this one replies to (same conversation). No FK on purpose: a deleted original renders as "Message deleted".';

CREATE INDEX IF NOT EXISTS messages_reply_to_message_id_idx
  ON public.messages (reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;
