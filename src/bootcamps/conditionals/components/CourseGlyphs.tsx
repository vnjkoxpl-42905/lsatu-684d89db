// Symbols drawn for this course rather than taken from a stock set. Same 24px grid and stroke weight as lucide,
// so they sit beside the other navigation icons without looking pasted in.

type GlyphProps = { size?: number; className?: string };

/** A drill: one condition leading to another, the move every drill practises. */
export function DrillGlyph({ size = 18, className }: GlyphProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="6.5" cy="6.5" r="3.25"/>
    <path d="M9.25 9.25 13.6 13.6"/>
    <path d="M14 9.4v4.6H9.4"/>
    <circle cx="18" cy="18" r="3" fill="currentColor"/>
  </svg>;
}

/** Flashcards: a small stack, the back card turned. */
export function CardsGlyph({ size = 18, className }: GlyphProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="6.5" y="3.5" width="12" height="15" rx="2" transform="rotate(9 12.5 11)" opacity=".55"/>
    <rect x="4" y="6" width="12" height="15" rx="2"/>
    <path d="M7.5 11h5M7.5 14.5h3"/>
  </svg>;
}
