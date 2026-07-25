/** Inline icons, matching the prototype's stroke geometry exactly. */

const strokeProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function ChevronRight() {
  return (
    <svg {...strokeProps}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg {...strokeProps}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...strokeProps} width={14} height={14}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...strokeProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg {...strokeProps}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
    </svg>
  );
}

export function PenIcon() {
  return (
    <svg {...strokeProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export const META_ICONS = {
  clock: ClockIcon,
  book: BookIcon,
  pen: PenIcon,
} as const;
