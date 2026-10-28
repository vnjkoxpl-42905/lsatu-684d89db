// StudentCornerBubble — proactive bottom-right bubble for students.
//
// Pops once for each genuinely new event (an admin message arriving in the
// inbox, or a new notification: assignment / reminder / streak / signup /
// message). Shows a preview with an inline quick-reply and an "Open" button,
// then auto-settles after ~8s. The persistent unread state still lives on the
// FloatingMessenger badge — this bubble is purely additive and transient.
//
// Coordination: stays quiet while the full FloatingMessenger panel is open
// (via messengerOpenBus). Only one bubble shows at a time; a newer event
// replaces the current one. Refs are seeded on first load so existing items
// never trigger a pop storm.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageSquare, Bell, ExternalLink, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { isMessengerOpen } from './messengerOpenBus';

const HIDDEN_ROUTES = [
  '/auth',
  '/onboarding',
  '/inbox',
  '/reset-password',
  '/admin/ta',
  '/teacher',
  '/drill',
  '/classroom/drill',
  '/topics/abstract',
];

const AUTO_DISMISS_MS = 8000;

type BubbleEvent =
  | {
      kind: 'message';
      title: string;
      preview: string;
      conversationId: string;
    }
  | {
      kind: 'notification';
      title: string;
      preview: string;
      link: string | null;
      notifId: string;
    };

function truncate(s: string, n = 120): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function StudentCornerBubble() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { has_chat_access, is_admin, loading: permsLoading } = useUserPermissions();
  const { conversations, refresh: refreshInbox } = useInbox();
  const { notifications, markRead } = useNotifications();
  const reducedMotion = useReducedMotion();

  const [event, setEvent] = useState<BubbleEvent | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const msgSeededRef = useRef(false);
  const lastMsgSigRef = useRef<string | null>(null);
  const notifSeededRef = useRef(false);
  const lastNotifIdRef = useRef<string | null>(null);

  // Student's primary 1:1 thread with the admin (Joshua), for quick-reply
  // fallback when the event is a notification rather than a message.
  const studentPrimaryId = useMemo(() => {
    if (is_admin || !user) return null;
    const withAdmin = conversations.find((c) =>
      c.participants.some((p) => p.user_id !== user.id && p.is_admin),
    );
    if (withAdmin) return withAdmin.id;
    return conversations[0]?.id ?? null;
  }, [conversations, is_admin, user]);

  // Detect a new incoming inbox message (sender is not me).
  useEffect(() => {
    if (!user || is_admin) return;
    let best: { sig: string; createdAt: number; title: string; preview: string; conversationId: string } | null =
      null;
    for (const c of conversations) {
      const lm = c.last_message;
      if (!lm || lm.sender_id === user.id) continue;
      const createdAt = new Date(lm.created_at).getTime();
      if (!best || createdAt > best.createdAt) {
        const other = c.participants.find((p) => p.user_id !== user.id);
        best = {
          sig: `${c.id}:${lm.created_at}`,
          createdAt,
          title: other?.display_name?.trim() || 'Joshua',
          preview: truncate(lm.body || 'New message'),
          conversationId: c.id,
        };
      }
    }
    if (!msgSeededRef.current) {
      msgSeededRef.current = true;
      lastMsgSigRef.current = best?.sig ?? null;
      return;
    }
    if (best && best.sig !== lastMsgSigRef.current) {
      lastMsgSigRef.current = best.sig;
      if (!isMessengerOpen()) {
        setEvent({
          kind: 'message',
          title: best.title,
          preview: best.preview,
          conversationId: best.conversationId,
        });
      }
    }
  }, [conversations, user, is_admin]);

  // Detect a new notification (assignment / reminder / streak / signup / message).
  useEffect(() => {
    if (!user || is_admin) return;
    const newest = notifications[0];
    if (!notifSeededRef.current) {
      notifSeededRef.current = true;
      lastNotifIdRef.current = newest?.id ?? null;
      return;
    }
    if (newest && newest.id !== lastNotifIdRef.current) {
      lastNotifIdRef.current = newest.id;
      if (!isMessengerOpen()) {
        setEvent({
          kind: 'notification',
          title: newest.title || 'New notification',
          preview: truncate(newest.body || ''),
          link: newest.link,
          notifId: newest.id,
        });
      }
    }
  }, [notifications, user, is_admin]);

  // Auto-dismiss the current bubble.
  useEffect(() => {
    if (!event) return;
    const t = window.setTimeout(() => setEvent(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [event]);

  // Dismiss on outside click.
  useEffect(() => {
    if (!event) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setEvent(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [event]);

  if (!authReady || !user || permsLoading) return null;
  if (is_admin) return null;
  if (!has_chat_access) return null;
  const pathHidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (pathHidden) return null;
  if (!event) return null;

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      let convId = event.kind === 'message' ? event.conversationId : studentPrimaryId;
      if (!convId) convId = await startJoshuaConversation();
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, sender_id: user.id, body });
      if (error) throw error;
      setReply('');
      setEvent(null);
      await refreshInbox();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  const openItem = () => {
    if (event.kind === 'notification') {
      void markRead(event.notifId);
      navigate(event.link || '/inbox');
    } else {
      navigate(`/inbox/${encodeURIComponent(event.conversationId)}`);
    }
    setEvent(null);
  };

  const Icon = event.kind === 'notification' ? Bell : MessageSquare;

  return (
    <AnimatePresence>
      <motion.div
        key="student-corner-bubble"
        ref={panelRef}
        role="dialog"
        aria-label={event.kind === 'notification' ? 'New notification' : 'New message'}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
        style={{ transformOrigin: 'bottom right' }}
        className={cn(
          'fixed bottom-24 right-6 z-50 flex flex-col',
          'w-[360px] max-w-[calc(100vw-2rem)]',
          'bg-background border border-border rounded-2xl shadow-2xl overflow-hidden',
        )}
      >
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <div
            className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{event.title}</div>
            {event.preview && (
              <div className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                {event.preview}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEvent(null)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendReply();
              }
            }}
            placeholder="Reply to Joshua…"
            disabled={sending}
            className="flex-1 min-w-0 h-9 rounded-full border border-border bg-muted/40 px-3.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void sendReply()}
            disabled={sending || !reply.trim()}
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 transition disabled:opacity-40 hover:opacity-90"
            aria-label="Send reply"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openItem}
            className="h-9 inline-flex items-center gap-1 rounded-full border border-border px-3 text-[12px] font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            Open
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
