/**
 * WrongAnswerDetailSheet — attempt history + review notes for a single missed
 * question, with a "Reattempt" launch into the drill. Ported from the original
 * WrongAnswerJournal detail Sheet so behavior is preserved.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WAJEntry, WAJHistoryItem } from '@/lib/wajService';

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

export function WrongAnswerDetailSheet({
  entry,
  onClose,
}: {
  entry: WAJEntry | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

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

  return (
    <Sheet open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background border-l border-border">
        {entry && (
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
                        isCorrect ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-card border-border',
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
