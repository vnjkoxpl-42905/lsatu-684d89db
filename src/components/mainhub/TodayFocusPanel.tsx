import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  Inbox,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";
import { useInbox, type Conversation } from "@/hooks/useInbox";
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
import { formatRelativeShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type GuidedAssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

interface FocusItem {
  id: string;
  title: string;
  type: string;
  reason: string;
  status: string;
  action: string;
  route: string | null;
  createdAt: string;
  dueAt?: string | null;
  priority: number;
  progress?: number;
  Icon: React.ElementType;
  onOpen?: () => void | Promise<void>;
}

const STATUS_LABEL: Record<AssignmentStatus | TAAssignmentStatus | ClassroomItem["status"], string> = {
  assigned: "Not started",
  in_progress: "In progress",
  viewed: "In progress",
  completed: "Done",
  draft: "Draft",
  archived: "Archived",
};

const ACTION_BY_STATUS: Record<string, string> = {
  assigned: "Start",
  in_progress: "Continue",
  viewed: "Continue",
  read: "Continue",
  started: "Continue",
  completed: "Review",
  draft: "Open",
  archived: "Open",
};

const CLASSROOM_TYPE_LABEL: Record<ClassroomItem["type"], string> = {
  drill: "Classroom drill",
  homework: "Homework",
  activity: "Activity",
  bootcamp_module: "Bootcamp",
  note: "Classroom note",
  session_recap: "Session recap",
  announcement: "Announcement",
  upload_summary: "Classroom upload",
  weekly_plan_task: "Study plan",
  smartboard_recap: "Board recap",
};

function compactDescription(text: string | null | undefined, fallback: string) {
  const value = text?.replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

function statusOrder(status: string) {
  if (status === "in_progress" || status === "viewed") return 0;
  if (status === "assigned") return 1;
  if (status === "completed") return 3;
  return 2;
}

function isActiveStatus(status: string) {
  return status === "assigned" || status === "in_progress" || status === "viewed" || status === "read" || status === "started";
}

function itemSort(a: FocusItem, b: FocusItem) {
  const unreadDelta = b.priority - a.priority;
  if (unreadDelta !== 0) return unreadDelta;
  const statusDelta = statusOrder(a.status) - statusOrder(b.status);
  if (statusDelta !== 0) return statusDelta;
  const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
  const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
  if (aDue !== bDue) return aDue - bDue;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function classroomItemToFocus(item: ClassroomItem): FocusItem | null {
  if (!isActiveStatus(item.status)) return null;
  const route = resolveItemRoute(item);
  return {
    id: `classroom-${item.id}`,
    title: item.title,
    type: CLASSROOM_TYPE_LABEL[item.type] ?? item.type.replace(/_/g, " "),
    reason: compactDescription(
      item.description,
      item.due_at && isToday(new Date(item.due_at))
        ? "Due today"
        : item.type === "weekly_plan_task"
          ? "Assigned in your study plan"
          : "Assigned in Classroom",
    ),
    status: STATUS_LABEL[item.status] ?? "Open",
    action: ACTION_BY_STATUS[item.status] ?? "Open",
    route,
    createdAt: item.created_at,
    dueAt: item.due_at,
    priority: 30 + item.priority,
    Icon: item.type === "weekly_plan_task" ? BookOpenCheck : ClipboardList,
  };
}

function homeworkToFocus(a: StudentAssignment): FocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  return {
    id: `homework-${a.id}`,
    title: a.set_title || "Homework",
    type: "Homework",
    reason: compactDescription(
      a.set_description,
      `${a.question_qids?.length ?? 0} assigned questions`,
    ),
    status: STATUS_LABEL[a.status],
    action: ACTION_BY_STATUS[a.status],
    route: `/classroom/${encodeURIComponent(a.id)}`,
    createdAt: a.created_at,
    priority: 22,
    Icon: ClipboardList,
    progress: a.score != null ? Math.round(a.score) : undefined,
  };
}

function taToFocus(a: StudentTAAssignment): FocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  return {
    id: `ta-${a.id}`,
    title: a.title || "TA assignment",
    type: "Instructor assigned",
    reason: a.pdf_url ? "PDF attached from Joshua" : "Assigned by Joshua",
    status: STATUS_LABEL[a.status],
    action: ACTION_BY_STATUS[a.status],
    route: `/classroom/ta/${encodeURIComponent(a.id)}`,
    createdAt: a.assigned_at || a.created_at,
    priority: 24,
    Icon: Sparkles,
  };
}

function guidedToFocus(a: GuidedAssignmentWithDrill): FocusItem | null {
  if (!isActiveStatus(a.status)) return null;
  const count = a.guided_drill?.question_count;
  const minutes = a.guided_drill?.estimated_minutes;
  return {
    id: `guided-${a.id}`,
    title: a.guided_drill?.title || "Guided drill",
    type: "Guided drill",
    reason: [
      count != null ? `${count} questions` : null,
      minutes ? `${minutes} min` : null,
    ].filter(Boolean).join(" · ") || "Assigned guided practice",
    status: a.status === "assigned" ? "Not started" : "In progress",
    action: ACTION_BY_STATUS[a.status] ?? "Open",
    route: `/guided/${encodeURIComponent(a.id)}?returnTo=${encodeURIComponent("/mainhub")}`,
    createdAt: a.assigned_at,
    priority: 23,
    Icon: ClipboardList,
  };
}

function notificationToFocus(n: Notification, markRead: (id: string) => Promise<void>): FocusItem | null {
  if (n.read) return null;
  return {
    id: `notification-${n.id}`,
    title: n.title,
    type: n.type === "message" ? "Notification message" : "Notification",
    reason: compactDescription(n.body, formatRelativeShort(n.created_at)),
    status: "Unread",
    action: n.link ? "Open" : "Read",
    route: n.link,
    createdAt: n.created_at,
    priority: n.type === "message" || n.type === "assignment" ? 34 : 18,
    Icon: n.type === "message" ? Inbox : Bell,
    onOpen: async () => {
      await markRead(n.id);
    },
  };
}

function conversationToFocus(c: Conversation): FocusItem | null {
  if (!c.unread || !c.last_message) return null;
  return {
    id: `conversation-${c.id}`,
    title: c.subject || "New message",
    type: "Inbox",
    reason: compactDescription(c.last_message.body, "Unread message"),
    status: "Unread",
    action: "Open",
    route: `/inbox/${encodeURIComponent(c.id)}`,
    createdAt: c.last_message.created_at,
    priority: 36,
    Icon: Inbox,
  };
}

export default function TodayFocusPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = React.useState(false);
  const { data: classroomItems = [], isLoading: classroomLoading } = useClassroomItems();
  const { assignments: homework, loading: homeworkLoading } = useStudentAssignments();
  const { assignments: taAssignments, loading: taLoading } = useStudentTAAssignments();
  const { notifications, loading: notificationsLoading, markRead } = useNotifications();
  const { conversations, loading: inboxLoading } = useInbox();
  const { data: guided = [], isLoading: guidedLoading } = useQuery<GuidedAssignmentWithDrill[]>({
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
      .filter((item): item is FocusItem => item !== null);

    for (const item of classroomItems) {
      if (item.source_id) seenSourceIds.add(item.source_id);
    }

    const fromHomework = homework
      .filter((a) => !seenSourceIds.has(a.id))
      .map(homeworkToFocus)
      .filter((item): item is FocusItem => item !== null);
    const fromTa = taAssignments
      .filter((a) => !seenSourceIds.has(a.id))
      .map(taToFocus)
      .filter((item): item is FocusItem => item !== null);
    const fromGuided = guided
      .filter((a) => !seenSourceIds.has(a.id))
      .map(guidedToFocus)
      .filter((item): item is FocusItem => item !== null);
    const fromNotifications = notifications
      .map((n) => notificationToFocus(n, markRead))
      .filter((item): item is FocusItem => item !== null);
    const fromMessages = conversations
      .map(conversationToFocus)
      .filter((item): item is FocusItem => item !== null);

    const byId = new Map<string, FocusItem>();
    for (const item of [
      ...fromMessages,
      ...fromNotifications,
      ...fromClassroom,
      ...fromHomework,
      ...fromTa,
      ...fromGuided,
    ]) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values()).sort(itemSort).slice(0, 8);
  }, [classroomItems, conversations, guided, homework, markRead, notifications, taAssignments]);

  const loading =
    classroomLoading ||
    homeworkLoading ||
    taLoading ||
    guidedLoading ||
    notificationsLoading ||
    inboxLoading;
  const visibleItems = expanded ? focusItems : focusItems.slice(0, 4);
  const hiddenCount = Math.max(0, focusItems.length - visibleItems.length);

  const openItem = React.useCallback(
    async (item: FocusItem) => {
      await item.onOpen?.();
      if (item.route) navigate(item.route);
    },
    [navigate],
  );

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
      <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/70 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Today
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
              Today's Focus
            </h2>
          </div>
          {focusItems.length > 0 && (
            <Badge variant="outline" className="mt-1 rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
              {focusItems.length} open
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[268px] items-center justify-center gap-2 px-6 py-8 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading focus items
        </div>
      ) : focusItems.length === 0 ? (
        <div className="min-h-[268px] px-6 py-8">
          <div className="flex h-full min-h-[210px] flex-col justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
              <BookOpenCheck className="h-4 w-4" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No tasks assigned for today.
            </h3>
            <p className="mx-auto mt-2 max-w-[24rem] text-sm leading-6 text-slate-500">
              Assigned work, unread messages, and important notifications will appear here when they exist.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {visibleItems.map((item) => (
                <FocusRow key={item.id} item={item} onOpen={() => void openItem(item)} />
              ))}
            </AnimatePresence>
          </div>

          {focusItems.length > 4 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
            >
              {expanded ? "Show less" : `Show ${hiddenCount} more`}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")}
                aria-hidden
              />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FocusRow({ item, onOpen }: { item: FocusItem; onOpen: () => void }) {
  const Icon = item.Icon;
  const dueLabel = item.dueAt
    ? isToday(new Date(item.dueAt))
      ? "Due today"
      : `Due ${format(new Date(item.dueAt), "MMM d")}`
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_26px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.type}
            </span>
            {dueLabel && (
              <span className="text-[11px] font-medium text-slate-500">{dueLabel}</span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
            {item.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
            {item.reason}
          </p>
          {item.progress != null && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={item.progress} className="h-1.5 bg-slate-100 [&>div]:bg-slate-900" />
              <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                {item.progress}%
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[11px] font-semibold text-slate-500">{item.status}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpen}
            disabled={!item.route && !item.onOpen}
            className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-950 hover:text-white disabled:opacity-50"
          >
            {item.action}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
