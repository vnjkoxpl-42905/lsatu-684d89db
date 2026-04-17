import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, ArrowLeft, ExternalLink, X } from 'lucide-react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ThreadList } from './ThreadList';
import { ConversationView } from './ConversationView';
import { NewConversationDialog } from './NewConversationDialog';

const HIDDEN_ROUTES = ['/auth', '/onboarding', '/inbox', '/reset-password'];

export function FloatingMessenger() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { has_chat_access, is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading, unreadCount, refresh } = useInbox();

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  if (!authReady || !user || permsLoading) return null;
  if (!has_chat_access && !is_admin) return null;

  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`)
  );
  if (pathHidden) return null;

  const openFullInbox = () => {
    setOpen(false);
    navigate(active ? `/inbox/${active.id}` : '/inbox');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setActiveId(null);
  };

  return (
    <>
      {/* ── Trigger ── */}
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
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
      </button>

      {/* ── Panel (Radix Dialog portal) ── */}
      <SheetPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <SheetPrimitive.Content
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex flex-col',
              'w-full sm:max-w-md',
              'bg-background border-l border-border shadow-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'data-[state=closed]:duration-250 data-[state=open]:duration-300',
              'focus:outline-none'
            )}
            aria-describedby={undefined}
          >
            <SheetPrimitive.Title className="sr-only">Messenger</SheetPrimitive.Title>

            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
              {active ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveId(null)}
                  aria-label="Back to conversations"
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {active ? 'Conversation' : 'Messages'}
                </div>
                {!active && (
                  <div className="text-[11px] text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={openFullInbox}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
                title="Open full inbox"
              >
                <span className="hidden sm:inline">Full inbox</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <SheetPrimitive.Close
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close messenger"
              >
                <X className="w-4 h-4" />
              </SheetPrimitive.Close>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {active ? (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full"
                  >
                    <ConversationView
                      conversation={active}
                      onMessageSent={refresh}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
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
                        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                      ) : conversations.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {is_admin
                              ? 'No conversations yet. Start one with a student.'
                              : 'Your instructor will reach out to start your conversation.'}
                          </div>
                        </div>
                      ) : (
                        <ThreadList
                          conversations={conversations}
                          activeId={activeId}
                          onSelect={setActiveId}
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
