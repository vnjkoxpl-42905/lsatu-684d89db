import { useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';

export default function TeacherConversations() {
  const { user } = useAuth();
  const { conversations, loading, refresh } = useInbox();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5">
            <MessageSquare className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Conversations</div>
            <div className="text-[11px] text-zinc-500">
              All your student threads in one place
            </div>
          </div>
        </div>
        <NewConversationDialog
          onCreated={(id) => {
            setActiveId(id);
            refresh();
          }}
        />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr]">
        <aside className="border-r border-zinc-800/60 overflow-y-auto bg-zinc-950/60">
          {loading ? (
            <div className="p-6 text-sm text-zinc-500">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">
              No conversations yet. Start one with a student.
            </div>
          ) : (
            <ThreadList
              conversations={conversations}
              activeId={activeId}
              onSelect={setActiveId}
              variant="admin"
            />
          )}
        </aside>
        <section className="min-w-0 min-h-0 overflow-hidden flex flex-col">
          {active && user ? (
            <ConversationView conversation={active} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 px-6 text-center">
              {conversations.length === 0
                ? 'Start a thread with a student to begin.'
                : 'Pick a conversation from the left.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
