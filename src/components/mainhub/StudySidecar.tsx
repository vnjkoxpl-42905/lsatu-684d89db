import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconBell,
  IconCopy,
  IconInbox,
  IconMessageCircle,
  IconPlus,
  IconSend,
  IconSparkles,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from "@tabler/icons-react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileUp,
  GraduationCap,
  Loader2,
  NotebookPen,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type UserPermissions } from "@/hooks/useUserPermissions";
import { useStudyChat } from "@/hooks/useStudyChat";
import { toast } from "sonner";
import { useInbox, type Conversation } from "@/hooks/useInbox";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type StudentAssignment,
  type StudentTAAssignment,
} from "@/hooks/useStudentAssignments";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import { ConversationView } from "@/components/inbox/ConversationView";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { ThreadList, ThreadListSkeleton } from "@/components/inbox/ThreadList";
import { needsReply, otherParticipantName } from "@/components/inbox/inboxDisplay";
import SidecarGmailPanel from "@/components/mainhub/SidecarGmailPanel";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeShort } from "@/lib/time";

interface StudySidecarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  presentation?: "floating" | "docked";
  width?: number;
}

type SidecarMode = "chat" | "tasks" | "partner" | "inbox" | "notifications";
type AdminMessageView = "priority" | "needs_reply" | "unread" | "attachments" | "all";

interface AdminMessageSection {
  id: string;
  label: string;
  conversations: Conversation[];
}

const ACTIVE_CLASSROOM_STATUSES = new Set<ClassroomItem["status"]>(["assigned", "in_progress"]);
const ACTIVE_HOMEWORK_STATUSES = new Set<StudentAssignment["status"]>(["assigned", "in_progress"]);
const ACTIVE_TA_STATUSES = new Set<StudentTAAssignment["status"]>(["assigned", "viewed"]);
const ADMIN_MESSAGE_VIEW_LABELS: Record<AdminMessageView, string> = {
  priority: "Priority",
  needs_reply: "Needs reply",
  unread: "Unread",
  attachments: "With files",
  all: "All threads",
};
const ADMIN_MESSAGE_EMPTY_LABELS: Record<AdminMessageView, string> = {
  priority: "No student threads yet.",
  needs_reply: "Nothing is waiting on you right now.",
  unread: "No unread student threads right now.",
  attachments: "No student threads with files right now.",
  all: "No student threads yet.",
};

function compactText(text: string | null | undefined, max = 88) {
  const value = text?.replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function dueText(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

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

function sortConversationsByLastMessage(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );
}

function buildAdminMessageSections(
  conversations: Conversation[],
  ownId: string,
  view: AdminMessageView,
): AdminMessageSection[] {
  const sorted = sortConversationsByLastMessage(conversations);

  if (view === "all") {
    return sorted.length > 0 ? [{ id: "all", label: "All threads", conversations: sorted }] : [];
  }

  if (view === "needs_reply") {
    return [
      {
        id: "needs_reply",
        label: "Needs reply",
        conversations: sorted.filter((conversation) => needsReply(conversation, ownId)),
      },
    ].filter((section) => section.conversations.length > 0);
  }

  if (view === "unread") {
    return [
      {
        id: "unread",
        label: "Unread",
        conversations: sorted.filter((conversation) => conversation.unread),
      },
    ].filter((section) => section.conversations.length > 0);
  }

  if (view === "attachments") {
    return [
      {
        id: "attachments",
        label: "With files",
        conversations: sorted.filter((conversation) => conversation.hasAttachments),
      },
    ].filter((section) => section.conversations.length > 0);
  }

  const needsReplyThreads: Conversation[] = [];
  const unreadThreads: Conversation[] = [];
  const attachmentThreads: Conversation[] = [];
  const recentThreads: Conversation[] = [];

  sorted.forEach((conversation) => {
    if (conversation.unread) {
      unreadThreads.push(conversation);
      return;
    }
    if (needsReply(conversation, ownId)) {
      needsReplyThreads.push(conversation);
      return;
    }
    if (conversation.hasAttachments) {
      attachmentThreads.push(conversation);
      return;
    }
    recentThreads.push(conversation);
  });

  return [
    { id: "needs_reply", label: "Needs reply", conversations: needsReplyThreads },
    { id: "unread", label: "Unread", conversations: unreadThreads },
    { id: "attachments", label: "With files", conversations: attachmentThreads },
    { id: "recent", label: "Recent", conversations: recentThreads },
  ].filter((section) => section.conversations.length > 0);
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
      title={label}
      aria-label={unreadCount > 0 ? `${label}, ${unreadCount} unread` : label}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-[#18181b] text-white shadow-sm"
          : "text-zinc-500 hover:bg-white hover:text-zinc-900",
      )}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      {active ? <span>{label}</span> : null}
      {unreadCount > 0 ? (
        <span className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
          active ? "bg-white text-[#18181b]" : "bg-[#18181b] text-white",
        )}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function StudyChatPanel({
  open,
  active,
  userName,
  header,
  empty,
  placeholder,
}: {
  open: boolean;
  active: boolean;
  userName?: string;
  header?: { title: string; subtitle: string };
  empty: { icon: ReactNode; title: string; subtitle: string };
  placeholder: string;
}) {
  const { addTab, activeMessages, thinking, streamingContent, send } = useStudyChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, streamingContent, active]);

  useEffect(() => {
    if (open && active) {
      const timer = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(timer);
    }
  }, [open, active]);

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

  return (
    <>
      {header ? (
        <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{header.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">{header.subtitle}</div>
          </div>
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
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {activeMessages.length === 0 && !thinking && !streamingContent ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-2 text-foreground/80" aria-hidden>
              {empty.icon}
            </div>
            <p className="mb-1 text-lg font-semibold text-foreground">{empty.title}</p>
            <p className="max-w-[220px] text-xs">{empty.subtitle}</p>
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
            placeholder={placeholder}
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
  );
}

interface TaskRow {
  id: string;
  title: string;
  eyebrow: string;
  description?: string | null;
  meta?: string | null;
  route: string;
  icon: LucideIcon;
}

function classroomTaskRow(item: ClassroomItem): TaskRow | null {
  if (!ACTIVE_CLASSROOM_STATUSES.has(item.status)) return null;
  const route = resolveItemRoute(item);
  if (!route) return null;
  return {
    id: `classroom-${item.id}`,
    title: item.title,
    eyebrow: item.type === "bootcamp_module" ? "Bootcamp" : "Assigned by Joshua",
    description: compactText(item.description),
    meta: dueText(item.due_at) ?? (item.status === "in_progress" ? "In progress" : "Ready"),
    route,
    icon: item.type === "bootcamp_module" ? BookOpen : ClipboardList,
  };
}

function homeworkTaskRow(assignment: StudentAssignment): TaskRow | null {
  if (!ACTIVE_HOMEWORK_STATUSES.has(assignment.status)) return null;
  return {
    id: `homework-${assignment.id}`,
    title: assignment.set_title || "Homework",
    eyebrow: "Homework",
    description: compactText(assignment.set_description),
    meta:
      assignment.question_qids?.length > 0
        ? `${assignment.question_qids.length} questions`
        : assignment.status === "in_progress"
          ? "In progress"
          : "Ready",
    route: `/classroom/${encodeURIComponent(assignment.id)}`,
    icon: ClipboardList,
  };
}

function taTaskRow(assignment: StudentTAAssignment): TaskRow | null {
  if (!ACTIVE_TA_STATUSES.has(assignment.status)) return null;
  return {
    id: `ta-${assignment.id}`,
    title: assignment.title || "Instructor assignment",
    eyebrow: "From Joshua",
    description: assignment.pdf_url ? "PDF assignment" : null,
    meta: assignment.status === "viewed" ? "In progress" : "Ready",
    route: `/classroom/ta/${encodeURIComponent(assignment.id)}`,
    icon: GraduationCap,
  };
}

function TaskCard({
  row,
  featured = false,
  onOpen,
}: {
  row: TaskRow;
  featured?: boolean;
  onOpen: (route: string) => void;
}) {
  const Icon = row.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(row.route)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border text-left transition hover:border-zinc-300 hover:bg-white",
        featured
          ? "border-zinc-200 bg-white px-3.5 py-3 shadow-sm"
          : "border-transparent bg-zinc-50 px-3 py-2.5",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {row.eyebrow}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-zinc-900">
          {row.title}
        </span>
        {row.description || row.meta ? (
          <span className="mt-0.5 block truncate text-xs text-zinc-500">
            {[row.description, row.meta].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:text-zinc-700" aria-hidden />
    </button>
  );
}

function StudentTasksPanel({
  permissions,
  notifications,
  notificationsLoading,
  notificationsError,
  onNotificationClick,
}: {
  permissions: UserPermissions;
  notifications: Notification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  onNotificationClick: (notification: Notification) => void;
}) {
  const navigate = useNavigate();
  const { data: classroomItems = [], isLoading: classroomLoading } = useClassroomItems();
  const { assignments: homeworkAssignments, loading: homeworkLoading } = useStudentAssignments();
  const { assignments: taAssignments, loading: taLoading } = useStudentTAAssignments();

  const nextItem = nextActionFor(classroomItems);
  const nextRow = nextItem ? classroomTaskRow(nextItem) : null;
  const classroomRows = classroomItems
    .map(classroomTaskRow)
    .filter((row): row is TaskRow => Boolean(row));
  const fallbackRows =
    classroomRows.length === 0
      ? [
          ...homeworkAssignments.map(homeworkTaskRow),
          ...taAssignments.map(taTaskRow),
        ].filter((row): row is TaskRow => Boolean(row))
      : [];
  const assignedRows = (classroomRows.length > 0 ? classroomRows : fallbackRows)
    .filter((row) => row.id !== nextRow?.id)
    .slice(0, 5);
  const taskLoading = classroomLoading || homeworkLoading || taLoading;
  const updates = notifications
    .filter((notification) => notification.title || notification.link)
    .slice(0, 4);

  const commands = [
    { label: "Assigned work", route: "/classroom", icon: ClipboardList, show: permissions.has_classroom_access },
    { label: "Schedule", route: "/schedule", icon: CalendarDays, show: permissions.has_schedule_access },
    { label: "Drill", route: "/classroom/drill", icon: RotateCcw, show: permissions.has_drill_access },
    { label: "Activity Centre", route: "/activities", icon: Activity, show: permissions.has_activity_access },
    { label: "Upload work", route: "/classroom/uploads", icon: FileUp, show: permissions.has_classroom_access },
    { label: "Recaps", route: "/classroom/recaps", icon: CheckCircle2, show: permissions.has_classroom_access },
    { label: "Journal", route: "/waj", icon: NotebookPen, show: permissions.has_journal_access || permissions.has_waj_access },
  ].filter((command) => command.show);

  const openRoute = (route: string) => navigate(route);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-white px-3 py-2.5">
        <div>
          <div className="text-sm font-semibold text-foreground">Tasks</div>
          <div className="text-[11px] text-muted-foreground">Assigned work and quick actions.</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Do this next
          </div>
          {taskLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading tasks...
            </div>
          ) : nextRow ? (
            <TaskCard row={nextRow} featured onOpen={openRoute} />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500">
              Nothing urgent right now.
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Assigned
          </div>
          {assignedRows.length > 0 ? (
            <div className="space-y-2">
              {assignedRows.map((row) => (
                <TaskCard key={row.id} row={row} onOpen={openRoute} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500">
              No other assigned work.
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Commands
          </div>
          <div className="grid grid-cols-2 gap-2">
            {commands.map((command) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.route}
                  type="button"
                  onClick={() => openRoute(command.route)}
                  className="flex min-h-[72px] flex-col justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
                  <span>{command.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Updates
          </div>
          {notificationsLoading ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500">
              Loading updates...
            </div>
          ) : notificationsError ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500">
              {notificationsError}
            </div>
          ) : updates.length > 0 ? (
            <div className="space-y-2">
              {updates.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className={cn(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50",
                    !notification.read && "border-zinc-300",
                  )}
                >
                  <div className="truncate text-sm font-semibold text-zinc-900">
                    {notification.title}
                  </div>
                  {notification.body ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {notification.body}
                    </div>
                  ) : null}
                  <div className="mt-1 text-[11px] text-zinc-400">
                    {formatRelativeShort(notification.created_at)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500">
              No updates yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StudySidecar({
  open,
  onClose,
  userName,
  presentation = "floating",
  width,
}: StudySidecarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const { is_admin } = permissions;
  const {
    conversations,
    loading: inboxLoading,
    unreadCount: inboxUnreadTotal,
    refresh: refreshInbox,
    deleteConversation,
  } = useInbox();
  const {
    notifications,
    unreadCount: notificationUnreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markRead,
    markAllRead,
  } = useNotifications();

  const [mode, setMode] = useState<SidecarMode>("chat");
  const [activeInboxId, setActiveInboxId] = useState<string | null>(null);
  const [adminMessageView, setAdminMessageView] = useState<AdminMessageView>("priority");
  const [startingInbox, setStartingInbox] = useState(false);
  const [inboxNotice, setInboxNotice] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const joshuaConversation = useMemo(
    () => resolveJoshuaConversation(conversations, user?.id),
    [conversations, user?.id],
  );
  const inboxUnreadCount = is_admin ? inboxUnreadTotal : joshuaConversation?.unread ? 1 : 0;
  const activeInboxConversation = useMemo(() => {
    if (activeInboxId) {
      return conversations.find((conversation) => conversation.id === activeInboxId) ?? null;
    }
    if (is_admin) return null;
    return joshuaConversation;
  }, [activeInboxId, conversations, is_admin, joshuaConversation]);

  useEffect(() => {
    // Students auto-open their single Joshua thread; admins land on the list
    // so they can pick which student to message.
    if (!is_admin && joshuaConversation && !activeInboxId) {
      setActiveInboxId(joshuaConversation.id);
    }
  }, [is_admin, activeInboxId, joshuaConversation]);

  useEffect(() => {
    if (activeInboxConversation) setInboxNotice(null);
  }, [activeInboxConversation]);

  const adminPickerSections = useMemo(() => {
    if (!is_admin || !user) return [];
    return buildAdminMessageSections(conversations, user.id, "priority");
  }, [conversations, is_admin, user]);

  const adminMessageSections = useMemo(() => {
    if (!is_admin || !user) return [];
    return buildAdminMessageSections(conversations, user.id, adminMessageView);
  }, [adminMessageView, conversations, is_admin, user]);

  const adminVisibleMessageCount = useMemo(
    () => adminMessageSections.reduce((count, section) => count + section.conversations.length, 0),
    [adminMessageSections],
  );

  const renderAdminChat = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white text-foreground">
      {activeInboxConversation ? (
        <>
          <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-white px-3 py-2.5">
            <button
              type="button"
              onClick={() => setActiveInboxId(null)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              aria-label="Back to conversations"
            >
              <IconInbox size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {activeInboxConversation.participants.find((participant) => participant.user_id !== user?.id)?.display_name
                  ?? activeInboxConversation.subject
                  ?? "Student thread"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">Student message thread</div>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-[#fbfbfa]">
            <ConversationView
              conversation={activeInboxConversation}
              onMessageSent={() => void refreshInbox()}
              hideHeader
              compact
            />
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 border-b border-border/40 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">Messages</div>
                <div className="text-[11px] text-muted-foreground">Pick a student to reply.</div>
              </div>
            </div>
            {conversations.length > 0 ? (
              <div className="mt-3 grid gap-2">
                <div className="grid gap-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    View
                  </div>
                  <Select
                    value={adminMessageView}
                    onValueChange={(value) => setAdminMessageView(value as AdminMessageView)}
                  >
                    <SelectTrigger
                      aria-label="Messages view"
                      className="h-10 rounded-2xl border-zinc-200 bg-[#faf8f3] text-sm font-semibold"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADMIN_MESSAGE_VIEW_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Choose student
                  </div>
                  <Select value={activeInboxId ?? undefined} onValueChange={setActiveInboxId}>
                    <SelectTrigger
                      aria-label="Choose student thread"
                      className="h-10 rounded-2xl border-zinc-200 bg-white text-left text-sm font-semibold"
                    >
                      <SelectValue placeholder="Jump to a student thread" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminPickerSections.map((section, sectionIndex) => (
                        <SelectGroup key={section.id}>
                          {sectionIndex > 0 ? <SelectSeparator /> : null}
                          <SelectLabel>{section.label}</SelectLabel>
                          {section.conversations.map((conversation) => {
                            const name = otherParticipantName(
                              conversation,
                              user?.id ?? "",
                              conversation.subject || "Student thread",
                            );
                            const preview =
                              compactText(
                                conversation.last_message?.body || conversation.subject || "Open thread",
                                52,
                              ) ?? "Open thread";
                            return (
                              <SelectItem key={conversation.id} value={conversation.id}>
                                <div className="flex flex-col">
                                  <span className="font-semibold">{name}</span>
                                  <span className="text-xs text-muted-foreground">{preview}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfbfa]">
            {inboxLoading ? (
              <ThreadListSkeleton count={5} />
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <IconInbox size={20} />
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">
                  No student messages yet
                </div>
                <div className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">
                  When a student starts a conversation, it will show up here and you can reply directly.
                </div>
              </div>
            ) : adminVisibleMessageCount === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <IconInbox size={20} />
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">
                  Nothing in this view
                </div>
                <div className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">
                  {ADMIN_MESSAGE_EMPTY_LABELS[adminMessageView]}
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-3 py-3">
                {adminMessageSections.map((section) => (
                  <section key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {section.label}
                      </div>
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        {section.conversations.length}
                      </div>
                    </div>
                    <ThreadList
                      conversations={section.conversations}
                      activeId={activeInboxId}
                      onSelect={setActiveInboxId}
                      variant="admin"
                      surface="light"
                      onDelete={handleDeleteConversation}
                    />
                  </section>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderStudentMessages = () => (
    <div className="min-h-0 flex-1 overflow-hidden bg-[#fafafa]">
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
            <div className="rounded-full bg-zinc-100 p-3 text-zinc-500">
              <IconInbox size={20} />
            </div>
            <div className="mt-4 text-sm font-semibold text-zinc-900">
              No messages yet. Send Joshua a message here.
            </div>
            <div className="mt-1 max-w-[260px] text-xs leading-5 text-zinc-500">
              This is your real 1:1 thread. The first message will create the conversation and keep future replies in this panel.
            </div>
            {inboxNotice ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
                {inboxNotice}
              </div>
            ) : null}
            {startingInbox ? (
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Preparing your thread...
              </div>
            ) : null}
          </div>
          <div className="shrink-0 border-t border-zinc-200 bg-white/92 backdrop-blur-md">
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
  );

  const handleDeleteConversation = async (conversationId: string) => {
    if (activeInboxId === conversationId) setActiveInboxId(null);
    try {
      await deleteConversation(conversationId);
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete conversation",
      );
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
      setMode("chat");
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

    setMode(is_admin ? "notifications" : "tasks");
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
            "hidden flex-col overflow-hidden bg-background/95 backdrop-blur-md md:flex",
            isDocked
              ? "relative h-full shrink-0 rounded-xl border border-border/40 shadow-sm shadow-black/5"
              : "fixed right-0 top-0 z-40 h-svh w-96 border-l border-border/40 shadow-2xl shadow-black/20",
          )}
          style={isDocked && width ? { width } : undefined}
          aria-label="LSAT U communication console"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-zinc-200 bg-[#f4f4f5] p-1">
              <ModeButton
                active={mode === "chat"}
                label="Messages"
                icon={<IconMessageCircle size={14} />}
                unreadCount={inboxUnreadCount}
                onClick={() => {
                  setMode("chat");
                  setSelectedNotification(null);
                }}
              />
              {is_admin ? (
                <>
                  <ModeButton
                    active={mode === "partner"}
                    label="Study Partner"
                    icon={<IconSparkles size={14} />}
                    onClick={() => {
                      setMode("partner");
                      setSelectedNotification(null);
                    }}
                  />
                  <ModeButton
                    active={mode === "inbox"}
                    label="Inbox"
                    icon={<IconInbox size={14} />}
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
                </>
              ) : (
                <ModeButton
                  active={mode === "tasks"}
                  label="Tasks"
                  icon={<IconBell size={14} />}
                  unreadCount={notificationUnreadCount}
                  onClick={() => {
                    setMode("tasks");
                    setSelectedNotification(null);
                  }}
                />
              )}
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
            is_admin ? (
              renderAdminChat()
            ) : (
              renderStudentMessages()
            )
          ) : null}

          {mode === "tasks" && !is_admin ? (
            <StudentTasksPanel
              permissions={permissions}
              notifications={notifications}
              notificationsLoading={notificationsLoading}
              notificationsError={notificationsError}
              onNotificationClick={(notification) => void handleOpenNotification(notification)}
            />
          ) : null}

          {mode === "partner" ? (
            <StudyChatPanel
              open={open}
              active={mode === "partner"}
              userName={userName}
              header={{ title: "Study Partner", subtitle: "Think out loud with AI" }}
              empty={{
                icon: <IconSparkles className="h-8 w-8" />,
                title: "Study Partner",
                subtitle: "Talk through an argument out loud. I'll play your study partner and push back on your reasoning.",
              }}
              placeholder="Walk me through how you'd attack this question..."
            />
          ) : null}

          {mode === "inbox" ? (
            is_admin ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                <SidecarGmailPanel />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-hidden bg-[#fafafa]">
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
                      <div className="rounded-full bg-zinc-100 p-3 text-zinc-500">
                        <IconInbox size={20} />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-zinc-900">
                        No messages yet. Send Joshua a message here.
                      </div>
                      <div className="mt-1 max-w-[260px] text-xs leading-5 text-zinc-500">
                        This is your real 1:1 thread. The first message will create the conversation and keep future replies in this panel.
                      </div>
                      {inboxNotice ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
                          {inboxNotice}
                        </div>
                      ) : null}
                      {startingInbox ? (
                        <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          Preparing your thread...
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 border-t border-zinc-200 bg-white/92 backdrop-blur-md">
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
            )
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
                <div className="m-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Notification detail
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-900">
                    {selectedNotification.title}
                  </div>
                  {selectedNotification.body ? (
                    <div className="mt-1 text-xs leading-5 text-zinc-500">
                      {selectedNotification.body}
                    </div>
                  ) : null}
                  <div className="mt-2 text-[11px] text-zinc-400">
                    {formatRelativeShort(selectedNotification.created_at)}
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
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
