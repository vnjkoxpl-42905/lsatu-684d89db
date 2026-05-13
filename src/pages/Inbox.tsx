import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ThreadList, ThreadListSkeleton } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { StudentEmptyState } from '@/components/inbox/StudentEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, HardDrive, Inbox as InboxIcon, Mail, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatParticipantName } from '@/lib/displayName';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { toast } from 'sonner';
import { GmailPane } from '@/features/admin-inbox/gmail';
import { DrivePanel } from '@/components/inbox/DrivePanel';

type AdminFilter = 'all' | 'unread' | 'needs_reply' | 'attachments';

const FILTER_TABS: { id: AdminFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'needs_reply', label: 'Needs reply' },
  { id: 'attachments', label: 'Attachments' },
];

const FILTER_EMPTY_LABEL: Record<AdminFilter, string> = {
  all: 'No conversations yet.',
  unread: 'No unread messages.',
  needs_reply: 'Nothing needs a reply.',
  attachments: 'No conversations with attachments.',
};

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
  return filtered.sort((a, b) => {
    const aPriority = (a.unread ? 1 : 0) + (a.last_message && a.last_message.sender_id !== ownId ? 1 : 0);
    const bPriority = (b.unread ? 1 : 0) + (b.last_message && b.last_message.sender_id !== ownId ? 1 : 0);
    if (aPriority !== bPriority) return bPriority - aPriority;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
}

function pickStudentPrimary(conversations: Conversation[], ownId: string): Conversation | null {
  if (conversations.length === 0) return null;
  // Prefer the thread that includes an admin participant; fall back to most recent.
  const withAdmin = conversations.find((c) =>
    c.participants.some((p) => p.user_id !== ownId && p.is_admin),
  );
  if (withAdmin) return withAdmin;
  return [...conversations].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  )[0];
}

export default function Inbox() {
  const { user, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const { conversations, loading, refresh, unreadCount } = useInbox();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const activeId = conversationId ?? null;

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
  const [starting, setStarting] = useState(false);
  const [source, setSource] = useState<'app' | 'gmail' | 'drive'>('app');

  const visibleConversations = useMemo(() => {
    if (!user) return conversations;
    if (is_admin) return applyAdminFilters(conversations, user.id, filter, query);
    return [...conversations].sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
  }, [conversations, user, is_admin, filter, query]);

  // Auto-select: students always; admins on desktop only.
  useEffect(() => {
    if (activeId) return;
    if (loading || permsLoading) return;
    if (!user) return;
    if (!is_admin) {
      const primary = pickStudentPrimary(conversations, user.id);
      if (primary) navigate(`/inbox/${primary.id}`, { replace: true });
      return;
    }
    if (visibleConversations.length === 0) return;
    if (window.innerWidth >= 768) {
      navigate(`/inbox/${visibleConversations[0].id}`, { replace: true });
    }
  }, [conversations, visibleConversations, activeId, navigate, is_admin, loading, permsLoading, user]);

  const handleStartJoshua = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await startJoshuaConversation();
      await refresh();
      navigate(`/inbox/${id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start conversation');
    } finally {
      setStarting(false);
    }
  }, [starting, refresh, navigate]);

  const selectThread = (id: string) => navigate(`/inbox/${id}`);
  const clearThread = () => navigate('/inbox');

  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!authReady || permsLoading) return null;

  const showEmptyStudent = !is_admin && !loading && conversations.length === 0;

  const adminEmptyLabel =
    query.trim().length > 0
      ? 'No threads match your search.'
      : FILTER_EMPTY_LABEL[filter];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mainhub')} aria-label="Back to Main Hub">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <InboxIcon className="w-4 h-4 text-muted-foreground" />
              <h1 className="text-base font-semibold">
                {is_admin ? 'Inbox' : 'Joshua'}
              </h1>
              {is_admin && unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {is_admin && (
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60">
                <button
                  onClick={() => setSource('app')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                    source === 'app' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="inline-flex items-center gap-1"><InboxIcon className="w-3 h-3" /> Messages</span>
                </button>
                <button
                  onClick={() => setSource('gmail')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                    source === 'gmail' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Gmail</span>
                </button>
                <button
                  onClick={() => setSource('drive')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                    source === 'drive' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="inline-flex items-center gap-1"><HardDrive className="w-3 h-3" /> Drive</span>
                </button>
              </div>
            )}
            <NewConversationDialog
              showTrigger={is_admin && source === 'app'}
              autoOpenWith={composeTarget}
              onAutoOpenHandled={clearComposeTarget}
              onCreated={(id) => navigate(`/inbox/${id}`)}
            />
          </div>
        </div>
      </header>

      {/* TODO: migrate to has_admin_inbox_access flag per CLAUDE.md "granular flags not roles."
          Tracking ticket TBD. Until then, is_admin matches the existing admin-inbox gate. */}
      {is_admin && source === 'gmail' ? (
        <div className="max-w-7xl mx-auto h-[calc(100vh-57px)]">
          <GmailPane />
        </div>
      ) : is_admin && source === 'drive' ? (
        <div className="max-w-7xl mx-auto h-[calc(100vh-57px)]">
          <DrivePanel />
        </div>
      ) : showEmptyStudent ? (
        <div className="max-w-7xl mx-auto">
          <StudentEmptyState onStart={handleStartJoshua} isStarting={starting} />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto md:grid md:grid-cols-[360px_1fr] md:h-[calc(100vh-57px)]">
          <aside
            className={cn(
              'border-r border-border md:overflow-y-auto md:flex md:flex-col',
              active ? 'hidden md:flex' : 'block',
            )}
          >
            {is_admin && (
              <div className="px-3 py-3 border-b border-border space-y-2.5 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students or messages"
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <div
                  role="tablist"
                  aria-label="Filter conversations"
                  className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 w-full"
                >
                  {FILTER_TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={filter === t.id}
                      onClick={() => setFilter(t.id)}
                      className={cn(
                        'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all whitespace-nowrap',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        filter === t.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
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
                <ThreadListSkeleton count={6} />
              ) : (
                <ThreadList
                  conversations={visibleConversations}
                  activeId={activeId}
                  onSelect={selectThread}
                  variant={is_admin ? 'admin' : 'student'}
                  emptyLabel={is_admin ? adminEmptyLabel : 'No conversations yet.'}
                />
              )}
            </div>
          </aside>

          <main className={cn('md:h-full flex-col h-[calc(100vh-57px)]', active ? 'flex' : 'hidden md:flex')}>
            {active ? (
              <ConversationView
                conversation={active}
                onBack={clearThread}
                onMessageSent={refresh}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                {is_admin ? 'Pick a thread to open' : 'Loading conversation…'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
