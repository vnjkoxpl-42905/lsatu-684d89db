import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import '@/components/section-report/sectionFinishPalette.css';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';

export function SectionFinishDialog({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-slate-900/20 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="light section-finish-palette fixed left-1/2 top-1/2 z-[101] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl sm:p-8"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <header className="space-y-2 border-b border-border pb-5">
            <DialogTitle className="font-serif text-3xl font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
