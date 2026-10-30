
ALTER PUBLICATION supabase_realtime DROP TABLE public.messenger_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.messenger_conversations;
DROP TABLE IF EXISTS public.messenger_messages;
DROP TABLE IF EXISTS public.messenger_conversations;
