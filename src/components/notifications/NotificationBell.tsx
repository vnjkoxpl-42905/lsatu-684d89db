import { assignmentNotificationNavigation } from '@/lib/assignmentNotificationRoute';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { subscribeNotifications } from "./notificationsBus";
import { NotificationsList } from "./NotificationsList";

// Mirrors the magnify-on-hover DockItem in MainhubDock.tsx exactly. We re-build
// the motion wrapper here instead of importing because the Bell needs to be
// the Popover anchor — the PopoverTrigger replaces the DockItem's <button>.
interface Props {
  mouseX: MotionValue<number>;
  quiet?: boolean;
}

export default function NotificationBell({ mouseX, quiet = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    approveSignup,
    dismissSignup,
  } = useNotifications();
  const { is_admin } = useUserPermissions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);

  useEffect(() => subscribeNotifications(() => setOpen(true)), []);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], quiet ? [34, 34, 34] : [44, 72, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });
  const iconScaleSync = useTransform(width, quiet ? [34, 72] : [44, 72], quiet ? [1, 1] : [1, 1.4]);
  const iconScale = useSpring(iconScaleSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const handleClick = async (n: Notification) => {
    const destination = assignmentNotificationNavigation(n);
    if (!n.read && destination.acknowledgeOnClick) void markRead(n.id);
    setOpen(false);
    if (destination.route) {
      if (/^https?:\/\//i.test(destination.route)) window.location.assign(destination.route);
      else navigate(destination.route);
    }
  };

  // The popover deliberately stays open: approving one signup should not cost
  // the admin the rest of the queue.
  const handleSignupAction = async (n: Notification, approve: boolean) => {
    setBusySignupId(n.id);
    const who = (n.body ?? "").split(" just signed up")[0] || "This signup";
    try {
      await (approve ? approveSignup(n.id) : dismissSignup(n.id));
      toast(
        approve
          ? { title: "Access granted", description: `${who} can now use the platform.` }
          : { title: "Signup dismissed", description: `${who} was left without access.` }
      );
    } catch (err) {
      toast({
        title: approve ? "Could not grant access" : "Could not dismiss",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusySignupId(null);
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn(
        "relative aspect-square rounded-lg transition-colors",
        quiet
          ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          : "rounded-full bg-foreground text-background"
      )}
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
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              quiet
                ? "rounded-lg"
                : "rounded-full hover:ring-2 hover:ring-primary/40"
            )}
          >
            <motion.div
              style={{ scale: iconScale }}
              className="flex items-center justify-center"
            >
              <Bell className={quiet ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
            </motion.div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-[min(360px,calc(100vw-2rem))] p-0"
        >
          <NotificationsList
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationClick={(notification) => void handleClick(notification)}
            onMarkAllRead={() => void markAllRead()}
            onApproveSignup={
              is_admin ? (n) => void handleSignupAction(n, true) : undefined
            }
            onDismissSignup={
              is_admin ? (n) => void handleSignupAction(n, false) : undefined
            }
            busySignupId={busySignupId}
            listClassName="max-h-[360px]"
          />
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
