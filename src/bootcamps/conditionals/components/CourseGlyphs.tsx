import { GalleryVerticalEnd, Route } from 'lucide-react';

// The course's two recurring symbols, defined once so every surface uses the same mark for the same meaning.
// Chosen from lucide (the app's one icon pack) through Iconify, per ai-os design/symbols.md.

type GlyphProps = { size?: number; className?: string };

/** A drill: a route from one condition to its result. */
export function DrillGlyph({ size = 18, className }: GlyphProps) {
  return <Route size={size} strokeWidth={1.75} className={className} aria-hidden/>;
}

/** Flashcards: a deck, front card with the stack behind it. */
export function CardsGlyph({ size = 18, className }: GlyphProps) {
  return <GalleryVerticalEnd size={size} strokeWidth={1.75} className={className} aria-hidden/>;
}
