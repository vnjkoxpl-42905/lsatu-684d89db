import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useOrbitalActive } from '@/contexts/OrbitalActiveContext';
import { ConversationView } from '@/components/inbox/ConversationView';
import { startJoshuaConversation } from '@/lib/joshuaThread';

const STORAGE_KEY = 'mainhub-chat.open';

function readPersistedOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writePersistedOpen(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* swallow quota errors */
  }
}

export default function MainhubFloatingChat() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { has_chat_access, is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading: inboxLoading, unreadCount, refresh } = useInbox();
  const { active: orbitalActive } = useOrbitalActive();
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState<boolean>(readPersistedOpen);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    writePersistedOpen(open);
  }, [open]);

  const joshuaConv = useMemo(() => {
    if (!user) return null;
    return (
      conversations.find((c) =>
        c.participants.some((p) => p.user_id !== user.id && p.is_admin),
      ) ?? null
    );
  }, [conversations, user]);

  const handleStartJoshua = async () => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await startJoshuaConversation();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start conversation';
      setStartError(msg);
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  if (!authReady || !user || permsLoading) return null;
  if (is_admin) return null;
  if (!has_chat_access) return null;
  if (orbitalActive) return null;

  const fabLabel = open
    ? 'Close chat'
    : unreadCount > 0
    ? `Open chat, ${unreadCount} unread`
    : 'Open chat';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={fabLabel}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A1E2B] text-white shadow-lg shadow-black/20 transition active:scale-[0.95] hover:bg-[#22273A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D08B] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 && (
          <span
            className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8D08B] px-1 text-[10px] font-semibold text-[#1A1E2B] ring-2 ring-[#1A1E2B]"
            aria-hidden
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mainhub-chat-panel"
            role="dialog"
            aria-label="Chat with Joshua"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 28 }
            }
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-foreground shadow-2xl"
          >
            <div style={{ height: 'min(520px, calc(100dvh - 7rem))' }} className="flex flex-col">
              <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-3.5 py-2.5 shrink-0">
                <div
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-500/30"
                  aria-hidden
                >
                  J
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-semibold text-[#1A1E2B]">Joshua</div>
                  <div className="truncate text-[11px] text-muted-foreground">Your coach</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(joshuaConv ? `/inbox/${joshuaConv.id}` : '/inbox');
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Open full inbox"
                >
                  <span className="hidden sm:inline">Full inbox</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {inboxLoading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : joshuaConv ? (
                  <ConversationView
                    conversation={joshuaConv}
                    onMessageSent={refresh}
                    hideHeader
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Say hi to Joshua to start a thread.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartJoshua}
                      disabled={starting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1E2B] px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.98] hover:bg-[#22273A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D08B] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      {starting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Start conversation
                    </button>
                    {startError && (
                      <p className="text-xs text-red-600">{startError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
