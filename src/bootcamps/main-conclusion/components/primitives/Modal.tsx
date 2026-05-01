import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  ariaLabelledBy?: string;
  size?: Size;
  /** Hide the close button (consumer renders their own actions). */
  hideClose?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  ariaLabelledBy,
  size = 'md',
  hideClose = false,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the dialog when it opens
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'relative w-[92vw] rounded-4 p-6',
              'bg-[image:var(--grad-surface-elev)]',
              'border border-[color:var(--border-accent-soft)]',
              'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
              'focus:outline-none',
              SIZE[size],
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-4 bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
            />
            {title || !hideClose ? (
              <div className="mb-3 flex items-start justify-between gap-3">
                {title ? (
                  <h2 id={ariaLabelledBy} className="font-mc-serif text-h2 font-semibold text-ink">
                    {title}
                  </h2>
                ) : (
                  <span aria-hidden="true" />
                )}
                {!hideClose ? (
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      'bg-transparent text-ink-faint hover:text-ink hover:bg-[rgb(var(--ink)/0.08)]',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                      'transition-colors duration-150 ease-eased',
                    )}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
