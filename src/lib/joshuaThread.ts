import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the conversation id for the canonical 1:1 thread between the
 * current student and the admin (Joshua). If one does not exist, the RPC
 * creates it. RPC is SECURITY DEFINER so it works around the conversations
 * INSERT policy that would otherwise block non-admin callers.
 */
export async function startJoshuaConversation(): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_joshua_conversation');
  if (error) throw error;
  if (!data || typeof data !== 'string') throw new Error('No conversation id returned');
  return data;
}
