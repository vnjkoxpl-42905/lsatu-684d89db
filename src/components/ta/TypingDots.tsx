import { motion } from "framer-motion";

/**
 * Three staggered-pulse dots for the TA-is-thinking indicator. Replaces the
 * previous text + spinner in TAChatView.
 */
export default function TypingDots() {
  return (
    <div
      role="status"
      aria-label="TA is thinking"
      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 bg-zinc-800"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-zinc-400"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{
            duration: 1.0,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
