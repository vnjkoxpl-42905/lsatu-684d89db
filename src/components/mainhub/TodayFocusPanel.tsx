import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  ClipboardList,
  MessageSquare,
  RotateCcw,
  Signal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";
import { useInbox, type Conversation } from "@/hooks/useInbox";
import { useLastActivity } from "@/hooks/useLastActivity";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type AssignmentStatus,
  type StudentAssignment,
  type StudentTAAssignment,
  type TAAssignmentStatus,
} from "@/hooks/useStudentAssignments";
import {
  listAssignmentsForStudent,
  type GuidedDrill,
  type GuidedDrillAssignment,
} from "@/lib/guidedDrills";
import { resolveItemRoute } from "@/lib/classroomItems";
import {
  labelFor,
  resolveResumeTarget,
  type LastActivityRow,
} from "@/lib/lastActivity";
import { cn } from "@/lib/utils";

type GuidedAssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

type TodayFocusType =
  | "assignment"
  | "message"
  | "bootcamp"
  | "set"
  | "drill"
  | "notification";

type TodayActionLabel = "Start" | "Continue" | "Reply" | "Resume" | "Review" | "Practice" | "Open";

interface TodayFocusItem {
  id: string;
  type: TodayFocusType;
  title: string;
  sourceLine: string;
  status?: string;
  actionLabel: TodayActionLabel;
  actionCue?: string;
  route?: string | null;
  routeState?: unknown;
  priority: number;
  preview?: string;
  progress?: string;
  estimatedTime?: string;
  updatedAt?: string;
  Icon: React.ElementType;
  onOpen?: () => void | Promise<void>;
}

const ACTION_BY_STATUS: Record<string, TodayActionLabel> = {
  assigned: "Start",
  in_progress: "Continue",
  viewed: "Continue",
  read: "Continue",
  started: "Continue",
  completed: "Review",
  draft: "Open",
  archived: "Open",
};

const STATUS_LABEL: Record<AssignmentStatus | TAAssignmentStatus | ClassroomItem["status"], string> = {
  assigned: "Ready",
  in_progress: "In progress",
  viewed: "In progress",
  completed: "Done",
  draft: "Draft",
  archived: "Archived",
};

const TYPE_TONE: Record<TodayFocusType, string> = {
  assignment: "from-slate-950 via-sky-950 to-slate-950",
  message: "from-slate-950 via-teal-950 to-slate-950",
  bootcamp: "from-zinc-950 via-slate-900 to-slate-950",
  set: "from-slate-950 via-blue-950 to-zinc-950",
  drill: "from-zinc-950 via-emerald-950 to-slate-950",
  notification: "from-zinc-950 via-amber-950 to-slate-950",
};

function compactText(text: string | null | undefined, max = 92) {
  const value = text?.replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function dueLabel(dueAt: string | null | undefined) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return isToday(date) ? "Due today" : `Due ${format(date, "MMM d")}`;
}

function statusOrder(status?: string) {
  if (status === "In progress") return 0;
  if (status === "Ready") return 1;
  if (status === "Done") return 3;
  return 2;
}

function itemSort(a: TodayFocusItem, b: TodayFocusItem) {
  const priorityDelta = b.priority - a.priority;
  if (priorityDelta !== 0) return priorityDelta;
  const statusDelta = statusOrder(a.status) - statusOrder(b.status);
  if (statusDelta !== 0) return statusDelta;
  return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
}

function isActiveStatus(status: string) {
  return status === "assigned" || status === "in_progress" || status === "viewed" || status === "read" || status === "started";
}

function classroomItemToFocus(item: ClassroomItem): TodayFocusItem | null {
  if (!isActiveStatus(item.status)) return null;
  const route = resolveItemRoute(item);
  const due = dueLabel(item.due_at);
  const type: TodayFocusType = item.type === "bootcamp_module" ? "bootcamp" : "assignment";
  const isPlan = item.type === "weekly_plan_task";
  return {
    id: `classroom-${item.id}`,
    type,
    title: item.title,
    sourceLine:
      item.type === "bootcamp_module"
        ? "Bootcamp progress"
        : isPlan
          ? "Assigned in your study plan"
          : "Assigned by Joshua",
    status: due ?? STATUS_LABEL[item.status] ?? "Ready",
    actionLabel: ACTION_BY_STATUS[item.status] ?? "Open",
    actionCue: due ?? undefined,
    route,
    priority: 900 + item.priority,
    updatedAt: item.due_at ?? item.created_at,
    preview: compactText(item.description, 110) ?? undefined,
    Icon: item.type === "bootcamp_module" || isPlan ? BookOpenCheck : ClipboardList,
  };
}

function homeworkToFocus(a: StudentAssignment): TodayFocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  const questionCount = a.question_qids?.length ?? 0;
  return {
    id: `homework-${a.id}`,
    type: "assignment",
    title: a.set_title || "Homework",
    sourceLine: "Assigned by Joshua",
    status: STATUS_LABEL[a.status],
    actionLabel: ACTION_BY_STATUS[a.status],
    actionCue: questionCount > 0 ? `${questionCount} questions` : undefined,
    route: `/classroom/${encodeURIComponent(a.id)}`,
    priority: 820,
    progress: a.score != null ? `${Math.round(a.score)}%` : undefined,
    updatedAt: a.created_at,
    preview: compactText(a.set_description, 110) ?? undefined,
    Icon: ClipboardList,
  };
}

function taToFocus(a: StudentTAAssignment): TodayFocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  return {
    id: `ta-${a.id}`,
    type: "assignment",
    title: a.title || "Instructor assignment",
    sourceLine: a.pdf_url ? "Assigned by Joshua" : "Assigned by Joshua",
    status: STATUS_LABEL[a.status],
    actionLabel: ACTION_BY_STATUS[a.status],
    actionCue: a.pdf_url ? "PDF" : undefined,
    route: `/classroom/ta/${encodeURIComponent(a.id)}`,
    priority: 840,
    updatedAt: a.assigned_at || a.created_at,
    Icon: BookOpenCheck,
  };
}

function guidedToFocus(a: GuidedAssignmentWithDrill): TodayFocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  const count = a.guided_drill?.question_count;
  const minutes = a.guided_drill?.estimated_minutes;
  return {
    id: `guided-${a.id}`,
    type: "assignment",
    title: a.guided_drill?.title || "Guided drill",
    sourceLine: "Assigned guided practice",
    status: a.status === "assigned" ? "Ready" : "In progress",
    actionLabel: ACTION_BY_STATUS[a.status] ?? "Open",
    actionCue: minutes ? `${minutes} min` : count != null ? `${count} questions` : undefined,
    estimatedTime: minutes ? `${minutes} min` : undefined,
    route: `/guided/${encodeURIComponent(a.id)}?returnTo=${encodeURIComponent("/mainhub")}`,
    priority: 830,
    updatedAt: a.assigned_at,
    Icon: ClipboardList,
  };
}

function instructorMessageToFocus(c: Conversation): TodayFocusItem | null {
  if (!c.unread || !c.last_message) return null;
  const fromInstructor = c.participants.some((p) => p.is_admin && p.user_id === c.last_message?.sender_id);
  if (!fromInstructor) return null;
  return {
    id: `conversation-${c.id}`,
    type: "message",
    title: c.subject || "Message from Joshua",
    sourceLine: "Message from Joshua",
    status: "New",
    actionLabel: "Reply",
    actionCue: "New",
    route: `/inbox/${encodeURIComponent(c.id)}`,
    priority: 700,
    preview: compactText(c.last_message.body, 92) ?? undefined,
    updatedAt: c.last_message.created_at,
    Icon: MessageSquare,
  };
}

function notificationToFocus(n: Notification, markRead: (id: string) => Promise<void>): TodayFocusItem | null {
  if (n.read || n.type === "message") return null;
  return {
    id: `notification-${n.id}`,
    type: "notification",
    title: n.title,
    sourceLine: n.type === "assignment" ? "Assigned by Joshua" : "Notification",
    status: "New",
    actionLabel: n.link ? "Open" : "Review",
    actionCue: n.type === "assignment" ? "New" : undefined,
    route: n.link,
    priority: n.type === "assignment" ? 760 : 220,
    preview: compactText(n.body, 100) ?? undefined,
    updatedAt: n.created_at,
    Icon: n.type === "assignment" ? ClipboardList : Bell,
    onOpen: () => markRead(n.id),
  };
}

function lastActivityToFocus(row: LastActivityRow | null | undefined): TodayFocusItem | null {
  if (!row) return null;
  const snapshot = row.state_snapshot;
  const target = resolveResumeTarget(snapshot);
  const label = labelFor(snapshot);
  if (snapshot.kind === "bootcamp_step") {
    return {
      id: `last-${row.activity_id}`,
      type: "bootcamp",
      title: label,
      sourceLine: "Bootcamp progress",
      status: "In progress",
      actionLabel: "Continue",
      route: target.path,
      routeState: target.state,
      priority: 520,
      updatedAt: row.updated_at,
      Icon: BookOpenCheck,
    };
  }

  const total = snapshot.qids.length;
  const left = Math.max(0, total - snapshot.current_index);
  const progress = total > 0 ? `${Math.min(100, Math.round((snapshot.current_index / total) * 100))}%` : undefined;
  return {
    id: `last-${row.activity_id}`,
    type: snapshot.kind === "section" ? "set" : "drill",
    title: label,
    sourceLine: snapshot.kind === "section" ? "Active practice set" : "Unfinished drill",
    status: "In progress",
    actionLabel: "Resume",
    actionCue: left > 0 ? `${left} left` : undefined,
    route: target.path,
    routeState: target.state,
    priority: snapshot.kind === "section" ? 480 : 460,
    progress,
    updatedAt: row.updated_at,
    Icon: snapshot.kind === "section" ? Signal : RotateCcw,
  };
}

function visibleRails(items: TodayFocusItem[], primaryId: string | null) {
  return items.filter((item) => item.id !== primaryId).slice(0, 2);
}

export default function TodayFocusPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const {
    data: classroomItems = [],
    isLoading: classroomLoading,
    isError: classroomError,
  } = useClassroomItems();
  const { assignments: homework, loading: homeworkLoading, error: homeworkError } = useStudentAssignments();
  const { assignments: taAssignments, loading: taLoading, error: taError } = useStudentTAAssignments();
  const { notifications, loading: notificationsLoading, error: notificationsError, markRead } = useNotifications();
  const { conversations, loading: inboxLoading } = useInbox();
  const {
    data: lastActivity = null,
    isLoading: lastActivityLoading,
    isError: lastActivityError,
  } = useLastActivity();
  const {
    data: guided = [],
    isLoading: guidedLoading,
    isError: guidedError,
  } = useQuery<GuidedAssignmentWithDrill[]>({
    queryKey: ["guided-drill-assignments", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => (
      await listAssignmentsForStudent(user!.id) as GuidedAssignmentWithDrill[]
    ),
  });

  const focusItems = React.useMemo(() => {
    const seenSourceIds = new Set<string>();
    const fromClassroom = classroomItems
      .map(classroomItemToFocus)
      .filter((item): item is TodayFocusItem => item !== null);

    for (const item of classroomItems) {
      if (item.source_id) seenSourceIds.add(item.source_id);
    }

    const fromHomework = homework
      .filter((a) => !seenSourceIds.has(a.id))
      .map(homeworkToFocus)
      .filter((item): item is TodayFocusItem => item !== null);
    const fromTa = taAssignments
      .filter((a) => !seenSourceIds.has(a.id))
      .map(taToFocus)
      .filter((item): item is TodayFocusItem => item !== null);
    const fromGuided = guided
      .filter((a) => !seenSourceIds.has(a.id))
      .map(guidedToFocus)
      .filter((item): item is TodayFocusItem => item !== null);
    const fromNotifications = notifications
      .map((n) => notificationToFocus(n, markRead))
      .filter((item): item is TodayFocusItem => item !== null);
    const fromMessages = conversations
      .map(instructorMessageToFocus)
      .filter((item): item is TodayFocusItem => item !== null);
    const fromLastActivity = lastActivityToFocus(lastActivity);

    const byId = new Map<string, TodayFocusItem>();
    for (const item of [
      ...fromClassroom,
      ...fromTa,
      ...fromGuided,
      ...fromHomework,
      ...fromNotifications,
      ...fromMessages,
      ...(fromLastActivity ? [fromLastActivity] : []),
    ]) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values()).sort(itemSort);
  }, [classroomItems, conversations, guided, homework, lastActivity, markRead, notifications, taAssignments]);

  React.useEffect(() => {
    if (selectedId && !focusItems.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [focusItems, selectedId]);

  const loading =
    classroomLoading ||
    homeworkLoading ||
    taLoading ||
    guidedLoading ||
    notificationsLoading ||
    inboxLoading ||
    lastActivityLoading;
  const hasError =
    classroomError ||
    !!homeworkError ||
    !!taError ||
    !!notificationsError ||
    guidedError ||
    lastActivityError;
  const primary = focusItems.find((item) => item.id === selectedId) ?? focusItems[0] ?? null;
  const rails = primary ? visibleRails(focusItems, primary.id) : [];

  const openItem = React.useCallback(
    async (item: TodayFocusItem) => {
      await item.onOpen?.();
      if (item.route) {
        navigate(item.route, item.routeState ? { state: item.routeState } : undefined);
      }
    },
    [navigate],
  );

  return (
    <section
      aria-label="Today"
      className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.16)]"
    >
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(148,163,184,0.24),transparent_32%),linear-gradient(180deg,#151b24,#080b11)] p-4 text-white sm:p-5">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-300">
              TODAY
            </p>
            <time className="font-mono text-[11px] font-medium text-slate-400" dateTime={format(new Date(), "yyyy-MM-dd")}>
              {format(new Date(), "MMM d")}
            </time>
          </div>

          {loading ? (
            <TodaySkeleton />
          ) : hasError ? (
            <TodayErrorState />
          ) : primary ? (
            <div aria-live="polite">
              <TodayPrimarySurface
                item={primary}
                expanded={expanded}
                onToggle={() => setExpanded((value) => !value)}
                onActivate={() => void openItem(primary)}
              />
              <div className="mt-3 grid gap-2">
                {rails.map((item) => (
                  <TodayRailItem
                    key={item.id}
                    item={item}
                    muted={expanded}
                    onPromote={() => {
                      setSelectedId(item.id);
                      setExpanded(false);
                    }}
                  />
                ))}
                {rails.length === 0 && <EmptyRailQuiet />}
              </div>
            </div>
          ) : (
            <TodayEmptyState />
          )}
        </div>
      </div>
    </section>
  );
}

function TodayPrimarySurface({
  item,
  expanded,
  onToggle,
  onActivate,
}: {
  item: TodayFocusItem;
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
}) {
  const Icon = item.Icon;
  return (
    <motion.div
      layout
      className={cn(
        "group relative min-h-[238px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_55px_rgba(0,0,0,0.28)]",
        TYPE_TONE[item.type],
      )}
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_24%_70%,rgba(125,211,252,0.12),transparent_32%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:34px_34px]" />
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="relative flex min-h-[168px] w-full flex-col items-start text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              Next up
            </p>
            <div className="mt-2 flex items-center gap-2">
              {item.status && (
                <span className="rounded-full border border-white/15 bg-white/[0.08] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                  {item.status}
                </span>
              )}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-slate-200">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </div>
          {item.progress && (
            <span className="font-mono text-[11px] font-semibold text-slate-300">{item.progress}</span>
          )}
        </div>

        <div className="mt-auto max-w-[28rem] pb-4 pt-7">
          <h2 className="text-xl font-semibold leading-tight tracking-normal text-white sm:text-2xl">
            {item.title}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-300">{item.sourceLine}</p>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 space-y-2 text-sm leading-6 text-slate-300"
              >
                <p>{contextLineFor(item)}</p>
                {item.preview && <p className="line-clamp-2 text-slate-200">{item.type === "message" ? `"${item.preview}"` : item.preview}</p>}
                {(item.estimatedTime || item.progress) && (
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    {[item.estimatedTime, item.progress].filter(Boolean).join(" / ")}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onActivate();
        }}
        disabled={!item.route && !item.onOpen}
        className="relative -mx-5 -mb-5 mt-1 flex w-[calc(100%+2.5rem)] items-center justify-between border-t border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-semibold text-white transition duration-300 hover:bg-white/[0.13] active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-500"
      >
        <span>{actionText(item)}</span>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
          {item.actionCue}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </button>
    </motion.div>
  );
}

function TodayRailItem({
  item,
  muted,
  onPromote,
}: {
  item: TodayFocusItem;
  muted: boolean;
  onPromote: () => void;
}) {
  const Icon = item.Icon;
  return (
    <motion.button
      type="button"
      layout
      onClick={onPromote}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]",
        muted && "opacity-60",
      )}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-slate-200">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{railTitle(item)}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{item.sourceLine}</span>
      </span>
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        {item.status ?? item.actionLabel}
      </span>
    </motion.button>
  );
}

function TodaySkeleton() {
  return (
    <div aria-label="Loading today" className="animate-pulse">
      <div className="min-h-[238px] rounded-[24px] border border-white/10 bg-white/[0.07] p-5">
        <div className="h-3 w-20 rounded-full bg-white/15" />
        <div className="mt-7 h-8 w-3/4 rounded-full bg-white/15" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-white/10" />
        <div className="-mx-5 -mb-5 mt-20 h-12 border-t border-white/10 bg-white/[0.06]" />
      </div>
      <div className="mt-3 grid gap-2">
        <div className="h-[58px] rounded-2xl border border-white/10 bg-white/[0.06]" />
        <div className="h-[58px] rounded-2xl border border-white/10 bg-white/[0.06]" />
      </div>
    </div>
  );
}

function TodayEmptyState() {
  return (
    <div aria-live="polite">
      <div className="relative min-h-[238px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_65%_20%,rgba(148,163,184,0.18),transparent_30%)]" />
        <div className="relative flex min-h-[198px] flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              Next up
            </p>
            <h2 className="mt-8 text-2xl font-semibold tracking-normal text-white">
              All caught up
            </h2>
            <p className="mt-2 text-sm text-slate-300">Nothing assigned for today.</p>
          </div>
          <div className="border-t border-white/10 pt-4 text-xs font-medium text-slate-500">
            Assigned work and instructor messages will appear here when they exist.
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <EmptyRailQuiet />
      </div>
    </div>
  );
}

function TodayErrorState() {
  return (
    <div>
      <div className="min-h-[238px] rounded-[24px] border border-white/10 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
          Next up
        </p>
        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-normal text-white">Couldn&apos;t load today.</h2>
          <p className="mt-2 text-sm text-slate-400">Refresh the page to try again.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-400">
          Today is temporarily unavailable.
        </div>
      </div>
    </div>
  );
}

function EmptyRailQuiet() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-500">
      No secondary focus items.
    </div>
  );
}

function contextLineFor(item: TodayFocusItem) {
  if (item.type === "message") return "This is next because Joshua sent an unread message.";
  if (item.type === "bootcamp") return "This is next because you have bootcamp progress in motion.";
  if (item.type === "drill" || item.type === "set") return "This is next because you have unfinished practice.";
  if (item.type === "notification") return "This is next because a new notification is waiting.";
  return "This is next because it is assigned work.";
}

function actionText(item: TodayFocusItem) {
  if (item.actionLabel === "Start" && item.type === "bootcamp") return "Start lesson";
  if (item.actionLabel === "Practice") return "Practice";
  if (item.actionLabel === "Resume") return "Resume drill";
  return item.actionLabel;
}

function railTitle(item: TodayFocusItem) {
  if (item.type === "message") return "Message from Joshua";
  if (item.type === "drill") return "Smart LR Drill";
  if (item.type === "bootcamp") return "Bootcamp Lesson";
  return item.title;
}
