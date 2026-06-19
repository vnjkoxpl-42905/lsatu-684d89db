import { formatDistanceToNow } from 'date-fns';
import { Plus } from 'lucide-react';
import { useOperatorChatContext } from '@/components/teacher/ai-ta/OperatorChatProvider';
import { cn } from '@/lib/utils';

/**
 * ChatGPT-style saved-chats rail for the Teacher Desk left sidebar. Sits under
 * the Workspace options: a New chat button plus the recent conversation
 * history, each row reopening that conversation in the center transcript.
 * Reads the shared OperatorChat session so it stays in sync with the center.
 */
export function DeskChatRail() {
  const { conversations, conversationId, newConversation, openConversation } = useOperatorChatContext();

  return (
    <div>
      <button
        type="button"
        onClick={() => newConversation()}
        className="inline-flex w-full items-center gap-2 border border-black/15 bg-white/25 px-3 py-2.5 text-left text-sm font-semibold text-black/75 transition hover:border-black/30 hover:bg-white/40"
      >
        <Plus className="h-4 w-4" strokeWidth={1.7} />
        New chat
      </button>

      <div className="mb-2.5 mt-7 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Chats</div>

      {conversations.length === 0 ? (
        <p className="border border-dashed border-black/18 bg-white/15 px-3 py-3 text-xs leading-5 text-black/48">
          No saved chats yet. Start one above and it will show up here to return to.
        </p>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((conversation) => {
            const active = conversation.id === conversationId;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className={cn(
                  'w-full border px-3 py-2.5 text-left transition',
                  active
                    ? 'border-black bg-black text-white'
                    : 'border-transparent text-black/65 hover:border-black/15 hover:bg-white/25',
                )}
              >
                <div className="truncate text-sm font-semibold">{conversation.title || 'New conversation'}</div>
                <div className={cn('mt-0.5 text-[11px] tabular-nums', active ? 'text-white/60' : 'text-black/42')}>
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
