import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType =
  | "assignment"
  | "message"
  | "reminder"
  | "streak";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const PAGE_SIZE = 30;

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
} {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (err) {
      console.error("[notifications:list] failed", { userId: user.id, error: err });
      setError(err.message);
      setNotifications([]);
    } else {
      setNotifications((data ?? []) as Notification[]);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: a new row or read-flag flip on this user's feed refreshes state.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic: flip locally first so the dropdown closes without flicker.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
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
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (err) {
      console.error("[notifications:mark-all-read] failed", {
        userId: user.id,
        error: err,
      });
      void refresh();
    }
  }, [user, notifications, refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
