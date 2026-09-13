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
import { resolveItemRoute } from "@/lib/classroomItems";

/**
 * Work that belongs on the calendar, and the day it belongs on.
 *
 * Three dates can stand for "when": `due_at` is a deadline, `unlock_at` is the
 * morning the work opens, and `created_at` is the day it was handed over.
 * Reading `due_at` alone hid almost everything — an assigned Activity carries a
 * null due_at by design, so scheduled work unlocked on the right morning and
 * never appeared on the day it belonged to, and unscheduled work had no date at
 * all.
 *
 * The `created_at` fallback is deliberately limited to the four types a student
 * can actually DO. Letting announcements, notes, and recaps fall through to
 * their creation date would fill the band with things that cannot be worked on,
 * which is worse than the empty cells it replaced.
 */
const DATEABLE_ON_BAND = new Set<ClassroomItem["type"]>([
  "activity",
  "drill",
  "homework",
  "bootcamp_module",
]);

export function itemDayFor(item: ClassroomItem): string | null {
  if (item.due_at) return item.due_at;
  if (item.unlock_at) return item.unlock_at;
  return DATEABLE_ON_BAND.has(item.type) ? item.created_at : null;
}
import {
  isDayZeroWelcome,
  isNoteUnread,
  NOTE_TYPES,
} from "@/components/classroom/classroomData";
import { useCompleteAssignedWork } from "@/lib/completeAssignedWork";
import { supabase } from "@/integrations/supabase/client";

import { useStudentBooking } from "@/hooks/useStudentBooking";
import { resolveStudentBookingCta } from "@/lib/studentBookingCta";
import { useInbox } from "@/hooks/useInbox";
import { useCurrentWeeklyPlan } from "@/hooks/useWeeklyPlan";
import {
  listStudentAssignments,
  listItemResponses,
  listMySectionGrades,
} from "@/features/activity-centre/api/activitiesClient";
import { shouldPromptReportCard } from "./reportCardSeen";
import type { ActivityAssignmentSummary } from "@/features/activity-centre/api/types";
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
  type HomeMessage,
  type HomeRow,
} from "./homeModel";

const RECAP_WINDOW_DAYS = 21;

/** The candidate carries the timestamp a clear is recorded against. */
type MessageCandidate = HomeMessage & { lastMessageAt: string };

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
  /** Clear one thread off the Home message card (marks it read; no delete). */
  clearMessage: (conversationId: string) => Promise<void>;
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
      drill: canAccess("has_drill_access"),
    }),
    [canAccess],
  );
  const { pathname } = useLocation();
  const { rows: assigned, loading: assignedLoading } = useAssignedTodoFeed();
  const itemsQuery = useClassroomItems();
  const bookingQuery = useStudentBooking();
  const planQuery = useCurrentWeeklyPlan();
  const { conversations, clearConversationFromHome } = useInbox();

  // Same key and same fetcher as the todo feed, so this is a cache read rather
  // than a second round trip. The feed flattens activities to a title and a
  // subtitle; the hero needs the authored tagline and the item count too.
  const { data: activities = [] } = useQuery<ActivityAssignmentSummary[]>({
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
    // A teacher is never the student. Verification writes and test assignments
    // that name the admin account are not work; showing them as "assigned to
    // you" is a lie about a list only students are supposed to own.
    if (permissions.is_admin) return [];
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
          // Suppressed for work that closes its own card. See selfCompleting.
          canComplete: !row.selfCompleting,
          briefing: row.briefing,
        };

      });
  }, [access.activities, assigned, dueBySourceId, now, pathname, permissions.is_admin]);

  /**
   * Recent recaps and notes: reading matter, not work, so they never carry a
   * due date. Notes belong here too — a note posted to the classroom was
   * invisible on this page until 2026-08-19, so a student who only ever opened
   * Home never learned one had arrived.
   *
   * Unread first, and an unread one counts as new, which is what drives the
   * NEW badge and lets it clear itself once the note has been opened.
   */
  /*
   * Her Report Cards, while they are still news.
   *
   * Grading finishes minutes after she stops, by which point the run is over
   * and its row has left this page: `workRows` above drops anything completed,
   * which is right for a list of things still to do and is exactly why a
   * finished section had nowhere to announce itself. Celia sat one, saw a
   * percentage somewhere else, and had to ask where the graded responses were.
   *
   * So a graded card gets a row of its own until she opens it, and then it
   * stops: "Assigned to you" is work outstanding, and a card she has read is
   * not outstanding. The Section Library keeps every Attempt for ever, which is
   * where it lives afterwards.
   */
  const gradesQuery = useQuery({
    queryKey: ["classroom-home:section-grades", user?.id],
    enabled: !!user && !permissions.is_admin,
    queryFn: () => listMySectionGrades(),
  });

  const reportRows = React.useMemo<HomeRow[]>(() => {
    if (permissions.is_admin || !access.activities) return [];
    return (gradesQuery.data ?? [])
      .filter((g) =>
        shouldPromptReportCard(g.graded_at, g.assignment_id, g.attempt_no, now.getTime()),
      )
      .sort((x, y) => new Date(y.graded_at).getTime() - new Date(x.graded_at).getTime())
      .map((g) => ({
        key: `report:${g.assignment_id}:${g.attempt_no}`,
        title: "Your Report Card is ready",
        kind: "activity" as HomeKind,
        tone: KIND_TONE.activity,
        meta: ["Read, Recall, Colour", g.source_section, assignedLabel(g.graded_at, now)]
          .filter(Boolean)
          .join(" · "),
        route: `/activities/${g.assignment_id}`,
        // Not "Open". She has already done the work; what this offers is the
        // part she asked for by name.
        actionLabel: "See what you missed",
        emphasis: false,
        isNew: true,
        dueToday: false,
        overdue: false,
        // Nothing for her to tick off. Opening it is what closes it.
        canComplete: false,
      }));
  }, [gradesQuery.data, permissions.is_admin, access.activities, now]);

  const readingRows = React.useMemo<HomeRow[]>(() => {
    // Same rule as the work rows: notes addressed to the admin account are
    // verification artefacts, not reading the teacher owes anyone.
    if (permissions.is_admin) return [];
    const cutoff = Date.now() - RECAP_WINDOW_DAYS * 86_400_000;
    return (itemsQuery.data ?? [])
      .filter(

        (item: ClassroomItem) =>
          NOTE_TYPES.has(item.type) &&
          !isDayZeroWelcome(item) &&
          item.status !== "archived" &&
          item.status !== "draft" &&
          new Date(item.created_at).getTime() >= cutoff,
      )
      .sort((a, b) => {
        const unread = Number(isNoteUnread(b)) - Number(isNoteUnread(a));
        if (unread !== 0) return unread;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 3)
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
        isNew: isNoteUnread(item),
        dueToday: false,
        overdue: false,
      }));
  }, [itemsQuery.data, permissions.is_admin]);


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
    // Unread reading matter goes above ordinary work but below anything
    // overdue or due today. Appending it after every assignment looked right
    // and was not: Home shows four rows, so a student with four open
    // assignments never saw a new note at all, which is the case this whole
    // feature exists for.
    const urgent = ranked.filter((row) => row.overdue || row.dueToday);
    const rest = ranked.filter((row) => !(row.overdue || row.dueToday));
    const unreadReading = readingRows.filter((row) => row.isNew);
    const readReading = readingRows.filter((row) => !row.isNew);
    /*
     * A ready Report Card sits above ordinary work and below anything overdue.
     * Only four rows are drawn, so anything appended to the end is invisible to
     * a student with a full week, and this is news with a short life: it is
     * worth reading tonight and stale by the weekend.
     */
    const all = [...urgent, ...reportRows, ...unreadReading, ...rest, ...readReading];
    if (all.length) all[0] = { ...all[0], emphasis: true };
    return all;
  }, [readingRows, reportRows, workRows]);

  // The hero takes the top row. The list below repeats it deliberately: the
  // hero is the argument for doing it now, the list is the inventory, and a
  // student scanning only the list should still find the thing that is due.
  /*
   * Never a Report Card. The hero argues for doing something next and takes its
   * button label from the kind of work it is, so a finished run would be
   * offered back to her as "Start". It belongs in the inventory below.
   */
  const heroRow = rows.find((row) => !row.key.startsWith("report:")) ?? null;
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
    const total = heroActivity?.item_count ?? 0;
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

  // What the card is willing to show, newest first.
  //
  // Two server-side facts decide it, and nothing local does:
  //
  //   read     - thread.unread is false once last_read_at passes the message,
  //              which the inbox writes the moment the thread is opened. Read
  //              it anywhere and it leaves Home everywhere.
  //   cleared  - home_cleared_at is the instant Home was cleared through. A
  //              message at or before it is settled; a newer one is news.
  //
  // Both live on conversation_participants, so a phone and a laptop cannot
  // disagree, and the migration's floor means the historic backlog starts out
  // settled rather than queued up behind the card.
  const candidates = React.useMemo<MessageCandidate[]>(() => {
    if (!access.messages) return [];
    return conversations.flatMap((thread) => {
      const last = thread.last_message;
      if (!last) return [];
      // The viewer's own last line is not news to them.
      if (last.sender_id === user?.id) return [];
      // Already read, in the inbox or anywhere else.
      if (!thread.unread) return [];
      // Already cleared off Home, this message or an older one.
      if (thread.home_cleared_at && new Date(last.created_at) <= new Date(thread.home_cleared_at)) {
        return [];
      }
      const sender = thread.participants.find(
        (participant) => participant.user_id === last.sender_id,
      );
      const from = sender?.display_name?.trim() || "Joshua";
      return [
        {
          id: thread.id,
          from,
          initial: from.slice(0, 1).toUpperCase(),
          timeLabel: timeLabel(last.created_at),
          body: last.body,
          unread: thread.unread,
          // Straight into the thread, not the inbox list: the card already
          // showed which conversation this is, so landing anywhere else makes
          // the student find it a second time.
          route: `/inbox/${thread.id}`,
          lastMessageAt: last.created_at,
        },
      ];
    });
  }, [access.messages, conversations, user?.id]);

  const messages = candidates;
  const message = messages[0] ?? null;

  /**
   * Clear one message off Home.
   *
   * Not a delete and not a mark-as-read: the conversation stays in the inbox,
   * still unread, and every per-student surface keeps its dot. It records the
   * clear against THAT message's timestamp, so the next thing this person
   * sends is newer and comes back to Home as new.
   */
  const clearMessage = React.useCallback(
    async (conversationId: string) => {
      const target = candidates.find((candidate) => candidate.id === conversationId);
      if (!target) return;
      await clearConversationFromHome(conversationId, target.lastMessageAt);
    },
    [candidates, clearConversationFromHome],
  );

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
    const entries: { iso: string; label: string; route?: string | null }[] = [];

    for (const item of planQuery.data?.items ?? []) {
      const iso = item.day_date.slice(0, 10);
      if (span.has(iso)) entries.push({ iso, label: item.title });
    }

    for (const item of itemsQuery.data ?? []) {
      const dated = itemDayFor(item);
      if (!dated) continue;
      const iso = localDayISO(new Date(dated));
      if (span.has(iso)) {
        entries.push({ iso, label: item.title, route: resolveItemRoute(item) });
      }
    }

    for (const booking of bookingQuery.data?.bookings ?? []) {
      if (["cancelled", "canceled"].includes(booking.status.toLowerCase())) continue;
      const iso = localDayISO(new Date(booking.start_at));
      if (span.has(iso)) {
        entries.push({
          iso,
          label: `Session, ${timeLabel(booking.start_at)}`,
          route: "/schedule",
        });
      }
    }

    return buildWeek(dates, entries, now);
  }, [bookingQuery.data?.bookings, dates, itemsQuery.data, now, planQuery.data?.items]);

  const dueTodayCount = workRows.filter((row) => row.dueToday || row.overdue).length;
  // Without chat access there is no inbox to send them to, so the count must
  // not appear in the subtitle either — it would name something unreachable.
  // The badge sits above the card, so it counts what the card can actually
  // show. Anything read or cleared is gone from both at the same instant -
  // the two cannot disagree, because they read the same list.
  const unread = access.messages ? messages.length : 0;

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
    newCount: rows.filter((row) => row.isNew).length,
    message,
    messages,
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
    clearMessage,
    completingKey,
  };
}
