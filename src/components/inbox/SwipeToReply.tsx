import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPLY_MAX_TRAVEL_PX, REPLY_THRESHOLD_PX, reachedReplyThreshold } from './replyUtils';

interface Props {
  children: ReactNode;
  onReply: () => void;
  /** Turn the gesture off (system-generated cards, or a message with nothing to quote). */
  disabled?: boolean;
  /** Layout classes for the element that holds the content (what slides). */
  className?: string;
}

/**
 * iMessage-style pull to reply. Press and drag a message to the right (mouse or
 * finger); a reply arrow fades in, the message resists past a stop, and letting
 * go past the threshold opens a reply while the message springs back either way.
 *
 * Drag only claims the gesture once it is clearly horizontal, so scrolling the
 * thread and selecting text with the mouse keep working. With reduced motion on
 * there is no slide at all; the Reply button beside each message is the way in.
 */
export function SwipeToReply({ children, onReply, disabled = false, className }: Props) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const arrowOpacity = useTransform(x, [6, REPLY_THRESHOLD_PX], [0, 1]);
  const arrowScale = useTransform(x, [6, REPLY_THRESHOLD_PX], [0.55, 1]);
  const crossedRef = useRef(false);
  const draggedRef = useRef(false);

  if (disabled || reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative max-w-full min-w-0">
      <motion.span
        aria-hidden="true"
        style={{ opacity: arrowOpacity, scale: arrowScale }}
        className="pointer-events-none absolute left-1.5 top-1/2 z-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--msg-accent-soft)] text-[var(--msg-accent)]"
      >
        <Reply className="h-4 w-4" />
      </motion.span>
      <motion.div
        drag="x"
        dragDirectionLock
        dragMomentum={false}
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: REPLY_MAX_TRAVEL_PX }}
        dragElastic={{ left: 0, right: 0.12 }}
        dragTransition={{ bounceStiffness: 520, bounceDamping: 42 }}
        style={{ x }}
        onDragStart={() => {
          draggedRef.current = true;
          crossedRef.current = false;
          // A mouse press on text starts a selection before the drag is
          // recognised; drop it once we know this is a swipe.
          window.getSelection()?.removeAllRanges();
        }}
        onDrag={() => {
          const crossed = reachedReplyThreshold(x.get());
          if (crossed && !crossedRef.current && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate(8);
            } catch {
              /* haptics are a nicety; never let them break the gesture */
            }
          }
          crossedRef.current = crossed;
        }}
        onDragEnd={() => {
          const shouldReply = reachedReplyThreshold(x.get());
          crossedRef.current = false;
          // Swallow the click that follows a drag so it does not also toggle
          // the timestamp on the bubble underneath.
          window.setTimeout(() => {
            draggedRef.current = false;
          }, 0);
          if (shouldReply) onReply();
        }}
        onClickCapture={(event) => {
          if (draggedRef.current) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
        className={cn('relative z-10 touch-pan-y', className)}
      >
        {children}
      </motion.div>
    </div>
  );
}
