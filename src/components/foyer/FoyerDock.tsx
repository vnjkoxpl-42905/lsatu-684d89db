import { useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useInbox } from "@/hooks/useInbox";
import NotificationBell from "@/components/notifications/NotificationBell";

interface DockItemProps {
  mouseX: MotionValue<number>;
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  badge?: ReactNode;
}

function DockItem({ mouseX, onClick, ariaLabel, children, badge }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [44, 72, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const iconScaleSync = useTransform(width, [44, 72], [1, 1.4]);
  const iconScale = useSpring(iconScaleSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative aspect-square rounded-full bg-foreground text-background"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="absolute inset-0 flex items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <motion.div
          style={{ scale: iconScale }}
          className="flex items-center justify-center"
        >
          {children}
        </motion.div>
      </button>
      {badge}
    </motion.div>
  );
}

export default function FoyerDock() {
  const navigate = useNavigate();
  const { unreadCount } = useInbox();
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-2.5 rounded-full border border-border/40 bg-background/70 px-2.5 py-1.5 shadow-sm shadow-black/5 backdrop-blur-md"
      role="toolbar"
      aria-label="Foyer dock"
    >
      <DockItem
        mouseX={mouseX}
        onClick={() => navigate("/inbox")}
        ariaLabel={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"}
        badge={
          unreadCount > 0 ? (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : undefined
        }
      >
        <Inbox className="h-5 w-5" aria-hidden />
      </DockItem>

      <NotificationBell mouseX={mouseX} />

      <DockItem
        mouseX={mouseX}
        onClick={() => toast.info("Help center coming soon")}
        ariaLabel="Help"
      >
        <LifeBuoy className="h-5 w-5" aria-hidden />
      </DockItem>
    </motion.div>
  );
}
