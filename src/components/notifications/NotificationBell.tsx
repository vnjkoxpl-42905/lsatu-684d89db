import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Clock,
  Flame,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useNotifications,
  type Notification,
  type NotificationType,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

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
  }
}

// Mirrors the magnify-on-hover DockItem in FoyerDock.tsx exactly. We re-build
// the motion wrapper here instead of importing because the Bell needs to be
// the Popover anchor — the PopoverTrigger replaces the DockItem's <button>.
interface Props {
  mouseX: MotionValue<number>;
}

export default function NotificationBell({ mouseX }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], [44, 72, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });
  const iconScaleSync = useTransform(width, [44, 72], [1, 1.4]);
  const iconScale = useSpring(iconScaleSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const handleClick = async (n: Notification) => {
    if (!n.read) void markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative aspect-square rounded-full bg-foreground text-background"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            className="absolute inset-0 flex items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <motion.div
              style={{ scale: iconScale }}
              className="flex items-center justify-center"
            >
              <Bell className="h-5 w-5" aria-hidden />
            </motion.div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-[min(360px,calc(100vw-2rem))] p-0"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <div className="text-sm font-semibold">Notifications</div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleClick(n)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-accent/50 transition-colors",
                      !n.read && "bg-accent/30"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                        !n.read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {typeIcon(n.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground/90 truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    {!n.read && (
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {unreadCount > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </motion.div>
  );
}
