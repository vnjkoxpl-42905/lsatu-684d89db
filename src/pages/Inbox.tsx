import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThreadList, ThreadListSkeleton } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { toast } from 'sonner';
import { StudentEmptyState } from '@/components/inbox/StudentEmptyState';
import { needsReply } from '@/components/inbox/inboxDisplay';

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
 * Messages is entered and left from the rail constantly, so landing on the
 * thread list every time means re-picking the same conversation every time.
 * The last thread opened is remembered across visits and reloads.
 *
 * Storage is best-effort: a browser with storage disabled loses the memory,
 * not the page. Reading back also has to survive a thread that has since been
 * deleted or filtered out of view, so the id is only ever used after it is
 * matched against the conversations actually loaded.
 */
const LAST_THREAD_KEY = 'lsatu:inbox:last-thread';

function readLastThread(): string | null {
  try {
    return localStorage.getItem(LAST_THREAD_KEY);
  } catch {
    return null;
  }
}

function writeLastThread(id: string) {
  try {
    localStorage.setItem(LAST_THREAD_KEY, id);
  } catch {
    /* no-op: remembering the thread is a convenience, never a requirement */
  }
}

function forgetLastThread() {
  try {
    localStorage.removeItem(LAST_THREAD_KEY);
  } catch {
    /* no-op */
  }
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

/**
 * Messages, as a workspace-rail stage page.
 *
 * ClassroomLayout already supplies the rail, the route title, and a sized scrolling
 * stage, so this page renders no page chrome of its own — no full-height root,
 * no sticky header, no back-arrow to /classroom. It is a list/detail pair driven
 * by the route: /inbox lists the threads, /inbox/:conversationId hands the whole
 * stage to one conversation. There is deliberately no second thread rail; the
 * workspace rail is the only rail on screen.
 *
 * The multi-source console (Gmail + Drive alongside app threads) still lives in
 * the Teacher Workspace as <AdminInboxCommandCenter embedded />.
 */
export default function Inbox() {
  // The route is /inbox/* rather than a :conversationId sibling, so the id
  // comes off the splat. See the routing comment in App.tsx.
  const params = useParams();
  const conversationId = (params['*'] ?? '').split('/')[0] || undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const {
    conversations,
    loading,
    error: inboxError,
    refresh,
    deleteConversation,
  } = useInbox();

  const activeId = conversationId || null;

  // A student has exactly one thread — the 1:1 with Joshua — so Messages IS that
  // thread. No list, and no redirect to /inbox/:id either: bouncing the URL made
  // the list render for a beat first and put a thread the student can never
  // leave behind a back button. Admins still resolve strictly from the route.
  const active = useMemo(() => {
    const fromRoute = activeId ? conversations.find((c) => c.id === activeId) ?? null : null;
    if (fromRoute || is_admin || permsLoading || !user) return fromRoute;
    return pickStudentPrimary(conversations, user.id);
  }, [conversations, activeId, is_admin, permsLoading, user]);

  const routeState = location.state as { composeTarget?: string | null } | null;
  const composeTarget = routeState?.composeTarget || null;
  const clearComposeTarget = useCallback(
    () => navigate(location.pathname, { replace: true, state: {} }),
    [navigate, location.pathname],
  );

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

  // Admins return to whichever thread they were last reading, and see the list
  // only when there is nothing live to return to. (Students never reach this —
  // their thread is resolved above without touching the URL.)
  //
  // The restore fires once per visit, not on every empty activeId: the back
  // button clears activeId too, and re-restoring there would make the thread
  // list unreachable. Backing out is also an explicit "give me the list", so
  // it drops the memory rather than fighting the next visit.
  const restoreAttempted = useRef(false);
  useEffect(() => {
    if (activeId || loading || permsLoading || !user || !is_admin) return;
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    const remembered = readLastThread();
    if (remembered && conversations.some((c) => c.id === remembered)) {
      navigate(`/inbox/${remembered}`, { replace: true });
    }
  }, [conversations, activeId, navigate, is_admin, loading, permsLoading, user]);

  useEffect(() => {
    if (activeId) writeLastThread(activeId);
  }, [activeId]);

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

  const selectThread = useCallback((id: string) => navigate(`/inbox/${id}`), [navigate]);
  const clearThread = useCallback(() => {
    forgetLastThread();
    navigate('/inbox');
  }, [navigate]);

  const adminEmptyLabel =
    query.trim().length > 0 ? 'No threads match your search.' : FILTER_EMPTY_LABEL[filter];

  // Detail: the conversation owns the stage. h-full (never h-screen) — the stage
  // is already a sized flex child, so this keeps the composer pinned and scrolls
  // the messages internally instead of growing a second page scrollbar.
  if (active) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <ConversationView
          conversation={active}
          /* Students have nowhere to go back TO, so they get no back button. */
          onBack={is_admin ? clearThread : undefined}
          onMessageSent={refresh}
          layout="stage"
        />
      </div>
    );
  }

  if (!is_admin && !loading && conversations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <StudentEmptyState onStart={handleStartJoshua} isStarting={starting} />
      </div>
    );
  }

  // List: ordinary page content in the stage.
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {is_admin && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students or messages"
              aria-label="Search students or messages"
              className="h-9 rounded-md border-border bg-background pl-9 text-sm"
            />
          </div>
          <NewConversationDialog
            autoOpenWith={composeTarget}
            onAutoOpenHandled={clearComposeTarget}
            onCreated={selectThread}
            triggerLabel="New"
            triggerClassName="h-9 shrink-0 rounded-md"
          />
        </div>
      )}

      {is_admin && (
        <div
          role="tablist"
          aria-label="Filter conversations"
          className="mb-3 inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5"
        >
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                'whitespace-nowrap rounded-[5px] px-2.5 py-1 text-[0.8125rem] font-medium transition-colors',
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
      )}

      {loading ? (
        <ThreadListSkeleton count={6} />
      ) : inboxError ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
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
          variant="admin"
          surface="light"
          emptyLabel={is_admin ? adminEmptyLabel : 'No conversations yet.'}
          onDelete={is_admin ? deleteConversation : undefined}
        />
      )}
    </div>
  );
}
