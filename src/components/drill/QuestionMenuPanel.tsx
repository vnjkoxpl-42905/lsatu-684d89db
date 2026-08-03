import * as React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { questionBank, type LRQuestion } from '@/lib/questionLoader';

/**
 * The drill's slide-out menu: question metadata and related questions, plus
 * quick access to the notes drawer.
 *
 * Only rows that do something are rendered. Anything we cannot actually
 * deliver yet is left out rather than shown as a dead row — see the "no dead
 * buttons" rule in CLAUDE.md.
 */

interface QuestionMenuPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: LRQuestion | null;
  /** Opens the existing per-question notes drawer. */
  onOpenNotes?: () => void;
  /** Jump the drill to another question by qid. Omit to hide Find Similar. */
  onJumpToQuestion?: (qid: string) => void;
}

type View = 'root' | 'details' | 'similar';

function DetailRow({ label, value }: { label: string; value?: string | number | string[] | null }) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(', ') : value;
  if (text === undefined || text === null || text === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{String(text)}</span>
    </div>
  );
}

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-border px-1 py-4 text-left text-sm text-foreground transition-colors hover:bg-muted"
    >
      {label}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

export function QuestionMenuPanel({
  open,
  onOpenChange,
  question,
  onOpenNotes,
  onJumpToQuestion,
}: QuestionMenuPanelProps) {
  const [view, setView] = React.useState<View>('root');

  // Always reopen on the root menu, and reset when the question changes.
  React.useEffect(() => {
    if (open) setView('root');
  }, [open, question?.qid]);

  // Same question type, excluding the current one. Derived from the loaded
  // bank, so it reflects exactly what the student can actually navigate to.
  const similar = React.useMemo(() => {
    if (!question || view !== 'similar') return [];
    try {
      return questionBank
        .getAllQuestions()
        .filter((q) => q.qtype === question.qtype && q.qid !== question.qid)
        .slice(0, 25);
    } catch {
      return [];
    }
  }, [question, view]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {view !== 'root' && (
              <button
                type="button"
                onClick={() => setView('root')}
                aria-label="Back to menu"
                className="rounded p-1 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {view === 'root' ? 'Menu' : view === 'details' ? 'Question Details' : 'Find Similar'}
          </SheetTitle>
        </SheetHeader>

        {view === 'root' && (
          <div className="mt-4">
            <MenuRow label="Question Details" onClick={() => setView('details')} />
            {onJumpToQuestion && <MenuRow label="Find Similar" onClick={() => setView('similar')} />}
            {onOpenNotes && (
              <MenuRow
                label="Notes"
                onClick={() => {
                  onOpenChange(false);
                  onOpenNotes();
                }}
              />
            )}
          </div>
        )}

        {view === 'details' && (
          <div className="mt-4">
            <DetailRow label="PrepTest" value={question?.pt} />
            <DetailRow label="Section" value={question?.section} />
            <DetailRow label="Question" value={question?.qnum} />
            <DetailRow label="Type" value={question?.qtype} />
            <DetailRow label="Reasoning" value={question?.reasoningType} />
            <DetailRow label="Features" value={question?.questionFeatures} />
            <DetailRow label="Difficulty" value={question?.difficulty} />
          </div>
        )}

        {view === 'similar' && (
          <div className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              {similar.length > 0
                ? `Other ${question?.qtype} questions in the bank.`
                : 'No other questions of this type are loaded.'}
            </p>
            {similar.map((q) => (
              <button
                key={q.qid}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onJumpToQuestion?.(q.qid);
                }}
                className={cn(
                  'flex w-full items-center justify-between border-b border-border px-1 py-3',
                  'text-left text-sm text-foreground transition-colors hover:bg-muted',
                )}
              >
                <span>
                  PT{q.pt} · S{q.section} · Q{q.qnum}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default QuestionMenuPanel;
