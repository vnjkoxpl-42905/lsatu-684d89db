

Add the HextaUI animated theme toggler with the circular view-transition reveal effect, but adapted to drive the existing `ThemeContext` (which uses an inverted `light` class on `<html>` + `lsatu-theme` localStorage key). Bypassing the context would desync every other component.

### Files

**1. New — `src/components/ui/animated-theme-toggler.tsx`**
- `"use client"` directive omitted (Vite, not Next).
- Uses `useTheme()` from `@/contexts/ThemeContext` instead of reading/writing `document.documentElement` directly.
- `darkMode = theme === 'dark'`.
- `onToggle`:
  - Feature-detect `document.startViewTransition`. If unsupported (Firefox/Safari older), just call `toggleTheme()` and return — graceful fallback.
  - If supported: `await document.startViewTransition(() => flushSync(() => toggleTheme())).ready`, then run the circular `clipPath` animation from the button center using `Math.hypot` to find max reach distance, 700ms ease-in-out on `::view-transition-new(root)`.
- Render a `<button ref>` with Framer Motion `AnimatePresence` swapping `Sun` (when dark) / `Moon` (when light) icons with the snippet's rotate+scale+opacity transition (~0.33s).
- Remove hard-coded `text-white` / `text-black` — use `text-foreground` so it reads on both themes; `className` prop still merges via `cn`.
- Default visual: rounded-full, p-2, focus rings off (matches snippet aesthetic).

**2. Edit — `src/components/ThemeToggle.tsx`**
- Re-export the new animated toggler so every existing usage (`ThemeToggle` is imported by Foyer, Bootcamps, AbstractionBootcamp, etc.) automatically gets the new behavior with no other file changes:
  ```tsx
  export { AnimatedThemeToggler as ThemeToggle } from '@/components/ui/animated-theme-toggler';
  ```
- Keeps the same component name + `className` prop API, so all call sites keep working.

### Why this approach

- Single source of truth preserved: `ThemeContext` still owns state + persistence. The animated toggler is purely presentation + view-transition orchestration.
- Zero call-site churn: every header that already renders `<ThemeToggle />` instantly gets the circular reveal animation.
- Works in non-Chromium browsers (View Transitions API still partial) via feature-detect fallback — theme still toggles, just without the radial wipe.
- No new dependencies (`framer-motion`, `lucide-react` already installed).

### Verification

- `/foyer` header: clicking the theme toggle triggers a circular reveal expanding from the button, swapping Sun↔Moon icons with rotate/scale.
- Theme actually flips (sidebar, ring, dock all re-skin) and persists across reload (`lsatu-theme` in localStorage).
- All other pages using `<ThemeToggle />` (Bootcamps, AbstractionBootcamp, etc.) inherit the same animation.
- No console errors in Chrome; falls back to instant toggle in Firefox/Safari without errors.
- Icon visible in both light and dark modes (uses `text-foreground`).

