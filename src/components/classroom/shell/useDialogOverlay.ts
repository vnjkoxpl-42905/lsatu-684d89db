import * as React from "react";

/**
 * Modal semantics for the classroom's two hand-built overlays: the mobile menu
 * and the section list drawer.
 *
 * Both shipped as a backdrop <button> beside an <aside> carrying no attributes
 * at all. Measured before this hook existed: opening one left focus on the
 * element behind it, Escape did nothing, and Tab walked straight out of the
 * drawer into the page underneath, which is still rendered and still scrollable.
 *
 * Radix Dialog is in the tree and would supply all of this. It is deliberately
 * not used here: nine CSS rules key off `.classroom-section-overlay` and
 * `.classroom-mobile-menu`'s exact structure, and this file already hand-rolls
 * the same pattern for the profile menu. Matching the local idiom keeps the
 * change to behaviour rather than to markup and styling.
 *
 * Returns props to spread on the panel element. The caller keeps ownership of
 * open/close so the existing backdrop and close-button handlers still work.
 */
export function useDialogOverlay({
  open,
  onClose,
  label,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
}) {
  const panelRef = React.useRef<HTMLElement | null>(null);
  // Captured at open, restored at close. Without this, dismissing the drawer
  // drops focus to <body> and a keyboard user restarts from the top of the page.
  const returnTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    // Deferred by a timer rather than requestAnimationFrame on purpose. rAF does
    // not fire while the document is not being rendered (a background tab, or a
    // hidden preview pane), which would leave the drawer open with focus still
    // outside it. A timer runs either way.
    const focusIn = window.setTimeout(() => {
      const first = focusables()[0];
      (first ?? panelRef.current)?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Wrap at both ends, and pull focus back in if it has already escaped.
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusIn);
      document.removeEventListener("keydown", onKeyDown);
      // Only steal focus back if it is still inside the panel being unmounted.
      // Opening a note from the drawer moves focus deliberately; restoring here
      // would yank it back to the trigger the student just used.
      const active = document.activeElement;
      if (!active || active === document.body || panelRef.current?.contains(active)) {
        returnTo.current?.focus();
      }
    };
  }, [open, onClose]);

  return {
    ref: panelRef as React.RefObject<any>,
    role: "dialog" as const,
    "aria-modal": true,
    "aria-label": label,
    tabIndex: -1,
  };
}
