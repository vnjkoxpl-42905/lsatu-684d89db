// AdminChatHub — single floating chat surface for admins.
//
// Replaces three separate FABs that previously stacked in the bottom-right:
//   - FloatingMessenger (real 1:1 student inbox)
//   - FloatingTAWidget  (Teaching Assistant per-student chat)
//   - FloatingActions Sparkles (bootcamp AI Tutor — kept on its own surface)
//
// One bubble, one fly-out, two tabs: Students | Teaching Assistant.
//
// Unified student focus: a single `focusedStudent` is the source of truth for
// BOTH tabs. Pick a student once (search or a thread) and the message thread
// AND the AI action agent both target them. A pill in the header shows who is
// focused; ✕ clears it. `profiles.class_id` IS the auth user id, so the same
// id drives inbox-participant matching and the TA agent's `studentId`.

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { MessageSquare, ArrowLeft, ExternalLink, X, GraduationCap, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ThreadList } from '@/components/inbox/ThreadList';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import StudentSelector from '@/components/ta/StudentSelector';
import TAChatView from '@/components/ta/TAChatView';
import { subscribeTAWidget } from '@/components/ta/taWidgetBus';

const HIDDEN_ROUTES = [
  '/auth',
  '/onboarding',
  '/reset-password',
  '/drill',
  '/classroom/drill',
  '/inbox',
  '/teacher/conversations',
];
const TAB_LS_KEY = 'admin-chat-hub-tab';
const FOCUS_LS_KEY = 'admin-chat-hub-focus';

type Tab = 'students' | 'ta';

interface FocusedStudent {
  /** profiles.class_id, which IS the auth user id. */
  id: string;
  name: string | null;
}

function initialsOf(name: string | null): string {
  const n = (name ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '');
}

export default function AdminChatHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading, unreadCount, refresh, deleteConversation } = useInbox();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const v = localStorage.getItem(TAB_LS_KEY);
      return v === 'ta' ? 'ta' : 'students';
    } catch {
      return 'students';
    }
  });
  const [focused, setFocused] = useState<FocusedStudent | null>(() => {
    try {
      const raw = localStorage.getItem(FOCUS_LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FocusedStudent;
      return parsed && typeof parsed.id === 'string' ? parsed : null;
    } catch {
      return null;
    }
  });
  // When focused, `picking` flips the body to the student search so the admin
  // can switch focus without losing the pill.
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_LS_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    try {
      if (focused) localStorage.setItem(FOCUS_LS_KEY, JSON.stringify(focused));
      else localStorage.removeItem(FOCUS_LS_KEY);
    } catch {
      /* ignore */
    }
  }, [focused]);

  // External trigger: ⌘J / subscribeTAWidget bus opens hub on TA tab.
  useEffect(
    () =>
      subscribeTAWidget(() => {
        setTab('ta');
        setOpen(true);
        setPicking(false);
      }),
    [],
  );

  // The inbox thread for the focused student (if one exists). class_id === user_id,
  // so we match the focused id against conversation participants.
  const focusedThread = useMemo(() => {
    if (!focused || !user) return null;
    return (
      conversations.find((c) =>
        c.participants.some((p) => p.user_id === focused.id),
      ) ?? null
    );
  }, [conversations, focused, user]);

  const focusedName = useMemo(() => {
    if (!focused) return null;
    if (focused.name?.trim()) return focused.name.trim();
    // Fall back to the participant display name resolved by the inbox RPC.
    const part = focusedThread?.participants.find((p) => p.user_id === focused.id);
    return part?.display_name?.trim() || null;
  }, [focused, focusedThread]);

  if (!authReady || !user || permsLoading) return null;
  if (!is_admin) return null;

  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (pathHidden) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPicking(false);
  };

  const selectFocus = (id: string, name: string | null) => {
    setFocused({ id, name });
    setPicking(false);
  };

  const clearFocus = () => {
    setFocused(null);
    setPicking(false);
  };

  const openFullPage = () => {
    setOpen(false);
    if (tab === 'ta') {
      navigate('/admin/ta');
    } else {
      navigate(focusedThread ? `/inbox/${focusedThread.id}` : '/inbox');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-12 w-12 rounded-full',
          'bg-background/90 backdrop-blur border border-border shadow-lg',
          'flex items-center justify-center',
          'text-foreground/80 hover:text-foreground',
          'hover:bg-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label={
          unreadCount > 0 ? `Open chat, ${unreadCount} unread` : 'Open chat'
        }
      >
        <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center border-2 border-background"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <SheetPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <SheetPrimitive.Content
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex flex-col',
              'w-full sm:max-w-md',
              'bg-background border-l border-border shadow-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'data-[state=closed]:duration-250 data-[state=open]:duration-300',
              'focus:outline-none',
            )}
            aria-describedby={undefined}
          >
            <SheetPrimitive.Title className="sr-only">Chat</SheetPrimitive.Title>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
              {picking ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPicking(false)}
                  aria-label="Cancel student search"
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <div
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {tab === 'ta' ? (
                    <GraduationCap className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {picking
                    ? 'Focus a student'
                    : tab === 'students'
                      ? 'Messages'
                      : 'Teaching Assistant'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {picking
                    ? 'Pick one student for both messages and the agent'
                    : tab === 'students'
                      ? unreadCount > 0
                        ? `${unreadCount} unread`
                        : 'Messages and PDF attachments'
                      : focused
                        ? 'Targeting one student'
                        : 'Action agent — resolves names from your message'}
                </div>
              </div>
              <button
                type="button"
                onClick={openFullPage}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
                title="Open full page"
              >
                <span className="hidden sm:inline">Full page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <SheetPrimitive.Close
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </SheetPrimitive.Close>
            </div>

            {/* Focus pill bar */}
            {!picking && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
                {focused ? (
                  <>
                    <span className="inline-flex items-center gap-2 min-w-0 rounded-full bg-primary/10 text-foreground pl-1.5 pr-1 py-1 max-w-full">
                      <span
                        className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 uppercase"
                        aria-hidden="true"
                      >
                        {initialsOf(focusedName)}
                      </span>
                      <span className="text-[12px] font-medium truncate">
                        {focusedName || 'Student'}
                      </span>
                      <button
                        type="button"
                        onClick={clearFocus}
                        className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors shrink-0"
                        aria-label="Clear focused student"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPicking(true)}
                      className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent shrink-0"
                    >
                      Switch
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Focus a student
                  </button>
                )}
              </div>
            )}

            {/* Tabs */}
            {!picking && (
              <div className="flex border-b border-border shrink-0">
                <TabButton
                  active={tab === 'students'}
                  onClick={() => setTab('students')}
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Students"
                  badge={unreadCount}
                />
                <TabButton
                  active={tab === 'ta'}
                  onClick={() => setTab('ta')}
                  icon={<GraduationCap className="w-3.5 h-3.5" />}
                  label="Teaching Assistant"
                />
              </div>
            )}

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {picking ? (
                <StudentSelector selectedId={focused?.id ?? null} onSelect={selectFocus} />
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {tab === 'students' ? (
                    <motion.div
                      key="students"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      {focused ? (
                        focusedThread ? (
                          <ConversationView
                            conversation={focusedThread}
                            onMessageSent={refresh}
                            hideHeader
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-sm font-medium">
                              No conversation with {focusedName || 'this student'} yet
                            </div>
                            <div className="text-[12px] text-muted-foreground">
                              Start a thread to send messages and attachments.
                            </div>
                            <NewConversationDialog
                              onCreated={() => refresh()}
                            />
                          </div>
                        )
                      ) : (
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              Conversations
                            </span>
                            <NewConversationDialog onCreated={() => refresh()} />
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            {loading ? (
                              <div className="p-8 text-center text-sm text-muted-foreground">
                                Loading…
                              </div>
                            ) : (
                              <ThreadList
                                conversations={conversations}
                                activeId={null}
                                onSelect={(id) => {
                                  const conv = conversations.find((c) => c.id === id);
                                  const other = conv?.participants.find(
                                    (p) => p.user_id !== user.id,
                                  );
                                  if (other) selectFocus(other.user_id, other.display_name ?? null);
                                }}
                                variant="admin"
                                emptyLabel="No conversations yet. Focus a student to start one."
                                onDelete={async (id) => {
                                  try {
                                    await deleteConversation(id);
                                    toast.success('Conversation deleted');
                                  } catch (e) {
                                    toast.error(
                                      e instanceof Error ? e.message : 'Could not delete conversation',
                                    );
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 min-h-0">
                        <TAChatView
                          studentId={focused?.id ?? null}
                          studentName={focusedName}
                          backend="ta-agent"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors',
        'border-b-2',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}
