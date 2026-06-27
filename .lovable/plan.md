Add center-stage scroll reset on pathname change inside StudentShell.

Current state: `StudentShell.tsx` already wraps `<Outlet>` in `AnimatePresence` keyed by `location.pathname` with the blur + fade + rise motion. The missing piece is scroll position — when a student clicks a sidebar item, the new page content retains the previous page’s scroll offset because the `<main overflow-y-auto>` element is not reset.

What to build:
1. In `src/components/mainhub/StudentShell.tsx`, attach a ref to the `<main>` element.
2. Add a `useEffect` keyed on `location.pathname` that calls `mainRef.current.scrollTo({ top: 0, behavior: "smooth" })` (or `"auto"` if `reduceMotion` is true).
3. Verify the existing `AnimatePresence` + `motion.div` transition still plays consistently across every StudentShell route after the scroll reset is added.

No other files touched. The blur + fade + rise animation already exists and should stay exactly as-is.