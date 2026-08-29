/**
 * Sat sections, as a list a student can come back to.
 *
 * The section results screen has always been a one-render object: you saw it
 * the moment you finished and then it was gone. `section_history` had the
 * totals the whole time and nothing read them. This is that reader.
 *
 * A row opens to the question-by-question record. Sections sat before that
 * record started being persisted say so, rather than opening onto an empty
 * table that reads as "you answered nothing".
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDurationMs } from '@/lib/drillHistory';
import {
  hasDetail,
  sectionLabel,
  summarizeSections,
  type SectionHistoryRow,
} from '@/lib/sectionHistory';
import { UNANSWERED } from '@/lib/sectionHistorySave';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** A filled proportion of the section, the shape 7Sage puts on every row. */
function ScoreBar({ percent }: { percent: number }) {
  return (
    <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className="h-full rounded-full bg-foreground/70" style={{ width: `${percent}%` }} />
    </span>
  );
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function QuestionTable({ row }: { row: SectionHistoryRow }) {
  if (!hasDetail(row)) {
    return (
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        The question-by-question record was not kept for this section. The score and
        timing above are everything that was saved.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="w-full min-w-[34rem] text-left text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Q</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Level</th>
            <th className="py-2 pr-3 font-medium">Yours</th>
            {row.brUsed && <th className="py-2 pr-3 font-medium">BR</th>}
            <th className="py-2 pr-3 font-medium">Correct</th>
            <th className="py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {row.questions.map((q) => (
            <tr key={q.qid}>
              <td className="py-2 pr-3 tabular-nums text-muted-foreground">{q.qnum}</td>
              <td className="py-2 pr-3 text-foreground">{q.qtype}</td>
              <td className="py-2 pr-3 tabular-nums text-muted-foreground">{q.difficulty}</td>
              <td
                className={cn(
                  'py-2 pr-3 font-medium tabular-nums',
                  q.initialAnswer === UNANSWERED
                    ? 'text-muted-foreground'
                    : q.initialCorrect
                      ? 'text-success'
                      : 'text-destructive',
                )}
              >
                {q.initialAnswer}
              </td>
              {row.brUsed && (
                <td
                  className={cn(
                    'py-2 pr-3 font-medium tabular-nums',
                    q.brAnswer === undefined
                      ? 'text-muted-foreground'
                      : q.brCorrect
                        ? 'text-success'
                        : 'text-destructive',
                  )}
                >
                  {q.brAnswer ?? '—'}
                </td>
              )}
              <td className="py-2 pr-3 tabular-nums text-foreground">{q.correctAnswer}</td>
              <td className="py-2 tabular-nums text-muted-foreground">
                {formatDurationMs(q.timeMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SectionHistoryList({ rows }: { rows: SectionHistoryRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const summary = summarizeSections(rows);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="font-medium text-foreground">No sections sat yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sit a full section in the Testing Centre and it will be kept here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Sections" value={String(summary.sections)} />
        <Tile
          label="Best"
          value={summary.bestPercent === null ? '—' : `${summary.bestPercent}%`}
          sub={summary.bestLabel ?? undefined}
        />
        <Tile
          label="Average"
          value={summary.averagePercent === null ? '—' : `${summary.averagePercent}%`}
        />
        <Tile label="Time sat" value={formatDurationMs(summary.totalTimeMs)} />
      </section>

      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rows.map((row) => {
          const open = openId === row.id;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-180',
                  )}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {sectionLabel(row)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dateLabel(row.completedAt)}
                    {row.unansweredCount > 0 && ` · ${row.unansweredCount} unanswered`}
                    {` · ${formatDurationMs(row.totalTimeMs)}`}
                  </p>
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Score
                  </span>
                  <ScoreBar percent={row.initialPercent} />
                  <span className="w-24 text-xs font-medium tabular-nums text-foreground">
                    {row.initialScore}/{row.initialTotal} · {row.initialPercent}%
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">BR</p>
                  {/* An em dash, not a zero. A review that was never sat is not
                      a review scored nothing — that was the old bug on screen. */}
                  <p className="text-xs font-medium tabular-nums text-foreground">
                    {row.brUsed && row.brPercent !== null ? `${row.brPercent}%` : '—'}
                    {row.brUsed && row.brDelta !== null && (
                      <span
                        className={cn(
                          'ml-1',
                          row.brDelta > 0
                            ? 'text-success'
                            : row.brDelta < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.brDelta > 0 ? `+${row.brDelta}` : row.brDelta}
                      </span>
                    )}
                  </p>
                </div>
              </button>

              {open && <QuestionTable row={row} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
