// FloatingMessenger — quick-access messaging fly-out.
//
// Hidden routes:
//   /auth, /onboarding, /reset-password — pre-auth surfaces.
//   /inbox                              — full inbox already visible.
//   /admin/ta                           — TA workspace owns its own widget at
//                                          right-24 z-40; Messenger here would
//                                          stack against it.
//
// Foyer behavior: visible by default; hidden only while a node is in the
// expanded state on /foyer (via useOrbitalActive) so the Find overlay and
// the messenger panel don't compete.

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, ArrowLeft, ExternalLink, X } from 'lucide-react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useOrbitalActive } from '@/contexts/OrbitalActiveContext';
import { ThreadList, ThreadListSkeleton } from './ThreadList';
import { ConversationView } from './ConversationView';
import { NewConversationDialog } from './NewConversationDialog';
import { StudentEmptyState } from './StudentEmptyState';
import { startJoshuaConversation } from '@/lib/joshuaThread';

const HIDDEN_ROUTES = ['/auth', '/onboarding', '/inbox', '/reset-password', '/admin/ta', '/teacher', '/drill'];

export function FloatingMessenger() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { has_chat_access, is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading, unreadCount, refresh } = useInbox();
  const { active: orbitalActive } = useOrbitalActive();

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Student auto-pin: prefer the thread that contains an admin participant.
  const studentPrimaryId = useMemo(() => {
    if (is_admin || !user) return null;
    const withAdmin = conversations.find((c) =>
      c.participants.some((p) => p.user_id !== user.id && p.is_admin),
    );
    if (withAdmin) return withAdmin.id;
    if (conversations.length > 0) return conversations[0].id;
    return null;
  }, [conversations, is_admin, user]);

  // When a student opens the panel, jump straight into their thread.
  useEffect(() => {
    if (!open || is_admin) return;
    if (activeId) return;
    if (studentPrimaryId) setActiveId(studentPrimaryId);
  }, [open, is_admin, activeId, studentPrimaryId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeHeaderName = useMemo(() => {
    if (!active || !user) return null;
    const others = active.participants.filter((p) => p.user_id !== user.id);
    const realNames = others.map((o) => o.display_name?.trim()).filter((n): n is string => !!n);
    if (!is_admin) return realNames[0] || 'Joshua';
    return realNames.join(', ') || active.subject || 'Conversation';
  }, [active, user, is_admin]);

  const reducedMotion = useReducedMotion();

  if (!authReady || !user || permsLoading) return null;
  // Admins use the consolidated AdminChatHub instead.
  if (is_admin) return null;
  if (!has_chat_access) return null;

  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (pathHidden) return null;
  // On /foyer, defer to the orbital while a node is in the expanded state so
  // the Find overlay and the messenger panel don't compete for attention.
  if (location.pathname.startsWith('/foyer') && orbitalActive) return null;

  const openFullInbox = () => {
    setOpen(false);
    navigate(active ? `/inbox/${active.id}` : '/inbox');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setActiveId(null);
  };

  const handleStartJoshua = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await startJoshuaConversation();
      await refresh();
      setActiveId(id);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start conversation');
    } finally {
      setStarting(false);
    }
  };

  const reducedMotion = useReducedMotion();

  const showStudentEmpty = !is_admin && !active && !loading && conversations.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-12 w-12 rounded-full',
          'bg-background/90 backdrop-blur shadow-lg border',
          studentPrimaryId ? 'border-emerald-500/30' : 'border-border',
          'flex items-center justify-center',
          'text-foreground/80 hover:text-foreground',
          'hover:bg-background transition active:scale-[0.95]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label={unreadCount > 0 ? `Open messenger, ${unreadCount} unread` : 'Open messenger'}
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
        {studentPrimaryId && unreadCount === 0 && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background"
            aria-hidden="true"
          />
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
            <SheetPrimitive.Title className="sr-only">Messenger</SheetPrimitive.Title>

            <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
              <div
                className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30 flex items-center justify-center text-xs font-semibold shrink-0 relative"
                aria-hidden="true"
              >
                J
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">Joshua</div>
                <div className="text-[11px] text-muted-foreground truncate">Your coach</div>
              </div>
              <button
                type="button"
                onClick={openFullInbox}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Open full inbox"
              >
                <span className="hidden sm:inline">Full inbox</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <SheetPrimitive.Close
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close messenger"
              >
                <X className="w-4 h-4" />
              </SheetPrimitive.Close>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {active ? (
                  <motion.div
                    key="active"
                    initial={reducedMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? {} : { opacity: 0, x: 12 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full"
                  >
                    <ConversationView
                      conversation={active}
                      onMessageSent={refresh}
                      hideHeader
                    />
                  </motion.div>
                ) : showStudentEmpty ? (
                  <motion.div
                    key="student-empty"
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reducedMotion ? {} : { opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                    className="h-full flex"
                  >
                    <StudentEmptyState onStart={handleStartJoshua} isStarting={starting} compact />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? {} : { opacity: 0, x: -12 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full flex flex-col"
                  >
                    {is_admin && (
                      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Conversations
                        </span>
                        <NewConversationDialog
                          onCreated={(id) => {
                            refresh();
                            setActiveId(id);
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <ThreadListSkeleton />
                      ) : (
                        <ThreadList
                          conversations={conversations}
                          activeId={activeId}
                          onSelect={setActiveId}
                          variant={is_admin ? 'admin' : 'student'}
                          emptyLabel={
                            is_admin
                              ? 'No conversations yet. Start one with a student.'
                              : 'No conversations yet.'
                          }
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
    </>
  );
}
