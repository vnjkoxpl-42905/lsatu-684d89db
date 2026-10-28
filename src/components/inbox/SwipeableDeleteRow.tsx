import type { ReactNode } from "react";
import { useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REVEAL_PX = 176;
const SWIPE_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

/**
 * Pointer-agnostic destructive row action.
 *
 * Touch users drag left, while mouse and keyboard users use the trash button.
 * Both paths only reveal the actions. Deletion always needs an explicit press,
 * and Cancel restores the row without changing data.
 */
export function SwipeableDeleteRow({
  children,
  label,
  onDelete,
  rounded = "rounded-xl",
  actionLabel = "Delete",
  actionGerund = "deleting",
}: {
  children: ReactNode;
  label: string;
  onDelete: () => void;
  rounded?: string;
  /**
   * The verb on the confirm button. Home clears a message off the page rather
   * than deleting it, and the button has to say which one it is doing.
   */
  actionLabel?: string;
  /** The same verb in "Cancel …ing", which English will not derive for us. */
  actionGerund?: string;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const close = () => {
    setOpen(false);
    void controls.start({
      x: 0,
      transition: reduce ? { duration: 0 } : SWIPE_SPRING,
    });
  };

  const reveal = () => {
    setOpen(true);
    void controls.start({
      x: -REVEAL_PX,
      transition: reduce ? { duration: 0 } : SWIPE_SPRING,
    });
  };

  const remove = () => {
    setOpen(false);
    if (reduce) {
      onDelete();
      return;
    }
    void controls
      .start({
        x: -640,
        opacity: 0,
        transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
      })
      .then(onDelete);
  };

  return (
    <div className={cn("group/swipe relative select-none overflow-hidden", rounded)}>
      <div
        aria-hidden={!open}
        className={cn(
          "absolute inset-y-0 right-0 flex w-44",
          "transition-opacity duration-150",
          dragging || open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label={`Cancel ${actionGerund} ${label}`}
          tabIndex={open ? 0 : -1}
          className="flex min-w-0 flex-1 items-center justify-center bg-stone-200 px-3 text-xs font-bold text-stone-700 hover:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label={`${actionLabel} ${label}`}
          tabIndex={open ? 0 : -1}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_PX, right: 0 }}
        dragElastic={{ left: 0.04, right: 0 }}
        animate={controls}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_, info) => {
          setDragging(false);
          const { offset, velocity } = info;
          if (offset.x < -REVEAL_PX / 3 || velocity.x < -260) reveal();
          else close();
        }}
        className={cn("relative touch-pan-y bg-transparent", rounded)}
      >
        {children}
        {open ? (
          <button
            type="button"
            onClick={close}
            aria-label={`Close actions for ${label}`}
            className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          />
        ) : null}
      </motion.div>

      {!open ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            reveal();
          }}
          className={cn(
            "absolute right-2.5 top-2.5 z-20 flex h-11 w-11 items-center justify-center rounded-lg transition-opacity",
            "opacity-0 group-hover/swipe:opacity-100 focus-visible:opacity-100",
            "bg-background/80 text-muted-foreground shadow-sm hover:bg-red-500/10 hover:text-red-600",
          )}
          aria-label={`Show ${actionLabel.toLowerCase()} actions for ${label}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
