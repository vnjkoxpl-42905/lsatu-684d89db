import { useMotionValue, motion } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";
import FoyerChatButton from "@/components/foyer/FoyerChatButton";

/**
 * Top-right Foyer cluster. Holds the inbox preview button (Popover with
 * recent threads + link to full Inbox) and the notifications bell. The
 * bottom-right FloatingMessenger is a separate compact chat widget.
 */
export default function FoyerDock() {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-2.5 rounded-full border border-border/40 bg-background/70 px-2.5 py-1.5 shadow-sm shadow-black/5 backdrop-blur-md"
      role="toolbar"
      aria-label="Main Hub dock"
    >
      <FoyerChatButton mouseX={mouseX} />
      <NotificationBell mouseX={mouseX} />
    </motion.div>
  );
}
