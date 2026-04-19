import { supabase } from "@/integrations/supabase/client";

// Admin user id (Joshua). The product rule is 1:1 per student with the admin,
// so the "Ask Joshua" entry point always targets this user. Kept as a const
// instead of a user_roles lookup to avoid an extra round-trip on every foyer
// click — the id is stable in this deployment.
export const ADMIN_USER_ID = "5ff160ef-016e-4ab5-aab1-55c7a2ad888f";

/**
 * Look up an existing 1:1 conversation between the current user and the
 * admin. Returns the conversation id or null if none exists.
 */
export async function findAdminConversationId(currentUserId: string): Promise<string | null> {
  if (currentUserId === ADMIN_USER_ID) return null;
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);
  const ids = (mine ?? []).map((r) => r.conversation_id);
  if (ids.length === 0) return null;
  const { data: shared } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", ADMIN_USER_ID)
    .in("conversation_id", ids)
    .limit(1);
  return shared?.[0]?.conversation_id ?? null;
}
