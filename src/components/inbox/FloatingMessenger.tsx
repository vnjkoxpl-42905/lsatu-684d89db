// FloatingMessenger — bottom-right compact chat widget.
//
// Hidden routes:
//   /auth, /onboarding, /reset-password — pre-auth surfaces.
//   /inbox                              — full inbox already visible.
//   /admin/ta                           — TA workspace owns its own widget at
//                                          right-24 z-40; Messenger here would
//                                          stack against it.
//
// Mainhub behavior: visible by default; hidden only while a node is in the
// expanded state on /mainhub (via useOrbitalActive) so the Find overlay and
// the messenger panel don't compete.

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useOrbitalActive } from '@/contexts/OrbitalActiveContext';
import { ThreadList, ThreadListSkeleton } from './ThreadList';
import { ConversationView } from './ConversationView';
import { StudentEmptyState } from './StudentEmptyState';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { isParticipantOnline } from './inboxPresence';
import { setMessengerOpen, useBottomRightSurfaceOpen } from './messengerOpenBus';

const HIDDEN_ROUTES = ['/auth', '/onboarding', '/inbox', '/reset-password', '/admin/ta', '/teacher', '/drill', '/classroom/drill', '/topics/abstract'];

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
    if (!user) return null;
    const withAdmin = conversations.find((c) =>
      c.participants.some((p) => p.user_id !== user.id && p.is_admin),
    );
    if (withAdmin) return withAdmin.id;
    if (conversations.length > 0) return conversations[0].id;
    return null;
  }, [conversations, user]);

  // When a student opens the panel, jump straight into their thread.
  useEffect(() => {
    if (!open) return;
    if (activeId) return;
    if (studentPrimaryId) setActiveId(studentPrimaryId);
  }, [open, activeId, studentPrimaryId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeHeaderName = useMemo(() => {
    if (!active || !user) return null;
    const others = active.participants.filter((p) => p.user_id !== user.id);
    const realNames = others.map((o) => o.display_name?.trim()).filter((n): n is string => !!n);
    return realNames[0] || 'Joshua';
  }, [active, user]);

  const activeOtherParticipant = useMemo(() => {
    if (!active || !user) return null;
    return active.participants.find((participant) => participant.user_id !== user.id) ?? null;
  }, [active, user]);

  const activeIsOnline = useMemo(
    () => isParticipantOnline(activeOtherParticipant?.last_seen_at),
    [activeOtherParticipant],
  );

  const reducedMotion = useReducedMotion();
  const anySurfaceOpen = useBottomRightSurfaceOpen();

  // Publish open state so the proactive StudentCornerBubble can stay quiet
  // while the full messenger is on screen.
  useEffect(() => {
    setMessengerOpen(open);
    return () => setMessengerOpen(false);
  }, [open]);

  if (!authReady || !user || permsLoading) return null;
  // Admins use the consolidated AdminChatHub instead.
  if (is_admin) return null;
  if (!has_chat_access) return null;

  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (pathHidden) return null;
  const onMainhub = location.pathname.startsWith('/classroom/drill');
  // On /mainhub, defer to the orbital while a node is in the expanded state so
  // the Find overlay and the messenger panel don't compete for attention.
  if (onMainhub && orbitalActive) return null;

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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not start conversation');
    } finally {
      setStarting(false);
    }
  };


  const showStudentEmpty = !active && !loading && conversations.length === 0;

  // Hide the launcher whenever the panel itself is open, or any other
  // bottom-right surface (the Help sheet) is open — never a launcher on top of
  // an open surface, and never two launchers overlapping.
  const showLauncher = !open && !anySurfaceOpen;

  return (
    <>
      {showLauncher && (
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        aria-expanded={open}
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
        aria-label={open ? 'Close messenger' : unreadCount > 0 ? `Open messenger, ${unreadCount} unread` : 'Open messenger'}
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
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="messenger-panel"
            role="dialog"
            aria-label="Messenger with Joshua"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 28 }
            }
            style={{ transformOrigin: 'bottom right' }}
            className={cn(
              'fixed bottom-24 right-6 z-50 flex flex-col',
              'w-[380px] max-w-[calc(100vw-2rem)]',
              'h-[min(560px,calc(100dvh-7rem))]',
              'bg-background border border-border rounded-2xl shadow-2xl overflow-hidden',
              'focus:outline-none',
            )}
          >
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
              <div
                className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30 flex items-center justify-center text-xs font-semibold shrink-0 relative"
                aria-hidden="true"
              >
                J
                {activeIsOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{activeHeaderName || 'Joshua'}</div>
                <div className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1.5">
                  <span>{activeIsOnline ? 'Online now' : 'Your coach'}</span>
                  {activeIsOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
                </div>
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
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close messenger"
              >
                <X className="w-4 h-4" />
              </button>
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
                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <ThreadListSkeleton />
                      ) : (
                        <ThreadList
                          conversations={conversations}
                          activeId={activeId}
                          onSelect={setActiveId}
                          variant="student"
                          emptyLabel="No conversations yet."
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
