import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { StudentEmptyState } from '@/components/inbox/StudentEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Inbox as InboxIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatParticipantName } from '@/lib/displayName';

type AdminFilter = 'all' | 'unread' | 'needs_reply' | 'attachments';

const FILTER_TABS: { id: AdminFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'needs_reply', label: 'Needs reply' },
  { id: 'attachments', label: 'Attachments' },
];

function searchableName(c: Conversation, ownId: string) {
  return c.participants
    .filter((p) => p.user_id !== ownId)
    .map((p) => formatParticipantName(p.display_name, p.is_admin))
    .join(' ');
}

function applyAdminFilters(
  conversations: Conversation[],
  ownId: string,
  filter: AdminFilter,
  query: string,
) {
  const q = query.trim().toLowerCase();
  const filtered = conversations.filter((c) => {
    if (filter === 'unread' && !c.unread) return false;
    if (filter === 'needs_reply') {
      if (!(c.last_message && c.last_message.sender_id !== ownId)) return false;
    }
    if (filter === 'attachments' && !c.hasAttachments) return false;
    if (q) {
      const name = searchableName(c, ownId).toLowerCase();
      const preview = (c.last_message?.body ?? c.subject ?? '').toLowerCase();
      if (!name.includes(q) && !preview.includes(q)) return false;
    }
    return true;
  });
  // Sort: unread/needs-reply first, then by last_message_at desc
  return filtered.sort((a, b) => {
    const aPriority = (a.unread ? 1 : 0) + (a.last_message && a.last_message.sender_id !== ownId ? 1 : 0);
    const bPriority = (b.unread ? 1 : 0) + (b.last_message && b.last_message.sender_id !== ownId ? 1 : 0);
    if (aPriority !== bPriority) return bPriority - aPriority;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
}

export default function Inbox() {
  const { user, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const { conversations, loading, refresh, unreadCount } = useInbox();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const activeId = conversationId ?? null;

  // Cross-surface entry points (e.g., Foyer "Ask Joshua") land here with
  // { composeWith: <userId> } to pre-open the composer. Capture at mount so
  // reloads / back-nav don't replay it.
  const [composeTarget, setComposeTarget] = useState<string | null>(
    () => (location.state as { composeWith?: string } | null)?.composeWith ?? null,
  );
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const clearComposeTarget = useCallback(() => setComposeTarget(null), []);

  useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [authReady, user, navigate]);

  const [filter, setFilter] = useState<AdminFilter>('all');
  const [query, setQuery] = useState('');

  const visibleConversations = useMemo(() => {
    if (!user) return conversations;
    if (is_admin) return applyAdminFilters(conversations, user.id, filter, query);
    // Student: simple recency sort
    return [...conversations].sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
  }, [conversations, user, is_admin, filter, query]);

  // Auto-select on desktop (admin) or always for students
  useEffect(() => {
    if (activeId) return;
    if (loading || permsLoading) return;
    if (visibleConversations.length === 0) return;
    if (!is_admin) {
      navigate(`/inbox/${visibleConversations[0].id}`, { replace: true });
      return;
    }
    if (window.innerWidth >= 768) {
      navigate(`/inbox/${visibleConversations[0].id}`, { replace: true });
    }
  }, [visibleConversations, activeId, navigate, is_admin, loading, permsLoading]);

  const selectThread = (id: string) => navigate(`/inbox/${id}`);
  const clearThread = () => navigate('/inbox');

  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!authReady || permsLoading) return null;

  const showEmptyStudent = !is_admin && !loading && conversations.length === 0;

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
              <h1 className="text-base font-semibold">
                {is_admin ? 'Inbox' : 'Ask Joshua'}
              </h1>
              {is_admin && unreadCount > 0 && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <NewConversationDialog
            showTrigger={is_admin}
            autoOpenWith={composeTarget}
            onAutoOpenHandled={clearComposeTarget}
            onCreated={(id) => navigate(`/inbox/${id}`)}
          />
        </div>
      </header>

      {showEmptyStudent ? (
        <div className="max-w-7xl mx-auto">
          <StudentEmptyState />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto md:grid md:grid-cols-[360px_1fr] md:h-[calc(100vh-57px)]">
          {/* Thread list */}
          <aside
            className={cn(
              'border-r border-border md:overflow-y-auto md:flex md:flex-col',
              active ? 'hidden md:flex' : 'block',
            )}
          >
            {is_admin && (
              <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students or messages"
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {FILTER_TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilter(t.id)}
                      className={cn(
                        'px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                        filter === t.id
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 md:overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                <ThreadList
                  conversations={visibleConversations}
                  activeId={activeId}
                  onSelect={selectThread}
                  variant={is_admin ? 'admin' : 'student'}
                  emptyLabel={
                    is_admin
                      ? query || filter !== 'all'
                        ? 'No threads match this filter.'
                        : 'No conversations yet. Start one with a student.'
                      : 'No conversations yet.'
                  }
                />
              )}
            </div>
          </aside>

          {/* Conversation view */}
          <main className={cn('md:h-full flex-col h-[calc(100vh-57px)]', active ? 'flex' : 'hidden md:flex')}>
            {active ? (
              <ConversationView
                conversation={active}
                onBack={clearThread}
                onMessageSent={refresh}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                {is_admin ? 'Select a conversation to start' : 'Loading conversation…'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
