import { useMotionValue, motion } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";

/**
 * Top-right Foyer cluster. Used to also hold an Inbox button — that has
 * moved into the customizable GooeyDock (catalog id "inbox") which now
 * supports unread badges. The bell stays here because it is the anchor
 * for the notifications Popover; the GooeyDock notifications item fires
 * the same Popover via the notificationsBus.
 */
export default function FoyerDock() {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-2.5 rounded-full border border-border/40 bg-background/70 px-2.5 py-1.5 shadow-sm shadow-black/5 backdrop-blur-md"
      role="toolbar"
      aria-label="Foyer dock"
    >
      <NotificationBell mouseX={mouseX} />
    </motion.div>
  );
}
