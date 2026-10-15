import { useCallback, useEffect, useMemo } from "react";
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
  return (data ?? []) as Notification[];
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
    (fn: (prev: Notification[]) => Notification[]) => {
      queryClient.setQueryData<Notification[]>(notificationsQueryKey(userId), (prev) =>
        fn(prev ?? [])
      );
    },
    [queryClient, userId]
  );

  // Realtime: a new row or read-flag flip on this user's feed refreshes state.
  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
    };
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
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic: flip locally first so the dropdown closes without flicker.
      patch((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      const { error: err } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("read", false);
      if (err) {
        console.error("[notifications:mark-read] failed", { id, error: err });
        // Reconcile — realtime will deliver the true state on next event, but
        // a failed update means the optimistic flip was wrong.
        void refresh();
      }
    },
    [patch, refresh]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    patch((prev) => prev.map((n) => ({ ...n, read: true })));
    const { error: err } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (err) {
      console.error("[notifications:mark-all-read] failed", { userId, error: err });
      void refresh();
    }
  }, [userId, notifications, patch, refresh]);

  const markSignupNotificationsRead = useCallback(async () => {
    if (!userId) return;
    const hasUnreadSignups = notifications.some(
      (notification) => notification.type === "signup" && !notification.read
    );
    if (!hasUnreadSignups) return;

    patch((prev) =>
      prev.map((notification) =>
        notification.type === "signup"
          ? { ...notification, read: true }
          : notification
      )
    );

    const { error: err } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("type", "signup")
      .eq("read", false);

    if (err) {
      console.error("[notifications:mark-signups-read] failed", { userId, error: err });
      void refresh();
    }
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
      const previous = notifications;
      patch((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: nextStatus, read: true } : n))
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc(fn, {
        p_notification_id: id,
      });
      if (err) {
        console.error(`[notifications:${fn}] failed`, { id, error: err });
        // The RPC is the authority on whether access actually changed; never
        // leave the bell claiming an approval that did not land.
        patch(() => previous);
        void refresh();
        throw new Error(err.message);
      }
    },
    [notifications, patch, refresh]
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
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    loading: !!userId && query.isPending,
    error: query.error?.message ?? null,
    refresh,
    markRead,
    markAllRead,
    markSignupNotificationsRead,
    approveSignup,
    dismissSignup,
  };
}
