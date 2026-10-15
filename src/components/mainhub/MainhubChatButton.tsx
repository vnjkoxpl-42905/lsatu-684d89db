import { useRef, useState } from "react";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInbox, type Conversation } from "@/hooks/useInbox";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeShort } from "@/lib/time";
import { cn } from "@/lib/utils";

// Mirrors the magnify-on-hover DockItem pattern used by NotificationBell.
// Lives in the top-right Mainhub cluster (MainhubDock). Clicking opens a
// dropdown of recent conversations; "View all" routes to the full Inbox.
// Distinct from the bottom-right Study Thread help widget.
interface Props {
  mouseX: MotionValue<number>;
}

const RECENT_LIMIT = 5;

// The other participant's name (the conversation is titled by who you're
// talking to, not yourself). Falls back to the subject, then a generic label.
function conversationTitle(c: Conversation, selfId: string | undefined): string {
  const other = c.participants.find((p) => p.user_id !== selfId);
  return other?.display_name || c.subject || "Conversation";
}

function previewText(c: Conversation, selfId: string | undefined): string {
  const msg = c.last_message;
  if (!msg) return c.hasAttachments ? "Attachment" : "No messages yet";
  const mine = msg.sender_id === selfId;
  const body = msg.body?.trim() || (c.hasAttachments ? "Attachment" : "");
  return mine ? `You: ${body}` : body;
}

export default function MainhubChatButton({ mouseX }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading: inboxLoading, unreadCount } = useInbox();
  const { has_chat_access, is_admin, loading } = useUserPermissions();
  const [open, setOpen] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], [44, 72, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });
  const iconScaleSync = useTransform(width, [44, 72], [1, 1.4]);
  const iconScale = useSpring(iconScaleSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  if (loading) return null;
  if (!is_admin && !has_chat_access) return null;

  const recent = conversations.slice(0, RECENT_LIMIT);

  const openConversation = (c: Conversation) => {
    setOpen(false);
    navigate(`/inbox/${c.id}`);
  };

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative aspect-square rounded-[1.1rem] border border-border/70 bg-background text-muted-foreground shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"
            }
            title="Inbox"
            className="absolute inset-0 flex items-center justify-center rounded-[1.1rem] transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <motion.div
              style={{ scale: iconScale }}
              className="flex items-center justify-center"
            >
              <Mail className="h-5 w-5 stroke-[2.15]" aria-hidden />
            </motion.div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-[min(360px,calc(100vw-2rem))] p-0"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <div className="text-sm font-semibold text-foreground">Messages</div>
            {unreadCount > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>

          {inboxLoading && conversations.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Loading messages…
            </div>
          ) : recent.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-border">
              {recent.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-accent/50 transition-colors",
                      c.unread && "bg-accent/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={cn(
                            "text-sm truncate",
                            c.unread
                              ? "font-semibold text-foreground"
                              : "text-foreground/90"
                          )}
                        >
                          {conversationTitle(c, user?.id)}
                        </div>
                        <div className="text-[11px] text-muted-foreground shrink-0">
                          {formatRelativeShort(c.last_message_at)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {previewText(c, user?.id)}
                      </div>
                    </div>
                    {c.unread && (
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/inbox");
              }}
              className="w-full rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all messages
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {unreadCount > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </motion.div>
  );
}
