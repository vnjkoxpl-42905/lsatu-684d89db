/**
 * Live half of Classroom Home: joins the queries the classroom already runs
 * into the one model the page renders.
 *
 * Every field traces to a row. Where a source cannot prove something the design
 * asks for (a progress count for a drill, a "not read yet" flag on a recap) the
 * model returns null and the view drops that ornament rather than filling it in.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import { useLocation } from "react-router-dom";
import {
  useAssignedTodoFeed,
  routeWithReturnTo,
  type AssignedTodoRow,
} from "@/hooks/useAssignedTodoFeed";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";
import { useCompleteAssignedWork } from "@/lib/completeAssignedWork";

import { useStudentBooking } from "@/hooks/useStudentBooking";
import { useInbox } from "@/hooks/useInbox";
import { useCurrentWeeklyPlan } from "@/hooks/useWeeklyPlan";
import {
  listStudentAssignments,
  listItemResponses,
} from "@/features/activity-centre/api/activitiesClient";
import type { ActivityAssignment } from "@/features/activity-centre/api/types";
import { localDayISO } from "@/lib/localDate";
import {
  KIND_LABEL,
  KIND_TONE,
  assignedLabel,
  buildWeek,
  datelineFor,
  dueLabel,
  greetingFor,
  primaryLabelFor,
  spell,
  stripKind,
  subtitleFor,
  weekDates,
  weekLabelFor,
  type ClassroomHomeModel,
  type HomeKind,
  type HomeRow,
} from "./homeModel";

const RECAP_WINDOW_DAYS = 21;

/** Feed kinds map onto the model's kinds one-for-one. */
const FEED_KIND: Record<AssignedTodoRow["kind"], HomeKind> = {
  activity: "activity",
  guided: "guided",
  homework: "homework",
  ta: "ta",
  bootcamp: "bootcamp",
  plan: "plan",
};

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function sessionLabel(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(new Date(iso))
    .concat(" · ", timeLabel(iso));
}

function daysUntil(iso: string) {
  const start = new Date(iso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

function untilLabel(iso: string) {
  const days = daysUntil(iso);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${spell(days)} days`;
}

export function useClassroomHome(): {
  model: ClassroomHomeModel;
  loading: boolean;
  /** Close out an assigned row by key; no-op for a row that is not work. */
  markDone: (key: string) => void;
  completingKey: string | null;
} {

  const { user } = useAuth();
  const permissions = useUserPermissions();
  const { displayName } = useClassroomLayout();
  const completion = useCompleteAssignedWork();
  const [completingKey, setCompletingKey] = React.useState<string | null>(null);


  // Mirrors the rail's own rule, so a door on Home and the same door in the
  // rail can never disagree: admins pass everything, an item with no flags is
  // open to any signed-in student, otherwise any one flag is enough.
  const canAccess = React.useCallback(
    (...flags: PermissionFlag[]) =>
      permissions.is_admin || flags.length === 0 || flags.some((flag) => permissions[flag]),
    [permissions],
  );

  const access = React.useMemo(
    () => ({
      messages: canAccess("has_chat_access"),
      schedule: canAccess("has_schedule_access"),
      activities: canAccess("has_activity_access"),
    }),
    [canAccess],
  );
  const { pathname } = useLocation();
  const { rows: assigned, loading: assignedLoading } = useAssignedTodoFeed();
  const itemsQuery = useClassroomItems();
  const bookingQuery = useStudentBooking();
  const planQuery = useCurrentWeeklyPlan();
  const { conversations, unreadCount } = useInbox();

  // Same key and same fetcher as the todo feed, so this is a cache read rather
  // than a second round trip. The feed flattens activities to a title and a
  // subtitle; the hero needs the authored tagline and the item count too.
  const { data: activities = [] } = useQuery<ActivityAssignment[]>({
    queryKey: ["todo-feed:activity", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => listStudentAssignments(user!.id),
  });

  // Every label on this page is a day-granularity comparison ("due today", "in
  // four days"), so the clock is re-read once per calendar day rather than once
  // per render. A fresh Date each render would invalidate every memo below and
  // buy nothing.
  const today = localDayISO();
  // `today` is the point of the dependency, not an accident: it is the only
  // thing that should make the page re-read the clock. The rule cannot see that.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = React.useMemo(() => new Date(), [today]);

  /** Due dates live on classroom_items; the feed rows carry only their source id. */
  const dueBySourceId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of itemsQuery.data ?? []) {
      if (item.due_at && item.source_id) map.set(item.source_id, item.due_at);
    }
    return map;
  }, [itemsQuery.data]);

  const workRows = React.useMemo<HomeRow[]>(() => {
    return assigned
      .filter((row) => row.status !== "completed")
      // An activity row leads to /activities/:id, which is gated on
      // has_activity_access. Showing it to someone without the flag would put a
      // locked door on the page and, worse, could make it the hero.
      .filter((row) => row.kind !== "activity" || access.activities)
      .map((row) => {
        const kind = FEED_KIND[row.kind];
        // The feed now carries the due date off the classroom_items row it
        // merged; dueBySourceId stays as the fallback for rows that have no
        // classroom item of their own.
        const dueAt = row.dueAt ?? dueBySourceId.get(row.refId) ?? null;
        const due = dueLabel(dueAt, now);
        const meta = [KIND_LABEL[kind], row.subtitle, due ?? assignedLabel(row.createdAt, now)]
          .filter(Boolean)
          .join(" · ");
        return {
          key: row.key,
          title: row.title,
          kind,
          tone: KIND_TONE[kind],
          meta,
          // Finishing a guided drill returns here rather than to /schedule.
          route: routeWithReturnTo(row.route, pathname),
          actionLabel: "Open",
          emphasis: false,
          isNew: row.status === "assigned",
          dueToday: due === "due today",
          overdue: !!due?.includes("overdue"),
          canComplete: true,
        };

      });
  }, [access.activities, assigned, dueBySourceId, now, pathname]);

  /** Recent recaps and notes: reading matter, not work, so they never carry a due date. */
  const readingRows = React.useMemo<HomeRow[]>(() => {
    const cutoff = Date.now() - RECAP_WINDOW_DAYS * 86_400_000;
    return (itemsQuery.data ?? [])
      .filter(
        (item: ClassroomItem) =>
          (item.type === "session_recap" || item.type === "smartboard_recap") &&
          item.status !== "archived" &&
          item.status !== "draft" &&
          new Date(item.created_at).getTime() >= cutoff,
      )
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 2)
      .map((item) => ({
        key: `item:${item.id}`,
        title: item.title,
        kind: "recap" as HomeKind,
        tone: KIND_TONE.recap,
        meta: [
          KIND_LABEL.recap,
          `posted ${new Intl.DateTimeFormat("en-CA", {
            day: "numeric",
            month: "short",
          }).format(new Date(item.created_at))}`,
        ].join(" · "),
        route: `/classroom/item/${encodeURIComponent(item.id)}`,
        actionLabel: "Read",
        emphasis: false,
        isNew: false,
        dueToday: false,
        overdue: false,
      }));
  }, [itemsQuery.data]);

  /**
   * Overdue first, then due today, then the rest newest-first, then reading
   * matter. The order is the page's argument: the top row is what to do next.
   */
  const rows = React.useMemo(() => {
    const ranked = [...workRows].sort((a, b) => {
      const rank = (row: HomeRow) => (row.overdue ? 0 : row.dueToday ? 1 : 2);
      const delta = rank(a) - rank(b);
      if (delta !== 0) return delta;
      return a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1;
    });
    const all = [...ranked, ...readingRows];
    if (all.length) all[0] = { ...all[0], emphasis: true };
    return all;
  }, [readingRows, workRows]);

  // The hero takes the top row. The list below repeats it deliberately: the
  // hero is the argument for doing it now, the list is the inventory, and a
  // student scanning only the list should still find the thing that is due.
  const heroRow = rows[0] ?? null;
  const listRows = rows.slice(0, 4);

  const heroActivity = React.useMemo(() => {
    if (!heroRow || heroRow.kind !== "activity") return null;
    const refId = assigned.find((row) => row.key === heroRow.key)?.refId;
    return activities.find((item) => item.id === refId) ?? null;
  }, [activities, assigned, heroRow]);

  // Progress is only ever drawn from a real attempt log. Activities have one;
  // nothing else on this page does, so nothing else gets a progress card.
  const { data: responses } = useQuery({
    queryKey: ["classroom-home:activity-progress", heroActivity?.id, user?.id],
    enabled: !!heroActivity && !!user,
    staleTime: 15_000,
    queryFn: async () => listItemResponses(heroActivity!.id, user!.id),
  });

  const hero = React.useMemo(() => {
    if (!heroRow) return null;
    const started = !heroRow.isNew;
    const total = heroActivity?.items?.length ?? 0;
    const answered = responses
      ? new Set(responses.map((response) => response.item_order)).size
      : null;
    return {
      row: heroRow,
      eyebrow: started ? "PICK UP WHERE YOU LEFT OFF" : "START HERE",
      kindLabel: KIND_LABEL[heroRow.kind].toUpperCase(),
      meta: stripKind(heroRow.meta, heroRow.kind),
      prose: heroActivity?.instructions?.tagline ?? null,
      primaryLabel: primaryLabelFor(heroRow.kind, started && (answered ?? 0) > 0),
      progress:
        heroActivity && total > 0
          ? {
              completed: answered,
              total,
              unit: total === 1 ? "prompt" : "prompts",
              estimateMinutes: null,
            }
          : null,
    };
  }, [heroActivity, heroRow, responses]);

  /* ── the coach's last word ─────────────────────────────────────────── */

  const message = React.useMemo(() => {
    if (!access.messages) return null;
    const thread = conversations.find((conversation) => conversation.last_message);
    if (!thread?.last_message) return null;
    const sender = thread.participants.find(
      (participant) => participant.user_id === thread.last_message!.sender_id,
    );
    // The student's own last line is not news to them; only show the coach's.
    if (thread.last_message.sender_id === user?.id) return null;
    const from = sender?.display_name?.trim() || "Joshua";
    return {
      id: thread.id,
      from,
      initial: from.slice(0, 1).toUpperCase(),
      timeLabel: timeLabel(thread.last_message.created_at),
      body: thread.last_message.body,
      unread: thread.unread,
      route: "/inbox",
    };
  }, [access.messages, conversations, user?.id]);

  /* ── next session ──────────────────────────────────────────────────── */

  const nextBooking = React.useMemo(() => {
    return (bookingQuery.data?.bookings ?? [])
      .filter(
        (redemption) =>
          new Date(redemption.start_at).getTime() > Date.now() &&
          !["cancelled", "canceled"].includes(redemption.status.toLowerCase()),
      )
      .sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      )[0] ?? null;
  }, [bookingQuery.data?.bookings]);

  const session = React.useMemo(() => {
    if (!nextBooking) return null;
    const minutes = Math.round(
      (new Date(nextBooking.end_at).getTime() -
        new Date(nextBooking.start_at).getTime()) /
        60_000,
    );
    return {
      startsAt: nextBooking.start_at,
      durationMin: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      label: sessionLabel(nextBooking.start_at),
      meta: [
        // The instructor is named for a student, whose session it is with him.
        // Staff looking at their own classroom get the plain duration: "with
        // Joshua" reads as nonsense when you are Joshua.
        Number.isFinite(minutes) && minutes > 0
          ? permissions.is_admin
            ? `${minutes} minutes`
            : `${minutes} minutes with Joshua`
          : null,
        untilLabel(nextBooking.start_at),
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }, [nextBooking, permissions.is_admin]);

  // The booking link follows the plan the student is actually on: credits in
  // hand go straight to the picker, a pay-per-session student gets the single
  // link, a spent package gets offered back as a renewal.
  const booking = React.useMemo(
    () =>
      resolveStudentBookingCta({
        pass: bookingQuery.data?.pass ?? null,
        offers: bookingQuery.data?.offers ?? [],
        hasUpcomingSession: !!nextBooking,
      }),
    [bookingQuery.data?.offers, bookingQuery.data?.pass, nextBooking],
  );

  /* ── the week ──────────────────────────────────────────────────────── */

  const dates = React.useMemo(() => weekDates(now), [now]);

  const week = React.useMemo(() => {
    const span = new Set(dates);
    const entries: { iso: string; label: string }[] = [];

    for (const item of planQuery.data?.items ?? []) {
      const iso = item.day_date.slice(0, 10);
      if (span.has(iso)) entries.push({ iso, label: item.title });
    }

    for (const item of itemsQuery.data ?? []) {
      if (!item.due_at) continue;
      const iso = localDayISO(new Date(item.due_at));
      if (span.has(iso)) entries.push({ iso, label: item.title });
    }

    for (const booking of bookingQuery.data?.bookings ?? []) {
      if (["cancelled", "canceled"].includes(booking.status.toLowerCase())) continue;
      const iso = localDayISO(new Date(booking.start_at));
      if (span.has(iso)) {
        entries.push({ iso, label: `Session, ${timeLabel(booking.start_at)}` });
      }
    }

    return buildWeek(dates, entries, now);
  }, [bookingQuery.data?.bookings, dates, itemsQuery.data, now, planQuery.data?.items]);

  const dueTodayCount = workRows.filter((row) => row.dueToday || row.overdue).length;
  // Without chat access there is no inbox to send them to, so the count must
  // not appear in the subtitle either — it would name something unreachable.
  const unread = access.messages ? unreadCount : 0;

  const model: ClassroomHomeModel = {
    greeting: greetingFor(now),
    displayName,
    isAdmin: permissions.is_admin,
    access,
    dateline: datelineFor(now),
    subtitle: subtitleFor(dueTodayCount, workRows.length, unread),
    dueTodayCount,
    hero,
    rows: listRows,
    newCount: workRows.filter((row) => row.isNew).length,
    message,
    unreadMessages: unread,
    session,
    booking,
    week,
    weekLabel: weekLabelFor(dates),
  };

  // Marking work done writes back to the assignment it came from, so the row
  // leaves this page (and every other "what is due" count) while the classroom
  // panel keeps it, labelled completed. Nothing is deleted.
  const markDone = React.useCallback(
    (key: string) => {
      const row = assigned.find((candidate) => candidate.key === key);
      if (!row || row.status === "completed") return;
      setCompletingKey(key);
      completion.mutate(
        { sourceTable: row.sourceTable, refId: row.refId },
        { onSettled: () => setCompletingKey(null) },
      );
    },
    [assigned, completion],
  );

  return {
    model,
    loading: assignedLoading || itemsQuery.isLoading,
    markDone,
    completingKey,
  };
}
