import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Inbox as InboxIcon,
  Mail,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThreadList, ThreadListSkeleton } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { toast } from 'sonner';
import { StudentEmptyState } from '@/components/inbox/StudentEmptyState';
import { GmailPane } from '@/features/admin-inbox/gmail/components/GmailPane';
import { DrivePanel } from '@/components/inbox/DrivePanel';

type AdminFilter = 'all' | 'unread' | 'needs_reply' | 'attachments';

interface FilterTab {
  id: AdminFilter;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'needs_reply', label: 'Needs reply' },
  { id: 'attachments', label: 'Attachments' },
];

const FILTER_EMPTY_LABEL: Record<AdminFilter, string> = {
  all: 'No threads yet.',
  unread: 'No unread threads.',
  needs_reply: 'No threads need reply.',
  attachments: 'No threads with attachments.',
};

function applyAdminFilters(
  conversations: Conversation[],
  ownId: string,
  filter: AdminFilter,
  query: string,
) {
  let filtered = [...conversations];

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter((c) => {
      const other = c.participants.find((p) => p.user_id !== ownId);
      const nameMatch = other?.display_name?.toLowerCase().includes(q);
      const subjectMatch = c.subject?.toLowerCase().includes(q);
      const bodyMatch = c.last_message?.body?.toLowerCase().includes(q);
      return nameMatch || subjectMatch || bodyMatch;
    });
  }

  if (filter === 'unread') {
    filtered = filtered.filter((c) => c.unread);
  } else if (filter === 'needs_reply') {
    filtered = filtered.filter((c) => c.reply_required);
  } else if (filter === 'attachments') {
    filtered = filtered.filter((c) => c.hasAttachments);
  }

  return filtered.sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );
}

/**
 * Student auto-select: prioritize the thread where an admin is present (the Joshua thread).
 */
function pickStudentPrimary(conversations: Conversation[], ownId: string) {
  if (conversations.length === 0) return null;
  const withAdmin = conversations.find((c) =>
    c.participants.some((p) => p.user_id !== ownId && p.is_admin),
  );
  return withAdmin || conversations[0];
}

export default function Inbox() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading, unreadCount, refresh } = useInbox();

  const activeId = conversationId || null;
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const headerName = useMemo(() => {
    if (!is_admin) return 'Joshua';
    if (!active) return 'Inbox';
    const other = active.participants.find((p) => p.user_id !== user?.id);
    return other?.display_name || 'Inbox';
  }, [is_admin, active, user]);

  const headerInitial = useMemo(() => {
    if (!is_admin) return 'J';
    const name = headerName;
    if (name === 'Inbox') return null;
    return name
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [is_admin, headerName]);

  const composeTarget = (location.state as any)?.composeTarget || null;
  const clearComposeTarget = () => navigate(location.pathname, { replace: true, state: {} });

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

  const showEmptyStudent = !is_admin && !active && !loading && conversations.length === 0;

  const adminEmptyLabel =
    query.trim().length > 0
      ? 'No threads match your search.'
      : FILTER_EMPTY_LABEL[filter];

  return (
    <div className={cn('h-screen overflow-hidden flex flex-col bg-[#FDFDFC]', !is_admin && 'bg-[#FDFDFC]')}>
      <header className="border-b border-border bg-white sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-10 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mainhub')} aria-label="Back to Main Hub">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center border text-[10px] font-bold tracking-tight transition-all',
                  is_admin
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-primary/10 text-primary border-primary/20',
                )}
                aria-hidden="true"
              >
                {headerInitial || (is_admin ? <InboxIcon className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />)}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight tracking-tight">
                  {headerName}
                </h1>
                {!is_admin && (
                  <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                    Direct coaching thread
                  </p>
                )}
              </div>
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
        <div className="max-w-7xl mx-auto flex-1 min-h-0">
          <GmailPane />
        </div>
      ) : is_admin && source === 'drive' ? (
        <div className="max-w-7xl mx-auto flex-1 min-h-0">
          <DrivePanel />
        </div>
      ) : showEmptyStudent ? (
        <div className="max-w-7xl mx-auto flex-1 min-h-0">
          <StudentEmptyState onStart={handleStartJoshua} isStarting={starting} />
        </div>
      ) : (
        <div className={cn(
          'max-w-7xl mx-auto md:grid flex-1 min-h-0 w-full',
          is_admin ? 'md:grid-cols-[360px_1fr]' : 'md:grid-cols-[320px_1fr]',
        )}>
          <aside
            className={cn(
              'border-r border-border h-full md:flex md:flex-col bg-white/50 backdrop-blur-sm overflow-hidden',
              active ? 'hidden md:flex' : 'flex flex-col',
            )}
          >
            {!is_admin && (
              <div className="px-4 py-4 border-b border-border bg-white/80 shrink-0">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Coaching
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  One thread with Joshua
                </div>
              </div>
            )}
            {is_admin && (
              <div className="px-4 py-4 border-b border-border space-y-3 shrink-0 bg-white/40">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students or messages"
                    className="pl-9 h-9 text-sm bg-white/80 border-border/50 focus:bg-white transition-colors"
                  />
                </div>
                <div
                  role="tablist"
                  aria-label="Filter conversations"
                  className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/40 w-full"
                >
                  {FILTER_TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={filter === t.id}
                      onClick={() => setFilter(t.id)}
                      className={cn(
                        'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        filter === t.id
                          ? 'bg-white text-foreground shadow-sm ring-1 ring-black/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/50',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
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

          <main className={cn('h-full flex flex-col min-h-0', active ? 'flex' : 'hidden md:flex')}>
            {active ? (
              <ConversationView
                conversation={active}
                onBack={clearThread}
                onMessageSent={refresh}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-[#FDFDFC]">
                {is_admin ? 'Pick a thread to open' : 'Loading conversation'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
