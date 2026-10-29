import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType =
  | "assignment"
  | "message"
  | "reminder"
  | "streak"
  | "signup"
  | "payment_needs_tier";

/** Lifecycle for actionable notifications. NULL/absent on informational ones. */
export type NotificationStatus = "pending" | "approved" | "dismissed";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  /** Who the notification is ABOUT (profiles.class_id), as opposed to user_id. */
  subject_class_id?: string | null;
  status?: NotificationStatus | null;
  assignmentIdentity?: { sourceTable: string; sourceId: string; issuance: number };
  assignmentGroupId?: string;
  assignmentMappingUnavailable?: boolean;
}

const PAGE_SIZE = 30;

export const notificationsQueryKey = (userId: string | undefined) =>
  ["notifications", userId] as const;

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error: err } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (err) {
    console.error("[notifications:list] failed", { userId, error: err });
    throw new Error(err.message);
  }
  const { data: links, error: linkError } = await supabase.rpc('get_assignment_notification_links' as never);
  if (linkError) {
    console.error('[notifications:assignment-links] failed', linkError);
    return (data ?? []).map((notification) => ({ ...notification, assignmentMappingUnavailable: true })) as Notification[];
  }
  const mapped = new Map((links as unknown as Array<{ notification_id: string; source_table: string | null; source_id: string | null; issuance: number; group_id: string | null }> ?? []).map((link) => [link.notification_id, link]));
  return (data ?? []).map((notification) => {
    const link = mapped.get(notification.id);
    return { ...notification, ...(link?.source_table && link.source_id ? { assignmentIdentity: { sourceTable: link.source_table, sourceId: link.source_id, issuance: link.issuance } } : {}), ...(link?.group_id ? { assignmentGroupId: link.group_id } : {}) };
  }) as Notification[];
}

export const notificationsUnreadQueryKey = (userId: string | undefined) =>
  [...notificationsQueryKey(userId), "unread-count"] as const;

export async function loadNotificationsUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

/** Reconcile a snapshot of this thread's delivered alerts against unread messages. */
export async function clearConversationNotifications(userId: string, conversationId: string, readThrough: string): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (auth.user?.id !== userId) throw new Error("The signed-in reader changed.");
  const candidates: Array<{ id: string; created_at: string }> = [];
  const pageSize = 500;
  // Snapshot IDs before inspecting newer messages. Alerts delivered after this
  // snapshot cannot accidentally be acknowledged by a later batch update.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("notifications").select("id, link, created_at")
      .eq("user_id", userId).eq("type", "message").eq("read", false)
      .order("id", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.link?.startsWith("/") || row.link.startsWith("//")) continue;
      const path = new URL(row.link, "https://lsatprep.study").pathname;
      if (path === `/inbox/${encodeURIComponent(conversationId)}` || path === `/inbox/${conversationId}`) {
        candidates.push({ id: row.id, created_at: row.created_at });
      }
    }
    if ((data?.length ?? 0) < pageSize) break;
  }
  if (candidates.length === 0) return;
  const { data: newer, error: newerError } = await supabase.from("messages").select("id, created_at")
    .eq("conversation_id", conversationId).neq("sender_id", userId).gt("created_at", readThrough)
    .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1);
  if (newerError) throw newerError;
  const firstUnread = newer?.[0]?.created_at;
  const ids = candidates.filter((candidate) => !firstUnread ||
    new Date(candidate.created_at).getTime() < new Date(firstUnread).getTime()).map((candidate) => candidate.id);
  for (let offset = 0; offset < ids.length; offset += pageSize) {
    const { error } = await supabase.from("notifications").update({ read: true })
      .eq("user_id", userId).eq("type", "message").eq("read", false)
      .in("id", ids.slice(offset, offset + pageSize));
    if (error) throw error;
  }
}

const EMPTY: Notification[] = [];

/**
 * The bell in the Classroom rail and the Today focus both mount this on the
 * drill hub. The feed is cached under one stable key so those mounts share a
 * single read, and every optimistic flip below writes to that shared cache,
 * so the bell's count and the Today item can never disagree.
 */
export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markSignupNotificationsRead: () => Promise<void>;
  approveSignup: (id: string) => Promise<void>;
  dismissSignup: (id: string) => Promise<void>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const queryKey = notificationsQueryKey(userId);
  const actor = useRef(userId);
  actor.current = userId;
  const unreadQuery = useQuery<number, Error>({
    queryKey: notificationsUnreadQueryKey(userId), enabled: !!userId,
    staleTime: 30_000, refetchOnWindowFocus: true,
    queryFn: () => loadNotificationsUnreadCount(userId!),
  });

  const query = useQuery<Notification[], Error>({
    queryKey,
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => loadNotifications(userId!),
  });

  const notifications = query.isError ? EMPTY : query.data ?? EMPTY;

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
  }, [queryClient, userId]);

  const patch = useCallback(
    async (fn: (prev: Notification[]) => Notification[]) => {
      if (!userId || actor.current !== userId) return;
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey(userId) });
      if (actor.current !== userId) return;
      const previous = queryClient.getQueryData<Notification[]>(notificationsQueryKey(userId)) ?? [];
      const next = fn(previous);
      const delta = next.filter((n) => !n.read).length - previous.filter((n) => !n.read).length;
      queryClient.setQueryData(notificationsQueryKey(userId), next);
      queryClient.setQueryData<number>(notificationsUnreadQueryKey(userId), (count) =>
        count === undefined ? count : Math.max(0, count + delta));
    },
    [queryClient, userId]
  );

  // Realtime: a new row or read-flag flip on this user's feed refreshes state.
  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
    };
    const handleRead = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) invalidate();
    };
    window.addEventListener("inbox:read", handleRead);
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        invalidate
      )
      .subscribe();
    return () => {
      window.removeEventListener("inbox:read", handleRead);
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic: flip locally first so the dropdown closes without flicker.
      if (!userId || actor.current !== userId) return;
      await patch((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (actor.current !== userId) return;
      const { error: err } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("read", false);
      if (err) {
        console.error("[notifications:mark-read] failed", { id, error: err });
        // Reconcile — realtime will deliver the true state on next event, but
        // a failed update means the optimistic flip was wrong.
      }
      void refresh();
    },
    [userId, patch, refresh]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    if (actor.current !== userId) return;
    await patch((prev) => prev.map((n) => ({ ...n, read: true })));
    if (actor.current !== userId) return;
    queryClient.setQueryData(notificationsUnreadQueryKey(userId), 0);
    if (actor.current !== userId) return;
    const { error: err } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (err) {
      console.error("[notifications:mark-all-read] failed", { userId, error: err });
    }
    void refresh();
  }, [userId, queryClient, patch, refresh]);

  const markSignupNotificationsRead = useCallback(async () => {
    if (!userId || actor.current !== userId) return;

    await patch((prev) =>
      prev.map((notification) =>
        notification.type === "signup"
          ? { ...notification, read: true }
          : notification
      )
    );

    if (actor.current !== userId) return;
    const { error: err } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("type", "signup")
      .eq("read", false);

    if (err) {
      console.error("[notifications:mark-signups-read] failed", { userId, error: err });
    }
    void refresh();
  }, [userId, notifications, patch, refresh]);

  // Approve / dismiss both go through SECURITY DEFINER RPCs: granting access is
  // an admin-only privilege escalation, so it must never be a client-side table
  // write the account being approved could reproduce.
  const runSignupAction = useCallback(
    async (
      fn: "approve_signup" | "dismiss_signup",
      id: string,
      nextStatus: NotificationStatus
    ) => {
      if (!userId || actor.current !== userId) return;
      const previous = notifications;
      await patch((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: nextStatus, read: true } : n))
      );
      if (actor.current !== userId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc(fn, {
        p_notification_id: id,
      });
      if (err) {
        console.error(`[notifications:${fn}] failed`, { id, error: err });
        // The RPC is the authority on whether access actually changed; never
        // leave the bell claiming an approval that did not land.
        await patch(() => previous);
        void refresh();
        throw new Error(err.message);
      }
    },
    [userId, notifications, patch, refresh]
  );

  const approveSignup = useCallback(
    (id: string) => runSignupAction("approve_signup", id, "approved"),
    [runSignupAction]
  );

  const dismissSignup = useCallback(
    (id: string) => runSignupAction("dismiss_signup", id, "dismissed"),
    [runSignupAction]
  );

  const unreadCount = useMemo(
    () => unreadQuery.data ?? notifications.filter((n) => !n.read).length,
    [unreadQuery.data, notifications]
  );

  return {
    notifications,
    unreadCount,
    loading: !!userId && (query.isPending || unreadQuery.isPending),
    error: query.error?.message ?? unreadQuery.error?.message ?? null,
    refresh,
    markRead,
    markAllRead,
    markSignupNotificationsRead,
    approveSignup,
    dismissSignup,
  };
}
