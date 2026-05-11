
-- Enable RLS on realtime.messages to authorize channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies (idempotent)
DROP POLICY IF EXISTS "authenticated_can_receive_own_topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_can_send_own_topics" ON realtime.messages;

-- Allow authenticated users to subscribe/receive only on topics they're authorized for:
--   * conversation:<uuid>  -> must be a participant
--   * user:<uuid>          -> must match auth.uid()
--   * presence/broadcast under those same topics
CREATE POLICY "authenticated_can_receive_own_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'conversation:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'user:%' THEN
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid = auth.uid()
    ELSE
      false
  END
);

-- Same scoping for sending broadcast/presence messages
CREATE POLICY "authenticated_can_send_own_topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'conversation:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'user:%' THEN
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid = auth.uid()
    ELSE
      false
  END
);
