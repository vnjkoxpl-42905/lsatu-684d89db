import { useRef } from "react";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useInbox } from "@/hooks/useInbox";
import { useUserPermissions } from "@/hooks/useUserPermissions";

// Mirrors the magnify-on-hover DockItem pattern used by NotificationBell.
// Lives in the top-right Mainhub cluster (MainhubDock) and routes to the full
// Inbox. Distinct from the bottom-right Study Thread help widget.
interface Props {
  mouseX: MotionValue<number>;
}

export default function MainhubChatButton({ mouseX }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { unreadCount } = useInbox();
  const { has_chat_access, is_admin, loading } = useUserPermissions();

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

  if (loading) return null;
  if (!is_admin && !has_chat_access) return null;

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative aspect-square rounded-[1.1rem] border border-border/70 bg-background text-muted-foreground shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
    >
      <button
        type="button"
        onClick={() => navigate("/inbox")}
        aria-label={
          unreadCount > 0
            ? `Inbox, ${unreadCount} unread`
            : "Inbox"
        }
        title="Inbox"
        className="absolute inset-0 flex items-center justify-center rounded-[1.1rem] transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <motion.div
          style={{ scale: iconScale }}
          className="flex items-center justify-center"
        >
          <Mail className="h-5 w-5 stroke-[2.15]" aria-hidden />
        </motion.div>
      </button>

      {unreadCount > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </motion.div>
  );
}
