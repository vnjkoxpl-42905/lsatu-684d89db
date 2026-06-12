// AdminChatHub — single floating chat surface for admins.
//
// Replaces three separate FABs that previously stacked in the bottom-right:
//   - FloatingMessenger (real 1:1 student inbox)
//   - FloatingTAWidget  (Teaching Assistant per-student chat)
//   - FloatingActions Sparkles (bootcamp AI Tutor — kept on its own surface)
//
// One bubble, one fly-out, two tabs: Students | Teaching Assistant.

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { MessageSquare, ArrowLeft, ExternalLink, X, GraduationCap, Users } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// `/mainhub` is intentionally not hidden: admins reach student conversations
// from the hub. Only fully immersive surfaces (drill) hide the chat bubble.
const HIDDEN_ROUTES = ['/auth', '/onboarding', '/reset-password', '/drill'];
const TAB_LS_KEY = 'admin-chat-hub-tab';
const TA_LS_KEY = 'ta-selected-student';

type Tab = 'students' | 'ta';

export default function AdminChatHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, loading, unreadCount, refresh } = useInbox();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const v = localStorage.getItem(TAB_LS_KEY);
      return v === 'ta' ? 'ta' : 'students';
    } catch {
      return 'students';
    }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [taSelected, setTaSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TA_LS_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_LS_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    try {
      if (taSelected) localStorage.setItem(TA_LS_KEY, taSelected);
    } catch {
      /* ignore */
    }
  }, [taSelected]);

  // External trigger: ⌘J / subscribeTAWidget bus opens hub on TA tab.
  useEffect(
    () =>
      subscribeTAWidget(() => {
        setTab('ta');
        setOpen(true);
      }),
    [],
  );

  const { data: taSelectedProfile } = useQuery<{ display_name: string | null } | null>({
    queryKey: ['ta-student-name', taSelected],
    enabled: !!taSelected && open && tab === 'ta',
    queryFn: async () => {
      if (!taSelected) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', taSelected)
        .maybeSingle();
      return data ?? null;
    },
  });
  const taSelectedName = taSelectedProfile?.display_name ?? null;

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeHeaderName = useMemo(() => {
    if (!active || !user) return null;
    const others = active.participants.filter((p) => p.user_id !== user.id);
    const realNames = others
      .map((o) => o.display_name?.trim())
      .filter((n): n is string => !!n);
    return realNames.join(', ') || active.subject || 'Conversation';
  }, [active, user]);

  if (!authReady || !user || permsLoading) return null;
  if (!is_admin) return null;

  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (pathHidden) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setActiveId(null);
  };

  const openFullPage = () => {
    setOpen(false);
    if (tab === 'ta') {
      navigate('/admin/ta');
    } else {
      navigate(active ? `/inbox/${active.id}` : '/inbox');
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
              {tab === 'students' && active ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveId(null)}
                  aria-label="Back to conversations"
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : tab === 'ta' && taSelected ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTaSelected(null)}
                  aria-label="Back to student list"
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
                  {tab === 'students'
                    ? active
                      ? activeHeaderName
                      : 'Messages'
                    : taSelected
                      ? taSelectedName?.trim() || 'Student'
                      : 'Teaching Assistant'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {tab === 'students'
                    ? active
                      ? active.subject || 'Messages and PDF attachments'
                      : unreadCount > 0
                        ? `${unreadCount} unread`
                        : 'All caught up'
                    : taSelected
                      ? 'TA chat'
                      : 'Pick a student'}
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

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              <TabButton
                active={tab === 'students'}
                onClick={() => {
                  setTab('students');
                  setActiveId(null);
                }}
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

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden">
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
                    {active ? (
                      <ConversationView
                        conversation={active}
                        onMessageSent={refresh}
                        hideHeader
                      />
                    ) : (
                      <div className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            Conversations
                          </span>
                          <NewConversationDialog
                            onCreated={(id) => {
                              refresh();
                              setActiveId(id);
                            }}
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {loading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                              Loading…
                            </div>
                          ) : (
                            <ThreadList
                              conversations={conversations}
                              activeId={activeId}
                              onSelect={setActiveId}
                              variant="admin"
                              emptyLabel="No conversations yet. Start one with a student."
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
                    {taSelected ? (
                      <TAChatView studentId={taSelected} studentName={taSelectedName} />
                    ) : (
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Pick a student for TA context
                          </span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <StudentSelector
                            selectedId={taSelected}
                            onSelect={(id) => setTaSelected(id)}
                          />
                        </div>
                      </div>
                    )}
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
