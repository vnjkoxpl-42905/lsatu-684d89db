import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Inbox as InboxIcon } from 'lucide-react';

export default function Inbox() {
  const { user, authReady } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { conversations, loading, refresh } = useInbox();
  const { is_admin } = useUserPermissions();
  const [activeId, setActiveId] = useState<string | null>(conversationId ?? null);

  useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [authReady, user, navigate]);

  useEffect(() => {
    setActiveId(conversationId ?? null);
  }, [conversationId]);

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (!activeId && conversations.length > 0 && window.innerWidth >= 768) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/foyer')} aria-label="Back to foyer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <InboxIcon className="w-4 h-4 text-muted-foreground" />
              <h1 className="text-base font-semibold">Inbox</h1>
            </div>
          </div>
          {is_admin && <NewConversationDialog onCreated={(id) => setActiveId(id)} />}
        </div>
      </header>

      <div className="max-w-7xl mx-auto md:grid md:grid-cols-[360px_1fr] md:h-[calc(100vh-57px)]">
        {/* Thread list */}
        <aside
          className={`border-r border-border md:overflow-y-auto ${active ? 'hidden md:block' : 'block'}`}
        >
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ThreadList
              conversations={conversations}
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
            />
          )}
        </aside>

        {/* Conversation view */}
        <main className={`md:h-full ${active ? 'block' : 'hidden md:flex'} flex-col h-[calc(100vh-57px)]`}>
          {active ? (
            <ConversationView
              conversation={active}
              onBack={() => setActiveId(null)}
              onMessageSent={refresh}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
