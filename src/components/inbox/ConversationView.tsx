import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, type Conversation } from '@/hooks/useInbox';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onMessageSent?: () => void;
  /** When true, suppress the internal header — for embedded use inside a
   *  containing surface (e.g. FloatingMessenger) that renders its own. */
  hideHeader?: boolean;
}

export function ConversationView({ conversation, onBack, onMessageSent, hideHeader = false }: Props) {
  const { user } = useAuth();
  const { messages, refresh } = useConversationMessages(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  if (!user) return null;

  const others = conversation.participants.filter((p) => p.user_id !== user.id);
  const headerName = others.map((o) => o.display_name || 'Student').join(', ') || conversation.subject || 'Conversation';

  const nameById = new Map(conversation.participants.map((p) => [p.user_id, p.display_name]));

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/80 backdrop-blur">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{headerName}</div>
            {conversation.subject && (
              <div className="text-xs text-muted-foreground truncate">{conversation.subject}</div>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === user.id}
              senderName={nameById.get(m.sender_id)}
            />
          ))
        )}
      </div>

      <MessageComposer conversationId={conversation.id} onSent={() => { refresh(); onMessageSent?.(); }} />
    </div>
  );
}
