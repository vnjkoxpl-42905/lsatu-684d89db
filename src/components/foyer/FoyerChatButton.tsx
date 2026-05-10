import { useRef } from "react";
import { MessageSquare } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useInbox } from "@/hooks/useInbox";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { openChat } from "@/components/inbox/chatBus";

// Mirrors the magnify-on-hover DockItem pattern used by NotificationBell.
// Lives in the top-right Foyer cluster (FoyerDock) and fires the chatBus
// to open the compact FloatingMessenger panel.
interface Props {
  mouseX: MotionValue<number>;
}

export default function FoyerChatButton({ mouseX }: Props) {
  const ref = useRef<HTMLDivElement>(null);
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

  // Hide for admins (they use AdminChatHub) and users without chat access.
  if (loading) return null;
  if (is_admin) return null;
  if (!has_chat_access) return null;

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative aspect-square rounded-full bg-foreground text-background"
    >
      <button
        type="button"
        onClick={() => openChat()}
        aria-label={
          unreadCount > 0
            ? `Messenger, ${unreadCount} unread`
            : "Messenger"
        }
        className="absolute inset-0 flex items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <motion.div
          style={{ scale: iconScale }}
          className="flex items-center justify-center"
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
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
