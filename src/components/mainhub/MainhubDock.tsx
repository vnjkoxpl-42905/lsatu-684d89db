import { useMotionValue, motion } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";

/**
 * Compact Mainhub utility dock. Messages stay in the sidebar; this keeps only
 * notifications as a quiet utility.
 */
export default function MainhubDock() {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-center rounded-xl border border-border/40 bg-background/70 p-1 shadow-sm shadow-black/5 backdrop-blur-md"
      role="toolbar"
      aria-label="Classroom dock"
    >
      <NotificationBell mouseX={mouseX} quiet />
    </motion.div>
  );
}
