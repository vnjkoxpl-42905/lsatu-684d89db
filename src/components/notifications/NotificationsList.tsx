import type { ReactNode } from "react";
import {
  Clock,
  Flame,
  GraduationCap,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { formatRelativeShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

function typeIcon(type: NotificationType): ReactNode {
  switch (type) {
    case "assignment":
      return <GraduationCap className="h-4 w-4" aria-hidden />;
    case "message":
      return <MessageSquare className="h-4 w-4" aria-hidden />;
    case "reminder":
      return <Clock className="h-4 w-4" aria-hidden />;
    case "streak":
      return <Flame className="h-4 w-4" aria-hidden />;
    case "signup":
      return <UserPlus className="h-4 w-4" aria-hidden />;
  }
}

interface NotificationsListProps {
  notifications: Notification[];
  unreadCount: number;
  loading?: boolean;
  error?: string | null;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  title?: string;
  emptyLabel?: string;
  className?: string;
  listClassName?: string;
  compact?: boolean;
  showHeader?: boolean;
}

export function NotificationsList({
  notifications,
  unreadCount,
  loading = false,
  error = null,
  onNotificationClick,
  onMarkAllRead,
  title = "Notifications",
  emptyLabel = "No notifications yet",
  className,
  listClassName,
  compact = false,
  showHeader = true,
}: NotificationsListProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            onClick={() => onMarkAllRead?.()}
            disabled={unreadCount === 0 || !onMarkAllRead}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Mark all read
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Loading notifications...
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ul className={cn("min-h-0 divide-y divide-border overflow-y-auto", listClassName)}>
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => onNotificationClick(notification)}
                className={cn(
                  "flex w-full items-start gap-2.5 text-left transition-colors hover:bg-accent/50",
                  compact ? "px-3 py-3" : "px-3 py-2.5",
                  !notification.read && "bg-accent/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    !notification.read
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {typeIcon(notification.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground/90">
                    {notification.title}
                  </div>
                  {notification.body ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {notification.body}
                    </div>
                  ) : null}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelativeShort(notification.created_at)}
                  </div>
                </div>
                {!notification.read ? (
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
