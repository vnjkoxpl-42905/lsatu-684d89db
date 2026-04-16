

# Add AnimatedDock Component

## What needs to happen

Copy the provided `animated-dock.tsx` component into `src/components/ui/` with three adaptations for this project's stack:

1. **Import path**: Change `from "motion/react"` to `from "framer-motion"` (already installed; the `motion` package is not).
2. **Remove Next.js dependency**: Replace `Link` from `next/link` with a plain `<a>` tag (external links with `target="_blank"`). This is a React/Vite project.
3. **Use existing `cn` util**: Import from `@/lib/utils` instead of defining a local `cn`.

No new npm installs needed — `clsx`, `tailwind-merge`, and `framer-motion` are all already in the project.

## File created

**`src/components/ui/animated-dock.tsx`** — the component with the three adaptations above. No other files changed.

