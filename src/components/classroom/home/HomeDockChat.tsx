import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { MessageCircle, X } from "lucide-react";
import { useInbox } from "@/hooks/useInbox";
import { ConversationView } from "@/components/inbox/ConversationView";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { startJoshuaConversation } from "@/lib/joshuaThread";

function TeacherConversation({ actorId }: { actorId: string }) {
  const { conversations, loading, error, refresh } = useInbox();
  const [startedId, setStartedId] = useState<string | null>(null);
  const thread = conversations.find(({ id, participants }) =>
    id === startedId || participants.some((person) => person.user_id !== actorId && person.is_admin),
  );

  if (thread) {
    return <ConversationView conversation={thread} compact hideHeader studentFacing onMessageSent={refresh} />;
  }
  if (error) {
    return <div className="home-chat-status" role="alert">
      <p>{error}</p>
      <button type="button" onClick={() => void refresh()}>Try again</button>
    </div>;
  }
  if (loading) return <p className="home-chat-status" role="status">Loading conversation…</p>;
  return (
    <div className="home-chat-empty">
      <p className="home-chat-status">Send Joshua a message to start the conversation.</p>
      <MessageComposer
        conversationId={startedId}
        onResolveConversation={startJoshuaConversation}
        onConversationResolved={setStartedId}
        onSent={refresh}
        studentFacing
      />
    </div>
  );
}

export function HomeDockChat({ actorId, unread, onOpen, preview }: {
  actorId?: string | null;
  unread: number;
  onOpen: (route: string) => void;
  preview?: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger title="Messages" aria-label={`Messages, ${unread} unread`}>
        <MessageCircle size={18} aria-hidden="true" />
        <span>Messages</span>
      </Popover.Trigger>
      <Popover.Content align="end" side="top" sideOffset={12} collisionPadding={12}
        className="home-dock-chat" aria-label="Chat with Joshua">
        <header className="home-chat-header">
          <span className="home-chat-avatar" aria-hidden="true">J</span>
          <h2>Joshua</h2>
          <Popover.Close asChild>
            <button type="button" className="home-chat-inbox" onClick={() => onOpen("/inbox")}>Open inbox</button>
          </Popover.Close>
          <Popover.Close aria-label="Close chat"><X size={17} aria-hidden="true" /></Popover.Close>
        </header>
        <div className="home-chat-body">
          {preview ?? (actorId
            ? <TeacherConversation actorId={actorId} />
            : <p className="home-chat-status">Sign in to message Joshua.</p>)}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
