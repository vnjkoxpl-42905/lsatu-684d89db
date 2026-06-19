import type { MouseEvent } from 'react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useOperatorChatContext } from '@/components/teacher/ai-ta/OperatorChatProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * ChatGPT-style saved-chats rail for the Teacher Desk left sidebar. Sits under
 * the Workspace options: a New chat button plus the recent conversation
 * history, each row reopening that conversation in the center transcript.
 * Reads the shared OperatorChat session so it stays in sync with the center.
 */
export function DeskChatRail() {
  const { conversations, conversationId, newConversation, openConversation, deleteConversation } = useOperatorChatContext();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteRequest = (event: MouseEvent<HTMLButtonElement>, id: string, title: string) => {
    event.stopPropagation();
    setPendingDelete({ id, title });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteConversation(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
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
              const title = conversation.title || 'New conversation';
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex w-full items-stretch border transition',
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-transparent text-black/65 hover:border-black/15 hover:bg-white/25',
                  )}
                >
                  <button type="button" onClick={() => openConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{title}</div>
                      <div className={cn('mt-0.5 text-[11px] tabular-nums', active ? 'text-white/60' : 'text-black/42')}>
                        {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${title}`}
                    onClick={(event) => handleDeleteRequest(event, conversation.id, title)}
                    className={cn(
                      'm-2 ml-0 inline-flex h-7 w-7 shrink-0 items-center justify-center border opacity-0 transition focus:opacity-100 group-hover:opacity-100',
                      active
                        ? 'border-white/18 text-white/55 hover:bg-white/10 hover:text-white'
                        : 'border-black/12 text-black/38 hover:bg-black hover:text-white',
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="max-w-[420px] gap-5 border-white/10 bg-[#171717] p-6 text-white shadow-2xl">
          <AlertDialogHeader className="space-y-3 text-left">
            <AlertDialogTitle className="text-xl font-semibold tracking-tight text-white">Delete chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6 text-white/72">
              This will permanently delete{' '}
              <span className="font-semibold text-white">{pendingDelete?.title ?? 'New conversation'}</span>{' '}
              and its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 border-white/12 bg-transparent text-white/82 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-500 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
