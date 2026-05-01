import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  ariaLabelledBy?: string;
}

export function Modal({ open, onClose, title, children, ariaLabelledBy }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy}>
      <div className="absolute inset-0 bg-black/60 motion-safe:animate-in motion-safe:fade-in" onClick={onClose} />
      <div className="relative max-w-lg w-[92vw] rounded-4 bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.12)] p-6 shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95">
        {title ? <h2 className="font-mc-serif text-h2 font-semibold mb-3">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
