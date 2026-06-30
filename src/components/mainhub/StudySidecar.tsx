import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconBell,
  IconCopy,
  IconGavel,
  IconHistory,
  IconInbox,
  IconMessageCircle,
  IconPlus,
  IconSend,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyChat } from "@/hooks/useStudyChat";
import { useInbox, type Conversation } from "@/hooks/useInbox";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import { ConversationView } from "@/components/inbox/ConversationView";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeShort } from "@/lib/time";

interface StudySidecarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  presentation?: "floating" | "docked";
}

type SidecarMode = "chat" | "inbox" | "notifications";

function ThinkingDots() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-current opacity-60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handle}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <IconCopy size={13} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

function parseInboxConversationId(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/\/inbox\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function resolveJoshuaConversation(conversations: Conversation[], userId?: string) {
  if (!userId) return null;
  return (
    conversations.find((conversation) =>
      conversation.participants.some(
        (participant) => participant.user_id !== userId && participant.is_admin,
      ),
    ) ?? null
  );
}

function ModeButton({
  active,
  label,
  icon,
  unreadCount = 0,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  unreadCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unreadCount > 0 ? `${label}, ${unreadCount} unread` : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-[#161d2d] text-white shadow-sm"
          : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
      )}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
      {unreadCount > 0 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c8841f] px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export default function StudySidecar({
  open,
  onClose,
  userName,
  presentation = "floating",
}: StudySidecarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    activeMessages,
    thinking,
    streamingContent,
    send,
  } = useStudyChat();
  const { conversations, loading: inboxLoading, refresh: refreshInbox } = useInbox();
  const {
    notifications,
    unreadCount: notificationUnreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markRead,
    markAllRead,
  } = useNotifications();

  const [mode, setMode] = useState<SidecarMode>("chat");
  const [input, setInput] = useState("");
  const [activeInboxId, setActiveInboxId] = useState<string | null>(null);
  const [startingInbox, setStartingInbox] = useState(false);
  const [inboxNotice, setInboxNotice] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const joshuaConversation = useMemo(
    () => resolveJoshuaConversation(conversations, user?.id),
    [conversations, user?.id],
  );
  const inboxUnreadCount = joshuaConversation?.unread ? 1 : 0;
  const activeInboxConversation = useMemo(() => {
    if (activeInboxId) {
      return conversations.find((conversation) => conversation.id === activeInboxId) ?? null;
    }
    return joshuaConversation;
  }, [activeInboxId, conversations, joshuaConversation]);

  useEffect(() => {
    if (mode === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages.length, streamingContent, mode]);

  useEffect(() => {
    if (open && mode === "chat") {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open, mode]);

  useEffect(() => {
    if (joshuaConversation && !activeInboxId) {
      setActiveInboxId(joshuaConversation.id);
    }
  }, [activeInboxId, joshuaConversation]);

  useEffect(() => {
    if (activeInboxConversation) setInboxNotice(null);
  }, [activeInboxConversation]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    void send(text, userName);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleResolveInboxConversation = async () => {
    setStartingInbox(true);
    setInboxNotice(null);
    try {
      const conversationId = await startJoshuaConversation();
      setActiveInboxId(conversationId);
      await refreshInbox();
      return conversationId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open your Joshua thread.";
      setInboxNotice(message);
      throw error;
    } finally {
      setStartingInbox(false);
    }
  };

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.read) void markRead(notification.id);

    const inboxTargetId = parseInboxConversationId(notification.link);
    const inboxLink = notification.link?.startsWith("/inbox") ?? false;

    if (notification.type === "message" || inboxTargetId || inboxLink) {
      setSelectedNotification(null);
      setMode("inbox");
      if (inboxTargetId) {
        setActiveInboxId(inboxTargetId);
        setInboxNotice(null);
      } else if (joshuaConversation) {
        setActiveInboxId(joshuaConversation.id);
        setInboxNotice(null);
      } else {
        setInboxNotice("No messages yet. Send Joshua a message here.");
      }
      return;
    }

    if (notification.link) {
      navigate(notification.link);
      return;
    }

    setMode("notifications");
    setSelectedNotification(notification);
  };

  const isDocked = presentation === "docked";

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="study-sidecar"
          initial={isDocked ? { opacity: 0, x: 18 } : { x: "100%" }}
          animate={isDocked ? { opacity: 1, x: 0 } : { x: 0 }}
          exit={isDocked ? { opacity: 0, x: 18 } : { x: "100%" }}
          transition={
            isDocked
              ? { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
              : { type: "spring", stiffness: 320, damping: 38 }
          }
          className={cn(
            "hidden w-96 flex-col overflow-hidden bg-background/95 backdrop-blur-md md:flex",
            isDocked
              ? "relative h-full shrink-0 rounded-xl border border-border/40 shadow-sm shadow-black/5"
              : "fixed right-0 top-0 z-40 h-svh border-l border-border/40 shadow-2xl shadow-black/20",
          )}
          aria-label="LSAT U communication console"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-[#f3efe6] p-1">
              <ModeButton
                active={mode === "chat"}
                label="Chat"
                icon={<IconMessageCircle size={14} />}
                onClick={() => {
                  setMode("chat");
                  setSelectedNotification(null);
                }}
              />
              <ModeButton
                active={mode === "inbox"}
                label="Inbox"
                icon={<IconInbox size={14} />}
                unreadCount={inboxUnreadCount}
                onClick={() => {
                  setMode("inbox");
                  setSelectedNotification(null);
                }}
              />
              <ModeButton
                active={mode === "notifications"}
                label="Notifications"
                icon={<IconBell size={14} />}
                unreadCount={notificationUnreadCount}
                onClick={() => setMode("notifications")}
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="Close LSAT U assistant"
                >
                  <IconX size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>

          {mode === "chat" ? (
            <div className="flex shrink-0 items-center justify-between border-b border-border/30 py-1">
              <div ref={tabsScrollRef} className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 pl-2 pb-1 pt-0.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        tab.id === activeTabId
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 px-1.5 pb-1 pt-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={addTab}
                      className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      aria-label="New conversation"
                    >
                      <IconPlus size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">New conversation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      aria-label="Conversation history"
                    >
                      <IconHistory size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">History</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : null}

          {mode === "chat" ? (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {activeMessages.length === 0 && !thinking && !streamingContent ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <IconGavel className="mb-2 h-8 w-8 text-foreground/80" />
                    <p className="mb-1 text-lg font-semibold text-foreground">LSAT U</p>
                    <p className="max-w-[200px] text-xs">
                      Ask about question types, strategies, or your study plan.
                    </p>
                  </div>
                ) : null}

                {activeMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-muted/60 text-foreground",
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.role === "assistant" ? (
                        <div className="-mb-0.5 mt-1.5 flex items-center gap-0.5">
                          <CopyButton text={message.content} />
                          <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                            <IconThumbUp size={13} />
                          </button>
                          <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                            <IconThumbDown size={13} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {thinking || streamingContent ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                      {streamingContent ? (
                        <div className="whitespace-pre-wrap">{streamingContent}</div>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          Thinking
                          <ThinkingDots />
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 border-t border-border/30 px-3 py-3">
                <div className="flex items-end gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 py-2 transition-colors focus-within:border-border/70">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="How can I help?"
                    className="min-h-[20px] max-h-32 flex-1 resize-none bg-transparent py-0.5 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
                    style={{
                      height: "auto",
                      overflow: input.split("\n").length > 3 ? "auto" : "hidden",
                    }}
                    onInput={(event) => {
                      const element = event.currentTarget;
                      element.style.height = "auto";
                      element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || thinking}
                    className={cn(
                      "mb-0.5 shrink-0 rounded-lg p-1.5 transition-colors",
                      input.trim() && !thinking
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "cursor-not-allowed text-muted-foreground",
                    )}
                    aria-label="Send message"
                  >
                    <IconSend size={15} />
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {mode === "inbox" ? (
            <div className="min-h-0 flex-1 overflow-hidden bg-[#fffdf8]">
              {inboxLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : activeInboxConversation ? (
                <ConversationView
                  conversation={activeInboxConversation}
                  onMessageSent={() => void refreshInbox()}
                  hideHeader
                  compact
                  studentFacing
                  emptyStateLabel="No messages yet. Send Joshua a message here."
                />
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="rounded-full bg-[#203024]/8 p-3 text-[#203024]">
                      <IconInbox size={20} />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-[#211b16]">
                      No messages yet. Send Joshua a message here.
                    </div>
                    <div className="mt-1 max-w-[260px] text-xs leading-5 text-[#7a6b58]">
                      This is your real 1:1 thread. The first message will create the conversation and keep future replies in this panel.
                    </div>
                    {inboxNotice ? (
                      <div className="mt-4 rounded-2xl border border-[#eadfcf] bg-white px-4 py-3 text-xs text-[#7a6b58]">
                        {inboxNotice}
                      </div>
                    ) : null}
                    {startingInbox ? (
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#7a6b58]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Preparing your thread...
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 border-t border-[#eadfcf] bg-[#fffaf2]/90 backdrop-blur-md">
                    <MessageComposer
                      conversationId={null}
                      onResolveConversation={handleResolveInboxConversation}
                      onConversationResolved={(conversationId) => {
                        setActiveInboxId(conversationId);
                        void refreshInbox();
                      }}
                      onSent={() => void refreshInbox()}
                      studentFacing
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {mode === "notifications" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="flex items-center justify-between border-b border-border/30 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span>
                  {notificationUnreadCount > 0
                    ? `${notificationUnreadCount} unread`
                    : "Everything new lands here"}
                </span>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={notificationUnreadCount === 0}
                  className="font-semibold hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  Mark all read
                </button>
              </div>

              {selectedNotification ? (
                <div className="m-3 rounded-2xl border border-[#eadfcf] bg-[#fffaf2] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a8160]">
                    Notification detail
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#211b16]">
                    {selectedNotification.title}
                  </div>
                  {selectedNotification.body ? (
                    <div className="mt-1 text-xs leading-5 text-[#7a6b58]">
                      {selectedNotification.body}
                    </div>
                  ) : null}
                  <div className="mt-2 text-[11px] text-[#9a8160]">
                    {formatRelativeShort(selectedNotification.created_at)}
                  </div>
                  <div className="mt-3 text-xs text-[#7a6b58]">
                    This notification does not open a destination yet.
                  </div>
                </div>
              ) : null}

              <NotificationsList
                notifications={notifications}
                unreadCount={notificationUnreadCount}
                loading={notificationsLoading}
                error={notificationsError}
                onNotificationClick={(notification) => void handleOpenNotification(notification)}
                emptyLabel="No notifications yet."
                showHeader={false}
                compact
              />
            </div>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
