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
  assignment: "bg-[radial-gradient(circle_at_82%_0%,rgba(117,163,194,0.22),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(216,158,79,0.16),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.9),rgba(10,21,32,0.82)_54%,rgba(6,8,13,0.92))]",
  message: "bg-[radial-gradient(circle_at_82%_0%,rgba(111,177,170,0.2),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(216,158,79,0.15),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.9),rgba(9,28,31,0.8)_54%,rgba(6,8,13,0.92))]",
  bootcamp: "bg-[radial-gradient(circle_at_82%_0%,rgba(148,167,190,0.18),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(216,158,79,0.14),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.91),rgba(22,27,36,0.8)_54%,rgba(6,8,13,0.93))]",
  set: "bg-[radial-gradient(circle_at_82%_0%,rgba(113,153,203,0.19),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(216,158,79,0.14),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.9),rgba(9,22,40,0.8)_54%,rgba(6,8,13,0.92))]",
  drill: "bg-[radial-gradient(circle_at_82%_0%,rgba(104,171,159,0.18),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(216,158,79,0.14),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.9),rgba(10,30,29,0.78)_54%,rgba(6,8,13,0.92))]",
  notification: "bg-[radial-gradient(circle_at_82%_0%,rgba(204,155,87,0.18),transparent_38%),radial-gradient(circle_at_12%_104%,rgba(236,174,91,0.17),transparent_36%),linear-gradient(142deg,rgba(7,10,16,0.91),rgba(38,25,13,0.76)_54%,rgba(6,8,13,0.93))]",
};

const TODAY_ECLIPSE_IMAGE = "/mainhub/today-eclipse.png";

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
    sourceLine: "Assigned by Joshua",
    status: STATUS_LABEL[a.status],
    actionLabel: ACTION_BY_STATUS[a.status],
    actionCue: a.pdf_url ? "PDF" : undefined,
    route: `/classroom/ta/${encodeURIComponent(a.id)}`,
    priority: 840,
    updatedAt: a.assigned_at || a.created_at,
    Icon: BookOpenCheck,
  };
}

function guidedToFocus(
  a: GuidedAssignmentWithDrill,
  drillReturnTo: string,
): TodayFocusItem | null {
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
    route: `/guided/${encodeURIComponent(a.id)}?returnTo=${encodeURIComponent(drillReturnTo)}`,
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

function lastActivityToFocus(
  row: LastActivityRow | null | undefined,
  drillReturnTo: string,
): TodayFocusItem | null {
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
    routeState:
      target.path === "/drill"
        ? { ...(target.state as object), returnTo: drillReturnTo }
        : target.state,
    priority: snapshot.kind === "section" ? 480 : 460,
    progress,
    updatedAt: row.updated_at,
    Icon: snapshot.kind === "section" ? Signal : RotateCcw,
  };
}

function visibleRails(items: TodayFocusItem[], primaryId: string | null) {
  return items.filter((item) => item.id !== primaryId).slice(0, 2);
}

export default function TodayFocusPanel({
  drillReturnTo = "/classroom",
}: {
  drillReturnTo?: string;
}) {
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
      .map((assignment) => guidedToFocus(assignment, drillReturnTo))
      .filter((item): item is TodayFocusItem => item !== null);
    const fromNotifications = notifications
      .map((n) => notificationToFocus(n, markRead))
      .filter((item): item is TodayFocusItem => item !== null);
    const fromMessages = conversations
      .map(instructorMessageToFocus)
      .filter((item): item is TodayFocusItem => item !== null);
    const fromLastActivity = lastActivityToFocus(lastActivity, drillReturnTo);

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
  }, [classroomItems, conversations, drillReturnTo, guided, homework, lastActivity, markRead, notifications, taAssignments]);

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
      className="drill-observatory-today overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(111,150,179,0.055)_36%,rgba(0,0,0,0.2)_100%)] p-px shadow-[0_34px_100px_rgba(4,7,12,0.28),0_8px_28px_rgba(48,75,101,0.09)]"
    >
      <div className="drill-observatory-today-inner relative overflow-hidden rounded-[33px] bg-[#05070b] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-1px_0_rgba(104,149,184,0.08)] sm:p-5">
        <EclipseGlassBackdrop />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-200/90">
              TODAY
            </p>
            <time className="font-mono text-[11px] font-medium text-slate-300/80" dateTime={format(new Date(), "yyyy-MM-dd")}>
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

function EclipseGlassBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.38]"
        style={{
          backgroundImage: `url(${TODAY_ECLIPSE_IMAGE})`,
          backgroundPosition: "50% 48%",
          backgroundSize: "112% auto",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_53%,rgba(255,255,255,0.04)_0%,rgba(3,5,9,0.18)_26%,rgba(3,5,9,0.78)_66%,rgba(3,5,9,0.95)_100%),linear-gradient(180deg,rgba(5,8,13,0.94)_0%,rgba(5,8,13,0.58)_42%,rgba(5,7,11,0.88)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_50%_50%,black,transparent_78%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.74)_0_1px,transparent_1.5px),radial-gradient(circle_at_74%_12%,rgba(255,255,255,0.62)_0_1px,transparent_1.5px),radial-gradient(circle_at_88%_31%,rgba(151,192,225,0.64)_0_1px,transparent_1.5px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 bottom-[7.2rem] h-24 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,237,209,0.14)_0%,rgba(220,159,74,0.12)_18%,rgba(84,129,157,0.1)_38%,transparent_74%)] blur-lg"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 bottom-[8.15rem] h-px bg-gradient-to-r from-transparent via-white/24 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[6.8rem] left-1/2 h-12 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-100/28 to-transparent opacity-60 blur-[0.5px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[7.85rem] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-100/48 blur-[2px] shadow-[0_0_30px_rgba(235,173,83,0.42)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_16%,transparent_72%,rgba(255,255,255,0.025))]"
      />
    </>
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
      className="drill-observatory-today-primary group relative min-h-[238px] rounded-[29px] bg-[linear-gradient(145deg,rgba(255,255,255,0.12),rgba(126,177,212,0.07)_36%,rgba(255,255,255,0.025)_62%,rgba(0,0,0,0.2)_100%)] p-px shadow-[0_22px_62px_rgba(0,0,0,0.24),0_0_30px_rgba(81,123,153,0.08)]"
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
    >
      <div
        className={cn(
          "relative min-h-[236px] overflow-hidden rounded-[28px] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-1px_0_rgba(107,151,181,0.08)] backdrop-blur-md",
          TYPE_TONE[item.type],
        )}
      >
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,10,0.04)_0%,rgba(3,6,10,0.18)_48%,rgba(3,6,10,0.32)_100%),radial-gradient(circle_at_82%_8%,rgba(218,239,255,0.08),transparent_38%),radial-gradient(circle_at_18%_92%,rgba(244,185,111,0.08),transparent_36%),linear-gradient(90deg,rgba(255,255,255,0.03),transparent_26%,transparent_72%,rgba(120,176,211,0.04))]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:54px_54px]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_center,rgba(235,176,101,0.11),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="relative flex min-h-[168px] w-full flex-col items-start text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12]"
      >
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-200/85">
              Next up
            </p>
            <div className="mt-2 flex items-center gap-2">
              {item.status && (
                <span className="rounded-full border border-amber-100/15 bg-amber-100/[0.08] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {item.status}
                </span>
              )}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-100/15 bg-sky-100/[0.08] text-sky-100/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </div>
          {item.progress && (
            <span className="font-mono text-[11px] font-semibold text-slate-300/85">{item.progress}</span>
          )}
        </div>

        <div className="mt-auto max-w-[28rem] pb-4 pt-6">
          <h2 className="text-xl font-semibold leading-tight tracking-normal text-white sm:text-2xl">
            {item.title}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-300/90">{item.sourceLine}</p>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 space-y-2 text-sm leading-6 text-slate-300/90"
              >
                <p>{contextLineFor(item)}</p>
                {item.preview && <p className="line-clamp-2 text-slate-100/95">{item.type === "message" ? `"${item.preview}"` : item.preview}</p>}
                {(item.estimatedTime || item.progress) && (
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400/90">
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
        className="relative -mx-6 -mb-6 mt-1 flex w-[calc(100%+3rem)] items-center justify-between bg-[linear-gradient(90deg,rgba(255,255,255,0.065),rgba(255,255,255,0.035)_46%,rgba(123,165,193,0.045))] px-6 py-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-500 hover:bg-[linear-gradient(90deg,rgba(244,190,121,0.1),rgba(255,255,255,0.045)_46%,rgba(123,165,193,0.065))] active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-500"
      >
        <span>{actionText(item)}</span>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300/90">
          {item.actionCue}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.065] text-slate-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition duration-500 group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </span>
      </button>
      </div>
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
        "drill-observatory-today-rail",
        "flex w-full items-center gap-3 rounded-xl bg-[linear-gradient(145deg,rgba(255,255,255,0.062),rgba(255,255,255,0.026)_52%,rgba(77,109,132,0.04))] px-4 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.075),inset_0_-1px_0_rgba(96,130,157,0.055)] ring-1 ring-white/[0.045] backdrop-blur-md transition duration-500 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.036)_52%,rgba(92,130,160,0.055))] hover:ring-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12] active:scale-[0.99]",
        muted && "opacity-60",
      )}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.045] text-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.05]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{railTitle(item)}</span>
        <span className="mt-1 block truncate text-xs text-slate-400/95">{item.sourceLine}</span>
      </span>
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300/95">
        {item.status ?? item.actionLabel}
      </span>
    </motion.button>
  );
}

function TodaySkeleton() {
  return (
    <div aria-label="Loading today" className="animate-pulse">
      <div className="min-h-[238px] rounded-[29px] bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(255,255,255,0.035)_52%,rgba(92,126,151,0.06))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(104,149,184,0.08),0_18px_46px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.07] backdrop-blur-md">
        <div className="h-3 w-20 rounded-full bg-white/15" />
        <div className="mt-7 h-8 w-3/4 rounded-full bg-white/14" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-white/10" />
        <div className="-mx-6 -mb-6 mt-20 h-12 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
      </div>
      <div className="mt-3 grid gap-2">
        <div className="h-[58px] rounded-[23px] bg-white/[0.045] ring-1 ring-white/[0.07] backdrop-blur-md" />
        <div className="h-[58px] rounded-[23px] bg-white/[0.04] ring-1 ring-white/[0.06] backdrop-blur-md" />
      </div>
    </div>
  );
}

function TodayEmptyState() {
  return (
    <div aria-live="polite">
      <div className="relative min-h-[238px] overflow-hidden rounded-[29px] bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035)_52%,rgba(92,126,151,0.055))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(104,149,184,0.08),0_18px_46px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.07] backdrop-blur-md">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(180,213,235,0.11),transparent_38%),radial-gradient(circle_at_18%_88%,rgba(238,174,91,0.12),transparent_34%)]" />
        <div className="relative flex min-h-[198px] flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300/90">
              Next up
            </p>
            <h2 className="mt-8 text-2xl font-semibold tracking-normal text-white">
              All caught up
            </h2>
            <p className="mt-2 text-sm text-slate-300/90">Nothing assigned for today.</p>
          </div>
          <div className="pt-4 text-xs font-medium text-slate-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
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
      <div className="min-h-[238px] rounded-[29px] bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035)_52%,rgba(92,126,151,0.055))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(104,149,184,0.08),0_18px_46px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.07] backdrop-blur-md">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300/90">
          Next up
        </p>
        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-normal text-white">Couldn&apos;t load today.</h2>
          <p className="mt-2 text-sm text-slate-400/90">Refresh the page to try again.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="rounded-[23px] bg-white/[0.04] px-4 py-3 text-sm text-slate-400/90 ring-1 ring-white/[0.06] backdrop-blur-md">
          Today is temporarily unavailable.
        </div>
      </div>
    </div>
  );
}

function EmptyRailQuiet() {
  return (
    <div className="rounded-[23px] bg-white/[0.035] px-4 py-3 text-sm text-slate-500/90 ring-1 ring-white/[0.05] backdrop-blur-md">
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
