## Files I'll touch

- `src/components/mainhub/StudentShell.tsx` — only file. Wrap `<Outlet />` in an animated container keyed by route. No other files change.

## Approach

**Keying the animated wrapper**
- Import `useLocation` from `react-router-dom` and `motion`, `AnimatePresence` from `framer-motion`.
- Inside the existing `<main>` center stage, render:
  ```tsx
  <AnimatePresence mode="wait" initial={false}>
    <motion.div key={location.pathname} ...>
      <Outlet context={{ displayName }} />
    </motion.div>
  </AnimatePresence>
  ```
- Keying by `location.pathname` (not full `location`) so query/hash changes — e.g. `?ws=library&tab=...` on `/teacher`, sidecar toggles, study chat state — don't retrigger the transition. This avoids unwanted remounts inside Teacher Desk and similar tabbed surfaces.

**Outlet context preservation**
- `<Outlet context={{ displayName }} />` stays exactly as-is inside the motion wrapper. `useOutletContext()` in children continues to work — the motion div is just a DOM wrapper, it doesn't intercept Router context.

**Motion spec (LexPrep-style, translated, not copied)**
- initial: `{ opacity: 0, y: 12, filter: "blur(8px)" }`
- animate: `{ opacity: 1, y: 0, filter: "blur(0px)" }`
- exit: `{ opacity: 0, y: -4, filter: "blur(4px)" }`
- transition: `{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }` (matches Auth easing, sits in the 450–600ms band)
- The motion div gets `className="h-full w-full"` and `style={{ willChange: "opacity, transform, filter" }}` so it doesn't disturb existing layout/scroll inside `<main>`.

**Reduced motion**
- Use framer-motion's `useReducedMotion()` hook. When true, swap the variants to `{ opacity: 1, y: 0, filter: "none" }` with `duration: 0` — instant, clean swap. No blur, no rise.

**Scope guarantees**
- `/drill` and other LSAT takeover routes are registered outside `StudentShell` in `src/App.tsx`, so they're untouched.
- Sidebar (`MainhubSidebar`), `MainhubDock`, `MainhubAccountButton`, `StudySidecar`, and `MainhubHelpControl` remain siblings of `<main>` — they never unmount, their state (sidecar open, help open, mobile sheet) is preserved.
- Mobile sheet still closes via the existing `onNavigate={() => setMenuOpen(false)}` wiring — unchanged.
- No layout-property animation (no width/height). Only opacity, transform, filter.
- No StoryScroll, no shell-wide animation, no route restructuring.

## Acceptance check before I ship
- Click through Classroom → Bootcamps → Messages → Practice Hub → Activity Centre → Schedule → Journal → Analytics: shell stays, only stage animates with blur+fade+rise.
- Navigate to `/drill`: full takeover, no transition wrapper applies (it's outside the shell).
- Toggle sidecar mid-navigation: stays as set.
- macOS "Reduce motion" on: transitions become instant.

Confirm and I'll implement.
