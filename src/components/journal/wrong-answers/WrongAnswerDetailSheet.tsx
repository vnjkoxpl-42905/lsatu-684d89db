/**
 * WrongAnswerDetailSheet — attempt history + editable reflection notes for a
 * single missed question, with a "Reattempt" drill launch.
 *
 * Reflection fields are user-scoped (wrong_answer_journal_notes). They auto-save
 * on blur. On first open the fields are pre-populated from the most recent wrong
 * attempt's review answers (q1/q2/q3) if no note exists yet.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, CheckCircle2, XCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { WAJEntry, WAJHistoryItem } from '@/lib/wajService';
import { upsertNote, type WAJNote, type ReviewStatus } from '@/lib/wajNotesService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms)) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rem}s` : `${seconds}s`;
}

function safeHistory(raw: unknown): WAJHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object') as WAJHistoryItem[];
}

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: 'wrong' | 'right' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium',
        status === 'right'
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
      )}
    >
      {status === 'right' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status === 'right' ? 'Correct' : 'Wrong'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reflection form state
// ─────────────────────────────────────────────────────────────────────────────

interface ReflectionFields {
  root_cause: string;
  trap_pattern: string;
  student_note: string;
  next_action: string;
  review_status: ReviewStatus;
  reattempt_due_at: string;
}

function seedFromEntry(entry: WAJEntry, note: WAJNote | null): ReflectionFields {
  if (note) {
    return {
      root_cause: note.root_cause ?? '',
      trap_pattern: note.trap_pattern ?? '',
      student_note: note.student_note ?? '',
      next_action: note.next_action ?? '',
      review_status: note.review_status,
      reattempt_due_at: note.reattempt_due_at ?? '',
    };
  }
  // Pre-populate from most recent wrong attempt's review answers
  const history = safeHistory(entry.history_json);
  const lastWrong = [...history].reverse().find((h) => h.result === 0 && h.review);
  return {
    root_cause: lastWrong?.review?.q1 ?? '',
    trap_pattern: '',
    student_note: '',
    next_action: lastWrong?.review?.q3 ?? '',
    review_status: 'unreviewed',
    reattempt_due_at: '',
  };
}

const STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: 'unreviewed', label: 'Unreviewed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'mastered', label: 'Mastered' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WrongAnswerDetailSheet({
  entry,
  note,
  classId,
  onClose,
  onNoteSaved,
}: {
  entry: WAJEntry | null;
  note: WAJNote | null;
  classId: string;
  onClose: () => void;
  onNoteSaved: (note: WAJNote) => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fields, setFields] = React.useState<ReflectionFields | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Re-seed when entry changes
  React.useEffect(() => {
    if (entry) {
      setFields(seedFromEntry(entry, note));
    } else {
      setFields(null);
    }
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reattempt = (e: WAJEntry) => {
    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: [e.qtype],
          difficulties: [e.level],
          pts: [e.pt],
          count: 1,
          selectedQids: [e.qid],
        },
      },
    });
  };

  const save = async () => {
    if (!entry || !fields || !classId) return;
    setSaving(true);
    try {
      const saved = await upsertNote({
        class_id: classId,
        qid: entry.qid,
        root_cause: fields.root_cause || null,
        trap_pattern: fields.trap_pattern || null,
        student_note: fields.student_note || null,
        next_action: fields.next_action || null,
        review_status: fields.review_status,
        reattempt_due_at: fields.reattempt_due_at || null,
      });
      onNoteSaved(saved);
      toast({ title: 'Reflection saved' });
    } catch (err) {
      toast({ title: 'Failed to save', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof ReflectionFields>(k: K, v: ReflectionFields[K]) =>
    setFields((prev) => (prev ? { ...prev, [k]: v } : prev));

  return (
    <Sheet open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background border-l border-border">
        {entry && fields && (
          <>
            <SheetHeader className="pb-4 border-b border-border">
              <SheetTitle className="text-foreground font-mono text-[15px]">
                PT{entry.pt}–S{entry.section}–Q{entry.qnum}
              </SheetTitle>
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-foreground/80 ring-1 ring-border">
                    {entry.qtype}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Level {entry.level}</span>
                </div>
                <Button size="sm" onClick={() => reattempt(entry)} className="h-7 gap-1.5 text-[11px]">
                  <Play className="w-3 h-3" />
                  Reattempt
                </Button>
              </div>
            </SheetHeader>

            {/* ── Attempt history ── */}
            <div className="mt-6 space-y-3">
              {safeHistory(entry.history_json).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No attempt history available.
                </p>
              ) : (
                safeHistory(entry.history_json).map((item, idx) => {
                  const isCorrect = item.result === 1;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-xl border p-4 space-y-3 shadow-sm',
                        isCorrect
                          ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                          : 'bg-card border-border',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {item.attempt_at_iso ? new Date(item.attempt_at_iso).toLocaleString() : '—'}
                        </span>
                        <StatusBadge status={isCorrect ? 'right' : 'wrong'} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div>
                          <IL>Chosen</IL>
                          <div className="text-[13px] text-foreground/80 mt-1 font-mono">
                            ({item.chosen_answer ?? '—'})
                          </div>
                        </div>
                        <div>
                          <IL>Correct</IL>
                          <div className="text-[13px] text-foreground/80 mt-1 font-mono">
                            ({item.correct_answer ?? '—'})
                          </div>
                        </div>
                        <div>
                          <IL>Time</IL>
                          <div className="text-[13px] text-foreground/80 mt-1 tabular-nums">
                            {formatTime(item.time_ms)}
                          </div>
                        </div>
                        {item.confidence_1_5 != null && (
                          <div>
                            <IL>Confidence</IL>
                            <div className="text-[13px] text-foreground/80 mt-1 tabular-nums">
                              {item.confidence_1_5} / 5
                            </div>
                          </div>
                        )}
                      </div>
                      {item.review && (
                        <div className="pt-3 border-t border-border space-y-3">
                          {item.review.q1 && (
                            <div>
                              <IL>Why I chose the wrong answer</IL>
                              <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                {item.review.q1}
                              </p>
                            </div>
                          )}
                          {item.review.q2 && (
                            <div>
                              <IL>Why I eliminated the right answer</IL>
                              <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                {item.review.q2}
                              </p>
                            </div>
                          )}
                          {item.review.q3 && (
                            <div>
                              <IL>Plan to avoid next time</IL>
                              <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                {item.review.q3}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Reflection notes ── */}
            <div className="mt-8 rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">My Reflection</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={save}
                  disabled={saving}
                >
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <IL>Root cause</IL>
                  <Textarea
                    className="mt-1.5 min-h-[64px] resize-none text-[13px]"
                    placeholder="Why did I miss this? (misread stem, eliminated correct, trap answer…)"
                    value={fields.root_cause}
                    onChange={(e) => setField('root_cause', e.target.value)}
                  />
                </div>

                <div>
                  <IL>Trap pattern</IL>
                  <Textarea
                    className="mt-1.5 min-h-[48px] resize-none text-[13px]"
                    placeholder="e.g. Scope shift, Causal reversal, Extreme language…"
                    value={fields.trap_pattern}
                    onChange={(e) => setField('trap_pattern', e.target.value)}
                  />
                </div>

                <div>
                  <IL>Student note</IL>
                  <Textarea
                    className="mt-1.5 min-h-[64px] resize-none text-[13px]"
                    placeholder="Anything else I want to remember about this question…"
                    value={fields.student_note}
                    onChange={(e) => setField('student_note', e.target.value)}
                  />
                </div>

                <div>
                  <IL>Next action</IL>
                  <Textarea
                    className="mt-1.5 min-h-[48px] resize-none text-[13px]"
                    placeholder="What I'll do differently next time…"
                    value={fields.next_action}
                    onChange={(e) => setField('next_action', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <IL>Review status</IL>
                    <select
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={fields.review_status}
                      onChange={(e) => setField('review_status', e.target.value as ReviewStatus)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <IL>Reattempt by</IL>
                    <input
                      type="date"
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={fields.reattempt_due_at}
                      onChange={(e) => setField('reattempt_due_at', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
