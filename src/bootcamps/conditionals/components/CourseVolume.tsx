import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

const spring = { stiffness: 160, damping: 18, mass: 0.6 };

/**
 * A chapter as a dimensional volume: a slice of the course artwork that tilts toward the pointer,
 * with its numeral and text layered above it. The artwork's tone is the chapter's real progress.
 * Fine pointers only; touch and reduced motion get the same card without tilt.
 */
export function CourseVolume({ to, slice, progress, here, complete, children, label }: {
  to: string; slice: number; progress: number; here?: boolean; complete?: boolean; children: ReactNode; label: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const glareX = useTransform(px, value => `${value * 100}%`);
  const glareY = useTransform(py, value => `${value * 100}%`);
  function move(event: React.PointerEvent) {
    if (reduce || event.pointerType !== 'mouse' || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  }
  function leave() { px.set(0.5); py.set(0.5); }
  return <Link ref={ref} to={to} className="oc-vol" aria-label={label} data-here={here || undefined} data-complete={complete || undefined}
    style={{ '--slice': slice, '--p': progress } as CSSProperties} onPointerMove={move} onPointerLeave={leave}>
    <motion.span className="oc-vol-body" style={reduce ? undefined : { rotateX, rotateY, '--gx': glareX, '--gy': glareY } as never}>
      <span className="oc-vol-art" aria-hidden/>
      <span className="oc-vol-mist" aria-hidden/>
      <span className="oc-vol-veil" aria-hidden/>
      <span className="oc-vol-glare" aria-hidden/>
      {children}
    </motion.span>
  </Link>;
}
