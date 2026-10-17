import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  HardDrive,
  Inbox as InboxIcon,
  Mail,
  Plus,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { GmailPane } from '@/features/admin-inbox/gmail/components/GmailPane';
import { DrivePanel } from '@/components/inbox/DrivePanel';
import { ThreadList, ThreadListSkeleton } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { initialsFromName, needsReply, otherParticipantName } from './inboxDisplay';

type AdminFilter = 'all' | 'unread' | 'needs_reply' | 'attachments';
type InboxSource = 'app' | 'gmail' | 'drive';

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

function sourceFromSearch(search: string, fallback: InboxSource = 'app'): InboxSource {
  const pane = new URLSearchParams(search).get('pane');
  return pane === 'gmail' || pane === 'drive' || pane === 'app' ? pane : fallback;
}

export function AdminInboxCommandCenter({
  embedded = false,
  defaultSource = 'app',
  activeId: activeIdProp,
  onSelectThread,
  onClearThread,
  composeTarget,
  onComposeTargetHandled,
}: {
  embedded?: boolean;
  defaultSource?: InboxSource;
  activeId?: string | null;
  onSelectThread?: (id: string) => void;
  onClearThread?: () => void;
  composeTarget?: string | null;
  onComposeTargetHandled?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { conversations, loading, unreadCount, refresh } = useInbox();
  const [filter, setFilter] = useState<AdminFilter>('all');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<InboxSource>(() =>
    sourceFromSearch(location.search, defaultSource),
  );
  // Embedded in the Teacher Desk, this surface is the Messages workspace only.
  // Gmail and Drive are their own top-level desk workspaces, so the source
  // toggle and the Gmail/Drive branches are suppressed and source is forced to
  // the app threads. Standalone (/inbox) keeps the full 3-way toggle.
  const effectiveSource: InboxSource = embedded ? 'app' : source;
  const [embeddedActiveId, setEmbeddedActiveId] = useState<string | null>(null);

  const activeId = activeIdProp ?? (embedded ? embeddedActiveId : searchParams.get('c'));
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const headerName = useMemo(() => {
    if (!active || !user) return 'Inbox';
    return otherParticipantName(active, user.id, active.subject || 'Inbox');
  }, [active, user]);

  const headerInitial = useMemo(() => {
    if (headerName === 'Inbox') return null;
    return initialsFromName(headerName);
  }, [headerName]);

  useEffect(() => {
    setSource(sourceFromSearch(location.search, defaultSource));
  }, [defaultSource, embedded, location.search]);

  const visibleConversations = useMemo(() => {
    if (!user) return conversations;
    return applyAdminFilters(conversations, user.id, filter, query);
  }, [conversations, user, filter, query]);

  useEffect(() => {
    if (embedded) return;
    if (activeId || loading || !user || visibleConversations.length === 0) return;
    if (window.innerWidth >= 768) {
      onSelectThread?.(visibleConversations[0].id);
    }
  }, [activeId, embedded, loading, onSelectThread, user, visibleConversations]);

  const updatePane = useCallback(
    (nextSource: InboxSource) => {
      setSource(nextSource);
      if (embedded) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextSource === 'app') {
          next.delete('pane');
          next.delete('t');
        } else {
          next.set('pane', nextSource);
          if (nextSource === 'drive') next.delete('t');
        }
        return next;
      });
    },
    [embedded, setSearchParams],
  );

  const selectThread = useCallback(
    (id: string) => {
      if (onSelectThread) {
        onSelectThread(id);
        return;
      }
      if (embedded) {
        setEmbeddedActiveId(id);
        setSource('app');
        return;
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('pane');
        next.set('c', id);
        return next;
      });
    },
    [embedded, onSelectThread, setSearchParams],
  );

  const clearThread = useCallback(() => {
    if (onClearThread) {
      onClearThread();
      return;
    }
    if (embedded) {
      setEmbeddedActiveId(null);
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('c');
      return next;
    });
  }, [embedded, onClearThread, setSearchParams]);

  const adminEmptyLabel =
    query.trim().length > 0
      ? 'No threads match your search.'
      : FILTER_EMPTY_LABEL[filter];

  const shellClassName = embedded
    ? 'flex h-full w-full min-w-0 flex-col overflow-hidden border border-black/12 bg-[#111722] text-[#f8eed8] shadow-[0_20px_80px_rgba(17,24,28,0.16)]'
    : 'h-screen overflow-hidden flex flex-col bg-[#111722] text-[#f8eed8]';

  const maxWidthClassName = embedded ? 'w-full' : 'mx-auto w-full max-w-[1680px]';

  return (
    <div className={shellClassName} aria-label="Messages Command Center workspace">
      <header className="shrink-0 border-b border-white/10 bg-[#111722]/95 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur">
        <div className={cn('flex items-center justify-between gap-3 px-4 py-3', !embedded && 'sm:px-6 lg:px-8', maxWidthClassName)}>
          <div className="flex min-w-0 items-center gap-3">
            {!embedded ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/classroom')}
                aria-label="Back to the classroom"
                className="rounded-xl text-[#c9d0dc] hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#f0d28e]/40 bg-[#f0d28e] text-[10px] font-black tracking-tight text-[#161b25] shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
              {headerInitial || <InboxIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black leading-tight tracking-tight text-[#fff6e5]">
                {embedded ? 'Messages' : 'Messages Command Center'}
              </h1>
              <p className="hidden truncate text-[11px] font-semibold text-[#aab4c3] sm:block">
                {headerName}
              </p>
            </div>
            {unreadCount > 0 ? (
              <span className="ml-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#a14f43] px-1.5 text-[10px] font-black text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!embedded ? (
              <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
                <button
                  type="button"
                  onClick={() => updatePane('app')}
                  className={cn(
                    'rounded-xl px-2.5 py-1.5 text-[11px] font-black transition-colors',
                    source === 'app' ? 'bg-[#f0d28e] text-[#161b25] shadow-sm' : 'text-[#c9d0dc] hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5"><InboxIcon className="h-3 w-3" /> Messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => updatePane('gmail')}
                  className={cn(
                    'rounded-xl px-2.5 py-1.5 text-[11px] font-black transition-colors',
                    source === 'gmail' ? 'bg-[#f0d28e] text-[#161b25] shadow-sm' : 'text-[#c9d0dc] hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> Gmail</span>
                </button>
                <button
                  type="button"
                  onClick={() => updatePane('drive')}
                  className={cn(
                    'rounded-xl px-2.5 py-1.5 text-[11px] font-black transition-colors',
                    source === 'drive' ? 'bg-[#f0d28e] text-[#161b25] shadow-sm' : 'text-[#c9d0dc] hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5"><HardDrive className="h-3 w-3" /> Drive</span>
                </button>
              </div>
            ) : null}
            <NewConversationDialog
              showTrigger={effectiveSource === 'app'}
              autoOpenWith={composeTarget}
              onAutoOpenHandled={onComposeTargetHandled}
              onCreated={selectThread}
              triggerLabel={active ? 'New' : 'New command'}
              triggerIcon={active ? <ChevronDown className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              triggerClassName="rounded-2xl bg-[#a14f43] px-3 font-black text-white hover:bg-[#8d453a]"
            />
          </div>
        </div>
      </header>

      {effectiveSource === 'gmail' ? (
        <div className={cn('min-h-0 flex-1 overflow-hidden bg-white text-foreground', maxWidthClassName)}>
          <GmailPane />
        </div>
      ) : effectiveSource === 'drive' ? (
        <div className={cn('min-h-0 flex-1 overflow-hidden bg-white text-foreground', maxWidthClassName)}>
          <DrivePanel />
        </div>
      ) : (
        <div
          className={cn(
            'min-h-0 flex-1 md:grid',
            embedded
              ? 'grid-cols-[minmax(230px,320px)_minmax(0,1fr)]'
              : 'max-w-[1680px] md:grid-cols-[370px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]',
            !embedded && 'mx-auto w-full',
          )}
        >
          <aside className={cn(
            'h-full overflow-hidden border-r border-white/10 bg-[#141a24] text-[#edf2f7] md:flex md:flex-col',
            active ? 'hidden md:flex' : 'flex flex-col',
          )}>
            <div className="shrink-0 space-y-3 border-b border-white/10 bg-[#141a24] px-4 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#aab4c3]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students or messages"
                  className="h-10 rounded-2xl border-white/10 bg-white/[0.07] pl-9 text-sm font-semibold text-white placeholder:text-[#aab4c3] focus:bg-white/[0.10]"
                />
              </div>
              <div role="tablist" aria-label="Filter conversations" className="inline-flex w-full items-center gap-1 rounded-2xl bg-white/[0.06] p-1">
                {FILTER_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === t.id}
                    onClick={() => setFilter(t.id)}
                    className={cn(
                      'flex-1 whitespace-nowrap rounded-xl px-2 py-1.5 text-[11px] font-black transition-all',
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <ThreadListSkeleton count={6} />
              ) : (
                <ThreadList
                  conversations={visibleConversations}
                  activeId={activeId}
                  onSelect={selectThread}
                  variant="admin"
                  emptyLabel={adminEmptyLabel}
                />
              )}
            </div>
          </aside>

          <main className={cn('flex h-full min-h-0 flex-col', active ? 'flex' : 'hidden md:flex')}>
            {active ? (
              <ConversationView conversation={active} onBack={clearThread} onMessageSent={refresh} />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[#f7f3ea] text-sm font-semibold text-[#8b7c68]">
                Pick a thread to open
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
