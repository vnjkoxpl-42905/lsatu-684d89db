

## Root cause (verified by reading `AcademyFoyer.tsx` + `WelcomeLoading.tsx`)

The dock has **zero admin conditional** — it renders identically for everyone, gated only on `phase === "idle"`. So the dock isn't being suppressed *because* the user is admin. It's being suppressed because the phase state machine isn't reaching `"idle"`.

Phase progression on fresh login:
1. `phase = "ghost"` (WelcomeLoading mounts)
2. VaporizeText finishes → `setVisible(false)` inside WelcomeLoading
3. AnimatePresence exit completes → `onComplete()` fires → `phase = "materializing"`
4. After 2400ms timer → `phase = "idle"` → dock renders

If any link in that chain stalls — VaporizeText canvas onComplete doesn't fire, or AnimatePresence.onExitComplete doesn't fire (a known Framer Motion edge case when components unmount mid-transition), or the 2400ms timeout is cleared by an unmount/remount — phase stays at `ghost` or `materializing` and the dock never shows.

The screenshot is consistent with this: orbital labels are visible (they appear during `materializing` and `idle`) but the dock isn't (only appears in `idle`). The user may have stalled at `materializing`, or the welcome handoff dropped a callback.

This is **not admin-specific**. The admin probably hits it more reliably because of double `SIGNED_IN` events (visible in console) causing a remount mid-handoff.

## Fix (minimal, scope-tight)

Single file: `src/pages/AcademyFoyer.tsx`.

Add a **phase-watchdog** effect:
- If `phase` is `"ghost"` or `"materializing"` AND no `WelcomeLoading` is mounted (`!showWelcome`), force `phase = "idle"` after a short safety delay (e.g. 3000ms — longer than the 2400ms legitimate materialize window).
- This guarantees the dock renders if the state machine ever stalls, without short-circuiting the legitimate animation path.

That's it. No IA changes, no command palette, no top-right Shield change, no AdminDashboard change, no useInbox change, no dock items change. Welcome animation, orbital hub, and existing student behavior all unchanged.

## Confirmations requested

1. **Root cause**: phase state machine can stall in `ghost`/`materializing` if the WelcomeLoading→handoff chain drops a callback (most likely due to the double `SIGNED_IN` remount visible in console). Not an admin-specific code path — admin just hits it more reliably.
2. **Files changed**: `src/pages/AcademyFoyer.tsx` only. Add one `useEffect` watchdog. ~10 lines.
3. **Why no broader admin IA in this pass**: per your instruction — first pass is correctness only. Admin operator structure (dock items, command palette, classroom/analytics/admin-console placement) is a separate recommendation pass after this fix is verified.

## Files

- `src/pages/AcademyFoyer.tsx` — add phase watchdog effect

## Out of scope (deferred to next pass)

- Admin-specific dock items
- Command palette
- Top-right Shield removal
- AdminDashboard query params
- useInbox changes

