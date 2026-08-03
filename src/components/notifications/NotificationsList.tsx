import type { ReactNode } from "react";
import {
  Check,
  Clock,
  Flame,
  GraduationCap,
  MessageSquare,
  UserPlus,
  X,
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

/**
 * The signup body reads "<name> just signed up and is waiting for access."
 * Pull the name back out for the button labels so a screen reader announces
 * who is being approved, not just "approve".
 */
const SIGNUP_BODY_SUFFIX = " just signed up and is waiting for access.";
function signupName(body: string | null): string {
  if (!body) return "this signup";
  return body.endsWith(SIGNUP_BODY_SUFFIX)
    ? body.slice(0, -SIGNUP_BODY_SUFFIX.length)
    : body;
}

interface NotificationsListProps {
  notifications: Notification[];
  unreadCount: number;
  loading?: boolean;
  error?: string | null;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  /** Admin-only. Omitted for students, which is what hides the ✓/✗ for them. */
  onApproveSignup?: (notification: Notification) => void;
  onDismissSignup?: (notification: Notification) => void;
  /** Notification id with an approve/dismiss in flight; disables its buttons. */
  busySignupId?: string | null;
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
  onApproveSignup,
  onDismissSignup,
  busySignupId = null,
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
          {notifications.map((notification) => {
            // Both handlers absent means the viewer is not an admin. Rendering
            // the controls anyway would put dead buttons on a student's screen.
            const pendingSignup =
              notification.type === "signup" &&
              notification.status === "pending" &&
              !!(onApproveSignup || onDismissSignup);
            return (
            <li key={notification.id} className="group/row flex items-start">
              <button
                type="button"
                onClick={() => onNotificationClick(notification)}
                className={cn(
                  // No w-full: flex-1 already claims the row, and w-full would
                  // push the approve/dismiss controls out past the card edge.
                  "flex min-w-0 flex-1 items-start gap-2.5 text-left transition-colors hover:bg-accent/50",
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
                {!notification.read && !pendingSignup ? (
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
              </button>
              {pendingSignup ? (
                <div
                  className={cn(
                    // self-stretch, not self-center: the unread tint has to
                    // cover the row's full height or it reads as a notch cut
                    // out of the right edge.
                    "flex shrink-0 items-center gap-1 self-stretch pr-3 transition-colors group-hover/row:bg-accent/50",
                    !notification.read && "bg-accent/30",
                  )}
                >
                  <button
                    type="button"
                    disabled={busySignupId === notification.id}
                    onClick={() => onApproveSignup?.(notification)}
                    title={`Approve access for ${signupName(notification.body)}`}
                    aria-label={`Approve access for ${signupName(notification.body)}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-600/40 text-emerald-600 transition-colors hover:bg-emerald-600/10 disabled:pointer-events-none disabled:opacity-40 dark:border-emerald-400/40 dark:text-emerald-400"
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={busySignupId === notification.id}
                    onClick={() => onDismissSignup?.(notification)}
                    title={`Dismiss the signup from ${signupName(notification.body)}`}
                    aria-label={`Dismiss the signup from ${signupName(notification.body)}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
