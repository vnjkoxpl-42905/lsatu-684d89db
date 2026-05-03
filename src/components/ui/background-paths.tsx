"use client";
import { memo } from "react";

/**
 * BackgroundPaths — formerly an animated 72-path SVG cosmic backdrop. Gutted as
 * part of the Arc-replica homepage redesign (2026-05-03). The export is kept
 * because `src/pages/Home.tsx` line 304 still imports it inside its Foyer hero
 * Card. The Card already provides its own dark backdrop + Spotlight + Spline
 * scene, so rendering nothing here leaves Home visually intact (just flatter).
 *
 * Memoized so any parent re-render is a no-op.
 */
export const BackgroundPaths = memo(function BackgroundPaths() {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
        />
    );
});

/**
 * BackgroundPathsHero — formerly the canonical 21st.dev animated hero. Not
 * imported anywhere in `src/` after the redesign. Kept as an empty stub so any
 * stale demo import elsewhere in the workspace doesn't error at build time.
 */
export function BackgroundPathsHero(_props: { title?: string }) {
    return null;
}
