import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import {
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
import { useInstructorMessages, type InstructorMessage } from "@/hooks/useInstructorMessages";
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

/**
 * The computed next step, lifted out of the Today panel so the drill hub's
 * hero and the panel read ONE list. PRODUCT.md's second principle: compute the
 * next step, do not present a grid. The hero leads with the primary item; the
 * panel carries the queue behind it. Both must agree on which item is first,
 * and the only way to guarantee that is one computation.
 */

type GuidedAssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

export type TodayFocusType =
  | "assignment"
  | "message"
  | "bootcamp"
  | "set"
  | "drill"
  | "notification";

export type TodayActionLabel = "Start" | "Continue" | "Reply" | "Resume" | "Review" | "Practice" | "Open";

export interface TodayFocusItem {
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

function instructorMessageToFocus(m: InstructorMessage): TodayFocusItem {
  return {
    id: `conversation-${m.conversationId}`,
    type: "message",
    title: m.subject || "Message from Joshua",
    sourceLine: "Message from Joshua",
    status: "New",
    actionLabel: "Reply",
    actionCue: "New",
    route: `/inbox/${encodeURIComponent(m.conversationId)}`,
    priority: 700,
    preview: compactText(m.body, 92) ?? undefined,
    updatedAt: m.createdAt,
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

export interface TodayFocus {
  items: TodayFocusItem[];
  primary: TodayFocusItem | null;
  rails: TodayFocusItem[];
  loading: boolean;
  hasError: boolean;
  /** Make a rail item the primary one, without navigating. */
  promote: (id: string) => void;
  /** Follow an item's route, running its side effect (e.g. mark read) first. */
  open: (item: TodayFocusItem) => Promise<void>;
}

export function useTodayFocus(drillReturnTo = "/classroom"): TodayFocus {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const {
    data: classroomItems = [],
    isLoading: classroomLoading,
    isError: classroomError,
  } = useClassroomItems();
  const { assignments: homework, loading: homeworkLoading, error: homeworkError } = useStudentAssignments();
  const { assignments: taAssignments, loading: taLoading, error: taError } = useStudentTAAssignments();
  const { notifications, loading: notificationsLoading, error: notificationsError, markRead } = useNotifications();
  const { data: instructorMessages = [], isLoading: inboxLoading } = useInstructorMessages();
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

  const items = React.useMemo(() => {
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
    const fromMessages = instructorMessages.map(instructorMessageToFocus);
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
  }, [classroomItems, drillReturnTo, guided, homework, instructorMessages, lastActivity, markRead, notifications, taAssignments]);

  React.useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

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
  const primary = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const rails = React.useMemo(
    () => (primary ? visibleRails(items, primary.id) : []),
    [items, primary],
  );

  const open = React.useCallback(
    async (item: TodayFocusItem) => {
      await item.onOpen?.();
      if (item.route) {
        navigate(item.route, item.routeState ? { state: item.routeState } : undefined);
      }
    },
    [navigate],
  );

  const promote = React.useCallback((id: string) => setSelectedId(id), []);

  return { items, primary, rails, loading, hasError, promote, open };
}

/** Copy shared by the hero and the panel, so the two never describe one item two ways. */
export function actionText(item: TodayFocusItem) {
  if (item.actionLabel === "Start" && item.type === "bootcamp") return "Start lesson";
  if (item.actionLabel === "Practice") return "Practice";
  if (item.actionLabel === "Resume") return "Resume drill";
  return item.actionLabel;
}

export function contextLineFor(item: TodayFocusItem) {
  if (item.type === "message") return "This is next because Joshua sent an unread message.";
  if (item.type === "bootcamp") return "This is next because you have bootcamp progress in motion.";
  if (item.type === "drill" || item.type === "set") return "This is next because you have unfinished practice.";
  if (item.type === "notification") return "This is next because a new notification is waiting.";
  return "This is next because it is assigned work.";
}

export function railTitle(item: TodayFocusItem) {
  if (item.type === "message") return "Message from Joshua";
  if (item.type === "drill") return "Smart LR Drill";
  if (item.type === "bootcamp") return "Bootcamp Lesson";
  return item.title;
}
