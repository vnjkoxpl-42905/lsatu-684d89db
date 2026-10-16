/**
 * JournalEntrySurface — the full /journal route body: a focused, LSAT-Journal-
 * style 3-pane deep-review journal that replaces the old Notion-style
 * workspace.
 *
 *   [ EntriesRail ]  [ JournalQuestionPane ]  [ ReviewForm ]
 *
 * Entries come from the class-scoped wrong_answer_journal (flagged / missed
 * questions), merged with the user's reflection note. The review fields
 * AUTOSAVE (debounced) — no Save button — and pin back onto the question as
 * inline callouts. A freehand annotation layer sits over the question.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ArrowLeft, Pencil, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';
import { useClassId } from '@/hooks/useClassId';
import { getWrongAnswerSmartRows, type WrongAnswerSmartRow } from '@/lib/journalService';
import { upsertNote, type AnnotationStroke } from '@/lib/wajNotesService';
import { ensureJournalEntry } from '@/lib/wajService';
import { questionBank, type LRQuestion } from '@/lib/questionLoader';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useToast } from '@/hooks/use-toast';
import { EntriesRail, outcomeOf, SECTION_BADGE } from './EntriesRail';
import { JournalQuestionPane } from './JournalQuestionPane';
import { ReviewForm, type JournalDraft } from './ReviewForm';
import { NewEntryPicker } from './NewEntryPicker';

interface JournalEntrySurfaceProps {
  embedded?: boolean;
}

const EMPTY_DRAFT: JournalDraft = {
  self_rating: null,
  date_taken: '',
  question_summary: '',
  wrong_answer: '',
  wrong_reasoning: '',
  correct_reasoning: '',
  lesson: '',
  other_notes: '',
};

const AUTO_COLLAPSE_AT = 2140;
const AUTO_EXPAND_AT = 2280;

function startsCompact(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= AUTO_COLLAPSE_AT;
}

function isoDate(d: string | null | undefined): string {
  if (!d) return '';
  return d.length >= 10 ? d.slice(0, 10) : d;
}

function seedDraft(row: WrongAnswerSmartRow): JournalDraft {
  const n = row.note;
  return {
    self_rating: n?.self_rating ?? (row.status === 'right' ? 'correct' : 'wrong'),
    date_taken: isoDate(n?.date_taken) || isoDate(row.first_missed),
    question_summary: n?.question_summary ?? '',
    wrong_answer: n?.wrong_answer ?? row.last_chosen ?? '',
    wrong_reasoning: n?.wrong_reasoning ?? n?.root_cause ?? '',
    correct_reasoning: n?.correct_reasoning ?? '',
    lesson: n?.lesson ?? '',
    other_notes: n?.other_notes ?? n?.student_note ?? '',
  };
}

export function JournalEntrySurface({ embedded = false }: JournalEntrySurfaceProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { classId, loading: classLoading } = useClassId();
  const { isLoading: qbLoading } = useQuestionBank();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['journal', 'entries', classId],
    queryFn: () => getWrongAnswerSmartRows(classId),
    enabled: !!classId,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<JournalDraft>(EMPTY_DRAFT);
  const [annotations, setAnnotations] = React.useState<AnnotationStroke[]>([]);
  const [annotateActive, setAnnotateActive] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pendingSelectQid, setPendingSelectQid] = React.useState<string | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const railPanelRef = React.useRef<ImperativePanelHandle>(null);
  const reviewPanelRef = React.useRef<ImperativePanelHandle>(null);
  const [railCollapsed, setRailCollapsed] = React.useState(startsCompact);
  const [reviewCollapsed, setReviewCollapsed] = React.useState(startsCompact);
  const autoCompactRef = React.useRef(startsCompact());

  React.useEffect(() => {
    const node = surfaceRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const update = (width: number) => {
      if (width <= AUTO_COLLAPSE_AT && !autoCompactRef.current) {
        autoCompactRef.current = true;
        setRailCollapsed(true);
        setReviewCollapsed(true);
      } else if (width >= AUTO_EXPAND_AT && autoCompactRef.current) {
        autoCompactRef.current = false;
        setRailCollapsed(false);
        setReviewCollapsed(false);
      }
    };

    update(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const selected = React.useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // Auto-select the first entry once data lands.
  React.useEffect(() => {
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  // After adding a manual entry, select it once it appears in the refetched rows.
  React.useEffect(() => {
    if (!pendingSelectQid) return;
    const row = rows.find((r) => r.qid === pendingSelectQid);
    if (row) {
      setSelectedId(row.id);
      setPendingSelectQid(null);
    }
  }, [rows, pendingSelectQid]);

  const handlePick = async (q: LRQuestion) => {
    if (!classId) return;
    try {
      await ensureJournalEntry({
        class_id: classId,
        qid: q.qid,
        pt: q.pt,
        section: q.section,
        qnum: q.qnum,
        qtype: q.qtype,
        level: q.difficulty,
      });
      setPendingSelectQid(q.qid);
      await queryClient.invalidateQueries({ queryKey: ['journal', 'entries', classId] });
    } catch (err) {
      toast({
        title: 'Could not add entry',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  // Seed draft + annotations when the selected entry changes (NOT on every save).
  React.useEffect(() => {
    if (selected) {
      setDraft(seedDraft(selected));
      setAnnotations(selected.note?.annotations ?? []);
      setAnnotateActive(false);
    } else {
      setDraft(EMPTY_DRAFT);
      setAnnotations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Debounced autosave whenever draft or annotations change for a selected entry.
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = React.useCallback(
    (next: JournalDraft, nextAnnotations: AnnotationStroke[]) => {
      if (!selected || !classId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await upsertNote({
            class_id: classId,
            qid: selected.qid,
            self_rating: next.self_rating,
            date_taken: next.date_taken || null,
            question_summary: next.question_summary || null,
            wrong_answer: next.wrong_answer || null,
            wrong_reasoning: next.wrong_reasoning || null,
            correct_reasoning: next.correct_reasoning || null,
            lesson: next.lesson || null,
            other_notes: next.other_notes || null,
            annotations: nextAnnotations,
          });
          // Refresh so outcome buckets re-group; the draft is keyed by
          // selectedId so the refetch won't clobber in-progress edits.
          queryClient.invalidateQueries({ queryKey: ['journal', 'entries', classId] });
        } catch (err) {
          toast({
            title: 'Failed to save',
            description: err instanceof Error ? err.message : String(err),
            variant: 'destructive',
          });
        }
      }, 800);
    },
    [selected, classId, queryClient, toast],
  );

  React.useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const patch = (p: Partial<JournalDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...p };
      scheduleSave(next, annotations);
      return next;
    });
  };

  const handleAnnotations = (next: AnnotationStroke[]) => {
    setAnnotations(next);
    scheduleSave(draft, next);
  };

  const question = selected ? questionBank.getQuestion(selected.qid) : undefined;

  // "Add your next entry": suggest questions of the type the student misses
  // most, that aren't already journaled. Self-contained from loaded data.
  const suggestions = React.useMemo(() => {
    const journaled = new Set(rows.map((r) => r.qid));
    const missTally: Record<string, number> = {};
    for (const r of rows) {
      if (outcomeOf(r) === 'wrong') missTally[r.qtype] = (missTally[r.qtype] ?? 0) + 1;
    }
    const weakest = Object.entries(missTally).sort((a, b) => b[1] - a[1])[0]?.[0];
    let pool: LRQuestion[] = [];
    try {
      pool = questionBank.getAllQuestions();
    } catch {
      pool = [];
    }
    const ofType = weakest ? pool.filter((q) => q.qtype === weakest) : pool;
    return ofType
      .filter((q) => !journaled.has(q.qid))
      .slice(0, 6)
      .map((q) => ({ qid: q.qid, label: `PT${q.pt}.S${q.section}.Q${q.qnum}`, qtype: q.qtype }));
  }, [rows]);

  return (
    <div
      ref={surfaceRef}
      className={cn('flex flex-col bg-background', embedded ? 'h-full overflow-hidden rounded-lg border border-border' : 'h-screen')}
    >
      {!embedded && (
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => navigate('/classroom')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to your classroom
            </Button>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Wrong Answer Journal
            </span>
            <div className="flex items-center gap-2">
              <LogoutButton />
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {!railCollapsed && (
          <>
            <ResizablePanel
              ref={railPanelRef}
              defaultSize={16}
              minSize={12}
              maxSize={24}
              collapsible
              collapsedSize={0}
              onCollapse={() => setRailCollapsed(true)}
              onExpand={() => setRailCollapsed(false)}
            >
              <EntriesRail
                rows={rows}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onNewEntry={() => setPickerOpen(true)}
                suggestions={suggestions}
                onPickSuggestion={(qid) => {
                  const q = questionBank.getQuestion(qid);
                  if (q) handlePick(q);
                }}
                onCollapse={() => setRailCollapsed(true)}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={60} minSize={45}>
          <div className="flex h-full flex-col">
            {/* Entry header: id chip, type, title, Annotate toggle */}
            {selected && (
              <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {railCollapsed && (
                    <button
                      type="button"
                      onClick={() => setRailCollapsed(false)}
                      title="Show entries"
                      aria-label="Show entries"
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[12px] text-foreground">
                    {selected.label}
                  </span>
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {SECTION_BADGE}
                  </span>
                  <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                    {selected.qtype}
                  </span>
                  {selected.note?.title?.trim() && (
                    <span className="truncate text-[13px] font-medium text-foreground/90">
                      {selected.note.title.trim()}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {reviewCollapsed && (
                    <button
                      type="button"
                      onClick={() => setReviewCollapsed(false)}
                      title="Show review"
                      aria-label="Show review"
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <PanelRightOpen className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAnnotateActive((v) => !v)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
                      annotateActive
                        ? 'border-foreground bg-secondary text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {annotateActive ? 'Annotating' : 'Annotate'}
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1">
              {classLoading || isLoading || qbLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border border-border border-t-foreground/30" />
                </div>
              ) : !selected ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-[15px] font-medium text-foreground/80">No entry selected</p>
                  <p className="text-[13px] text-muted-foreground">
                    Flag a question in a drill, then open it here to review.
                  </p>
                </div>
              ) : !question ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-[15px] font-medium text-foreground/80">Question unavailable</p>
                  <p className="text-[13px] text-muted-foreground">
                    {selected.label} isn&apos;t in the loaded question bank.
                  </p>
                </div>
              ) : (
                <JournalQuestionPane
                  question={question}
                  displayNumber={question.qnum}
                  correctAnswer={question.correctAnswer}
                  chosenAnswer={draft.wrong_answer || null}
                  questionSummary={draft.question_summary}
                  wrongReasoning={draft.wrong_reasoning}
                  correctReasoning={draft.correct_reasoning}
                  annotateActive={annotateActive}
                  annotations={annotations}
                  onAnnotationsChange={handleAnnotations}
                  onChooseWrong={(key) => patch({ wrong_answer: key })}
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        {!reviewCollapsed && (
          <>
            <ResizableHandle withHandle />

            <ResizablePanel
              ref={reviewPanelRef}
              defaultSize={24}
              minSize={18}
              maxSize={30}
              collapsible
              collapsedSize={0}
              onCollapse={() => setReviewCollapsed(true)}
              onExpand={() => setReviewCollapsed(false)}
            >
              <div className="h-full overflow-y-auto border-l border-border">
                {selected && question ? (
                  <ReviewForm
                    draft={draft}
                    correctAnswer={question.correctAnswer}
                    answerKeys={Object.keys(question.answerChoices)}
                    onPatch={patch}
                    onCollapse={() => setReviewCollapsed(true)}
                  />
                ) : (
                  <div className="px-5 py-6 text-[13px] text-muted-foreground">
                    Select an entry to review.
                  </div>
                )}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <NewEntryPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={handlePick} />
    </div>
  );
}
