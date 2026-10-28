import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { ConversationView } from '@/components/inbox/ConversationView';
import { getOrCreateAdminStudentConversation } from '@/lib/adminConversation';

interface Props {
  studentId: string;
  studentName?: string | null;
}

/**
 * Center-panel "Messages" tab. Wires the real Messenger thread for the
 * selected student into Student Hub. If no thread exists yet, the admin
 * gets a Start button that creates the canonical 1:1 conversation.
 *
 * The thread itself is the same conversation surfaced in /inbox — sending
 * a message here is sending a real message to the student.
 */
export default function HubMessages({ studentId, studentName }: Props) {
  const { user } = useAuth();
  const { conversations, refresh } = useInbox();
  const [starting, setStarting] = useState(false);

  // Find the existing admin↔student thread from the inbox cache. We avoid
  // a fresh query — useInbox already loads all of the admin's threads.
  const existingFromCache = useMemo<Conversation | null>(() => {
    if (!user) return null;
    return (
      conversations.find((c) =>
        c.participants.some((p) => p.user_id === studentId) &&
        c.participants.some((p) => p.user_id === user.id),
      ) ?? null
    );
  }, [conversations, studentId, user]);

  // Per-student fallback lookup. Triggered only when the inbox cache is
  // stale or empty; resolves directly to a conversation_id if one exists.
  const fallback = useQuery<string | null>({
    queryKey: ['hub-admin-student-thread', user?.id, studentId],
    enabled: !!user && !existingFromCache,
    queryFn: async () => {
      if (!user) return null;
      const { data: mine } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      const ids = (mine ?? []).map((r) => r.conversation_id);
      if (ids.length === 0) return null;
      const { data: theirs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', studentId)
        .in('conversation_id', ids);
      return theirs?.[0]?.conversation_id ?? null;
    },
  });

  const conversationId = existingFromCache?.id ?? fallback.data ?? null;
  const fullConversation = useMemo<Conversation | null>(() => {
    if (!conversationId) return null;
    return conversations.find((c) => c.id === conversationId) ?? null;
  }, [conversations, conversationId]);

  // Refresh the inbox once when we resolve a fallback id, so the
  // ConversationView gets a hydrated conversation object.
  useEffect(() => {
    if (conversationId && !fullConversation) refresh();
  }, [conversationId, fullConversation, refresh]);

  const handleStart = async () => {
    if (!user || starting) return;
    setStarting(true);
    try {
      await getOrCreateAdminStudentConversation(user, studentId);
      await refresh();
      await fallback.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start a thread');
    } finally {
      setStarting(false);
    }
  };

  if (fullConversation) {
    return <ConversationView conversation={fullConversation} hideHeader />;
  }

  if (conversationId && !fullConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading thread…
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MessagesSquare className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">
            Message {studentName?.trim() || 'this student'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Start a real thread. Anything you send appears in the student's inbox.
          </p>
        </div>
        <Button onClick={handleStart} disabled={starting}>
          {starting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting…
            </>
          ) : (
            'Start thread'
          )}
        </Button>
      </div>
    </div>
  );
}
