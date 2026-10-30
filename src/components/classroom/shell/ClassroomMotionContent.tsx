import { useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { classroomMotionKey, useClassroomMotion } from '@/hooks/useClassroomMotion';

/** Place inside Suspense. This stable boundary never keys or owns route state. */
export function ClassroomMotionContent({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useClassroomMotion(ref, classroomMotionKey(location.pathname, location.search));
  return <div ref={ref} className="classroom-motion-root" style={{ display: 'contents' }}>{children}</div>;
}
