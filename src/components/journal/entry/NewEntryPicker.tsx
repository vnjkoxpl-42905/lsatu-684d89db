/**
 * NewEntryPicker — a dialog to add any question to the journal manually.
 * Search by question ID (PT/Section/Q), qid, or type; pick one to create a
 * neutral journal entry (no attempt) the student then reviews.
 */
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { questionBank } from '@/lib/questionLoader';
import type { LRQuestion } from '@/lib/questionLoader';

const MAX_RESULTS = 60;

function label(q: LRQuestion): string {
  return `PT${q.pt}.S${q.section}.Q${q.qnum}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (q: LRQuestion) => void;
}

export function NewEntryPicker({ open, onOpenChange, onPick }: Props) {
  const [search, setSearch] = React.useState('');

  // Defer the (potentially large) bank read until the dialog is open.
  const all = React.useMemo(() => {
    if (!open) return [];
    try {
      return questionBank.getAllQuestions();
    } catch {
      return [];
    }
  }, [open]);

  const results = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const src = q
      ? all.filter(
          (item) =>
            label(item).toLowerCase().includes(q) ||
            item.qid.toLowerCase().includes(q) ||
            item.qtype.toLowerCase().includes(q),
        )
      : all;
    return src.slice(0, MAX_RESULTS);
  }, [all, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a question to your journal</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PT, section, question, or type…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No questions match.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((q) => (
                <li key={q.qid}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(q);
                      onOpenChange(false);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
                  >
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {label(q)}
                    </span>
                    <span className="text-[12px] text-foreground/80">{q.qtype}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Showing up to {MAX_RESULTS} matches. Refine your search to narrow.
        </p>
      </DialogContent>
    </Dialog>
  );
}
