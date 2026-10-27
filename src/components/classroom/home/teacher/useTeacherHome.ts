/**
 * Live half of the teaching desk.
 *
 * Reads only sources an admin is already authorized for, each under a key
 * that carries the actor's id, so a sign-out and sign-in on one browser never
 * draws the previous account's roster. Deliberately does NOT mount the Desk
 * task queue: that hook starts Gmail and Google Calendar sync, and opening
 * Home must not trigger an external sync.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useInbox } from "@/hooks/useInbox";
import { useClassroomLayout } from "@/components/classroom/shell/classroomLayoutContext";
import { localDayISO } from "@/lib/localDate";
import { datelineFor, greetingFor } from "../homeModel";
import {
  buildRoster,
  buildSessions,
  buildUnreadThreads,
  type RegionState,
  type RosterInput,
  type SessionInput,
  type TeacherHomeModel,
} from "./teacherHomeModel";

const SHOWN_SESSIONS = 4;

export const teacherRosterQueryKey = (actorId: string | undefined) =>
  ["teacher-home:roster", actorId] as const;
export const teacherSessionsQueryKey = (actorId: string | undefined) =>
  ["teacher-home:upcoming-sessions", actorId] as const;

function regionState(query: { isPending: boolean; isError: boolean; data: unknown }): RegionState {
  if (query.data !== undefined) return "ready";
  if (query.isError) return "error";
  return "loading";
}

export function useTeacherHome(): {
  model: TeacherHomeModel;
  retryInbox: () => void;
  retryRoster: () => void;
  retrySessions: () => void;
} {
  const { user } = useAuth();
  const actorId = user?.id;
  const permissions = useUserPermissions();
  const isAdmin = permissions.resolved === true && permissions.is_admin;
  const { displayName } = useClassroomLayout();
  const inbox = useInbox();

  const rosterQuery = useQuery<RosterInput[]>({
    queryKey: teacherRosterQueryKey(actorId),
    enabled: !!actorId && isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // The same Edge Function the Student Hub reads; it enforces admin itself.
      const { data, error } = await supabase.functions.invoke("admin-manage-users", { method: "GET" });
      if (error) throw error;
      return (data ?? []) as RosterInput[];
    },
  });

  const sessionsQuery = useQuery<SessionInput[]>({
    queryKey: teacherSessionsQueryKey(actorId),
    enabled: !!actorId && isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // student_sessions as Teacher Desk's next-session cue reads it: scheduled
      // rows from now on. No calendar sync, no availability.
      const { data, error } = await supabase
        .from("student_sessions")
        .select("id, student_id, scheduled_at, duration_minutes")
        .gte("scheduled_at", new Date().toISOString())
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(SHOWN_SESSIONS);
      if (error) throw error;
      return (data ?? []) as SessionInput[];
    },
  });

  const today = localDayISO();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = React.useMemo(() => new Date(), [today]);

  const model = React.useMemo<TeacherHomeModel>(() => {
    const unreadState: RegionState = inbox.loaded ? "ready" : inbox.error ? "error" : "loading";
    const rosterState = regionState(rosterQuery);
    const sessionsState = regionState(sessionsQuery);
    const roster = rosterQuery.data ? buildRoster(rosterQuery.data, now) : null;
    const names = new Map(
      (rosterQuery.data ?? []).map((row) => [row.class_id, row.display_name?.trim() || "Student"]),
    );
    return {
      greeting: greetingFor(now),
      displayName,
      dateline: datelineFor(now),
      // Cached content stays on screen through a failed refresh, but each
      // region carries the failure so it can say so and offer a retry.
      unread: {
        state: unreadState,
        total: unreadState === "ready" ? inbox.unreadCount : null,
        rows: unreadState === "ready" ? buildUnreadThreads(inbox.conversations, actorId ?? null, now) : [],
        refreshFailed: inbox.loaded && !!inbox.error,
      },
      roster: {
        state: rosterState,
        total: roster ? roster.total : null,
        recent: roster ? roster.recent : [],
        all: roster ? roster.all : [],
        refreshFailed: rosterQuery.data !== undefined && rosterQuery.isError,
      },
      sessions: {
        state: sessionsState,
        rows: sessionsQuery.data ? buildSessions(sessionsQuery.data, names, now) : [],
        refreshFailed: sessionsQuery.data !== undefined && sessionsQuery.isError,
      },
    };
  }, [actorId, displayName, inbox.conversations, inbox.error, inbox.loaded, inbox.unreadCount, now, rosterQuery, sessionsQuery]);

  return {
    model,
    retryInbox: () => void inbox.refresh(),
    retryRoster: () => void rosterQuery.refetch(),
    retrySessions: () => void sessionsQuery.refetch(),
  };
}
