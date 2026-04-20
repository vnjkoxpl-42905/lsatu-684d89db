

User wants the HextaUI Apple-style magnify dock hover behavior applied to the existing FoyerDock at the bottom of `/foyer`. The source uses Next.js `Link` and `motion/react` — adapt to react-router + already-installed `framer-motion`. Keep the 3 existing buttons (Inbox+badge, Notifications, Help) and their handlers.

### Change — `src/components/foyer/FoyerDock.tsx` (rewrite, single file)

1. Imports: add `useRef` and from `framer-motion`: `motion`, `useMotionValue`, `useSpring`, `useTransform`, type `MotionValue`.
2. Container becomes `motion.div` with `onMouseMove={(e) => mouseX.set(e.pageX)}` and `onMouseLeave={() => mouseX.set(Infinity)}`. Keep current pill styling (`rounded-full border border-border/60 bg-background/80 backdrop-blur-md shadow-lg`) plus `role="toolbar"`.
3. New internal `DockItem` component:
   - Props: `mouseX: MotionValue<number>`, `onClick`, `ariaLabel`, `children`, optional `badge`.
   - `ref` on outer `motion.div`; compute `distance = mouseX - (rect.x + rect.width/2)`.
   - `widthSync = useTransform(distance, [-150, 0, 150], [44, 72, 44])` then `useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })`.
   - `iconScale = useTransform(width, [44, 72], [1, 1.4])` → `useSpring` same config.
   - Render `motion.div` (style `{ width }`, aspect-square, rounded-full, `bg-foreground text-background`) wrapping a real `<button type="button">` (full size, focus-visible ring, `aria-label`, `onClick`) which contains a `motion.div` with `style={{ scale: iconSpring }}` holding the icon and optional badge.
4. Render 3 DockItems: Inbox (navigate `/inbox`, badge from `useInbox().unreadCount`, dynamic aria-label), Bell (toast "Notifications coming soon"), LifeBuoy (toast "Help center coming soon").
5. Preserve mobile: hover magnify naturally idles on touch (mouseX stays Infinity → all items at base 44px). Keep min 44px touch target.
6. No new dependencies. No other files changed.

### Verification

- `/foyer` dock shows 3 buttons in the same position; cursor sweep magnifies the nearest icon smoothly with neighbors easing.
- Inbox click → `/inbox`; unread badge still renders top-right.
- Bell + Help still toast "coming soon".
- Keyboard tab focus shows ring on each button; touch on mobile still works at base size.
- No console errors.

