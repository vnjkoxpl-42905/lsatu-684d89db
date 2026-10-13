import * as React from 'react';
import { NotebookPen, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAdminQuestionNote, type NoteStatus } from '@/hooks/useAdminQuestionNote';

const STATUS_LABEL: Record<NoteStatus, string> = {
  idle: '',
  loading: 'Loading',
  saving: 'Saving',
  saved: 'Saved',
  error: 'Not saved',
};

/**
 * Teaching notes under a drill question. Admin surface only.
 *
 * Rendered collapsed by default: on a screen share the note is Joshua's, not
 * the room's, and an always-open box under every question would be in the way
 * of the thing being taught. Opening it is one click, and it stays open across
 * questions for the rest of the drill so a teaching pass does not mean opening
 * it ten times.
 */
export function AdminQuestionNotes({
  qid,
  isAdmin,
  open,
  onOpenChange,
}: {
  qid: string | null;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { body, onChange, status, savedAt } = useAdminQuestionNote(qid, isAdmin);

  // The gate. A non-admin never mounts this, so there is no panel to reveal
  // with a devtools style tweak and no query to notice in the network tab.
  if (!isAdmin || !qid) return null;

  const hasNote = body.trim().length > 0;
  const statusLabel = STATUS_LABEL[status];

  return (
    <div className="mt-6 border-t pt-4 print:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="h-8 gap-2 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        <span>Teaching notes</span>
        {/* A dot rather than a count: enough to say "there is something here"
            without putting the content on the shared screen while collapsed. */}
        {hasNote && !open && (
          <span
            aria-label="This question has a note"
            className="h-1.5 w-1.5 rounded-full bg-foreground/50"
          />
        )}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <div className="mt-2 space-y-1.5">
          <Textarea
            value={body}
            onChange={(e) => onChange(e.target.value)}
            placeholder="What you want to say about this question next time you teach it."
            aria-label="Teaching notes for this question"
            className="min-h-[7rem] resize-y text-sm leading-relaxed"
            // Keyboard shortcuts on the drill page listen at the window. Without
            // this, typing "b" in a note would toggle blind review and the arrow
            // keys would walk to the next question mid-sentence.
            onKeyDown={(e) => e.stopPropagation()}
          />
          <div className="flex min-h-[1rem] items-center justify-between text-[11px] text-muted-foreground">
            <span>Only you can see this.</span>
            <span className={cn(status === 'error' && 'text-destructive')}>
              {statusLabel}
              {status === 'saved' && savedAt
                ? ` ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
