import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  MessageCircle,
  Inbox as InboxIcon,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThreadList, ThreadListSkeleton } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { toast } from 'sonner';
import { StudentEmptyState } from '@/components/inbox/StudentEmptyState';
import { initialsFromName, needsReply, otherParticipantName } from '@/components/inbox/inboxDisplay';
import { AdminInboxCommandCenter } from '@/components/inbox/AdminInboxCommandCenter';

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
    filtered = filtered.filter((c) => needsReply(c, ownId));
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
  const { conversations, loading, error: inboxError, unreadCount, refresh } = useInbox();

  const activeId = conversationId || null;
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const headerName = useMemo(() => {
    if (!is_admin) return 'Joshua';
    if (!active || !user) return 'Inbox';
    return otherParticipantName(active, user.id, active.subject || 'Inbox');
  }, [is_admin, active, user]);

  const headerInitial = useMemo(() => {
    if (!is_admin) return 'J';
    if (headerName === 'Inbox') return null;
    return initialsFromName(headerName);
  }, [is_admin, headerName]);

  const routeState = location.state as { composeTarget?: string | null } | null;
  const composeTarget = routeState?.composeTarget || null;
  const clearComposeTarget = () => navigate(location.pathname, { replace: true, state: {} });

  useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [authReady, user, navigate]);

  const [filter, setFilter] = useState<AdminFilter>('all');
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState(false);
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not start conversation');
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

  if (is_admin) {
    return (
      <AdminInboxCommandCenter
        activeId={activeId}
        onSelectThread={(id) => navigate(`/inbox/${id}${location.search}`)}
        onClearThread={() => navigate(`/inbox${location.search}`)}
        composeTarget={composeTarget}
        onComposeTargetHandled={clearComposeTarget}
      />
    );
  }

  return (
    <div
      className={cn(
        'h-screen overflow-hidden flex flex-col',
        is_admin
          ? 'bg-[#111722] text-[#f8eed8]'
          : 'bg-[linear-gradient(180deg,#fffaf2_0%,#f8efe1_48%,#fffdf8_100%)] text-[#211b16]',
      )}
    >
      <header
        className={cn(
          'sticky top-0 z-20 shrink-0',
          is_admin
            ? 'border-b border-white/10 bg-[#111722]/95 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur'
            : 'border-b border-[#eadfcf] bg-[#fffaf2]/90 backdrop-blur',
        )}
      >
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/classroom')}
              aria-label="Back to Main Hub"
              className={cn(
                'rounded-xl',
                is_admin ? 'text-[#c9d0dc] hover:bg-white/10 hover:text-white' : 'text-[#6d6254] hover:bg-[#efe4d3]',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-9 w-9 rounded-2xl flex items-center justify-center border text-[10px] font-black tracking-tight transition-all',
                  is_admin
                    ? 'bg-[#f0d28e] text-[#161b25] border-[#f0d28e]/40 shadow-[0_12px_30px_rgba(0,0,0,0.22)]'
                    : 'bg-[#203024] text-[#f8eed8] border-[#203024]/20',
                )}
                aria-hidden="true"
              >
                {headerInitial || (is_admin ? <InboxIcon className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />)}
              </div>
              <div className="min-w-0">
                <h1 className={cn('text-sm font-black leading-tight tracking-tight', is_admin ? 'text-[#fff6e5]' : 'text-[#211b16]')}>
                  {is_admin ? 'Messages Command Center' : headerName}
                </h1>
                <p className={cn('hidden text-[11px] font-semibold sm:block', is_admin ? 'text-[#aab4c3]' : 'text-[#7a6b58]')}>
                  {is_admin ? headerName : 'A direct line to Joshua'}
                </p>
              </div>
              {is_admin && unreadCount > 0 && (
                <span className="ml-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#a14f43] px-1.5 text-[10px] font-black text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" />
        </div>
      </header>

      {/* TODO: migrate to has_admin_inbox_access flag per CLAUDE.md "granular flags not roles."
          Tracking ticket TBD. Until then, is_admin matches the existing admin-inbox gate. */}
      {showEmptyStudent ? (
        <div className="mx-auto min-h-0 w-full max-w-7xl flex-1">
          <StudentEmptyState onStart={handleStartJoshua} isStarting={starting} />
        </div>
      ) : (
        <div className={cn(
          'mx-auto md:grid flex-1 min-h-0 w-full',
          is_admin
            ? 'max-w-[1680px] md:grid-cols-[370px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_360px]'
            : 'max-w-6xl md:grid-cols-[300px_1fr] px-3 py-4 md:px-6',
        )}>
          <aside
            className={cn(
              'h-full md:flex md:flex-col overflow-hidden',
              is_admin
                ? 'border-r border-white/10 bg-[#141a24] text-[#edf2f7]'
                : 'rounded-3xl border border-[#eadfcf] bg-white/70 shadow-[0_24px_70px_rgba(63,45,24,0.10)] backdrop-blur-sm',
              active ? 'hidden md:flex' : 'flex flex-col',
            )}
          >
            {!is_admin && (
              <div className="border-b border-[#eadfcf] bg-[#fffaf2]/80 px-4 py-4 shrink-0">
                <div className="text-[11px] font-black uppercase text-[#8b5b42] tracking-[0.16em]">
                  Coaching
                </div>
                <div className="mt-1 text-sm font-bold text-[#211b16]">
                  One thread with Joshua
                </div>
              </div>
            )}
            {is_admin && (
              <div className="space-y-3 border-b border-white/10 bg-[#141a24] px-4 py-4 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#aab4c3] pointer-events-none" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students or messages"
                    className="h-10 rounded-2xl border-white/10 bg-white/[0.07] pl-9 text-sm font-semibold text-white placeholder:text-[#aab4c3] focus:bg-white/[0.10]"
                  />
                </div>
                <div
                  role="tablist"
                  aria-label="Filter conversations"
                  className="inline-flex w-full items-center gap-1 rounded-2xl bg-white/[0.06] p-1"
                >
                  {FILTER_TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={filter === t.id}
                      onClick={() => setFilter(t.id)}
                      className={cn(
                        'flex-1 px-2 py-1.5 text-[11px] font-black rounded-xl transition-all whitespace-nowrap',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        filter === t.id
                          ? 'bg-[#f0d28e] text-[#161b25] shadow-sm'
                          : 'text-[#aab4c3] hover:bg-white/10 hover:text-white',
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
              ) : inboxError ? (
                <div className="p-4 m-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive flex items-center justify-between gap-3">
                  <span>{inboxError}. Your messages may be out of date.</span>
                  <Button size="sm" variant="outline" onClick={() => refresh()}>
                    Retry
                  </Button>
                </div>
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

          <main
            className={cn(
              'h-full min-h-0 flex flex-col',
              !is_admin && 'overflow-hidden rounded-3xl border border-[#eadfcf] bg-[#fffdf8] shadow-[0_24px_70px_rgba(63,45,24,0.10)]',
              active ? 'flex' : 'hidden md:flex',
            )}
          >
            {active ? (
              <ConversationView
                conversation={active}
                onBack={clearThread}
                onMessageSent={refresh}
              />
            ) : (
              <div className={cn('flex-1 flex items-center justify-center text-sm font-semibold', is_admin ? 'bg-[#f7f3ea] text-[#8b7c68]' : 'bg-[#fffdf8] text-[#8b7c68]')}>
                {is_admin ? 'Pick a thread to open' : 'Loading conversation'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
