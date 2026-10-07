import * as React from 'react';
import {
  formatDuration,
  formatPercent,
  type BreakdownRow,
} from '@/lib/analyticsBreakdowns';
import { cn } from '@/lib/utils';

/**
 * The one table every analytics tab uses.
 *
 * The bar encodes two variables at once, which is the whole reason it is a bar
 * and not a number: the TRACK length is how much of the test this tag accounts
 * for, and the FILL is how much of it the student got right. So a long mostly
 * empty track is the thing to work on, and a short empty one is not worth the
 * same worry. Nothing about that needs a legend.
 *
 * Rows the student has never attempted still render — their frequency is real
 * bank data — but every student-derived cell shows an em dash rather than a
 * zero, so an untouched row can never read as a failed one.
 */

export interface BreakdownTableProps {
  rows: BreakdownRow[];
  /** Family headings, in taxonomy order. Empty = render flat. */
  groups?: string[];
  /** Avg. Difficulty is meaningless on the difficulty breakdown itself. */
  showDifficulty?: boolean;
  /** Wrong-answer tables count misses, so the bar label reads differently. */
  countLabel?: (row: BreakdownRow) => string;
  emptyMessage?: string;
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('text-xs font-medium text-muted-foreground', className)}>{children}</div>
  );
}

function Row({
  row,
  maxFrequency,
  showDifficulty,
  countLabel,
}: {
  row: BreakdownRow;
  maxFrequency: number;
  showDifficulty: boolean;
  countLabel: (row: BreakdownRow) => string;
}) {
  // Track length is relative to the most common tag in this table, so the
  // widest row fills the column and everything else reads against it.
  const trackPct = maxFrequency > 0 ? (row.frequency / maxFrequency) * 100 : 0;
  const fillPct = row.accuracy === null ? 0 : row.accuracy * 100;

  return (
    <div className="grid grid-cols-[minmax(9rem,1.1fr)_4rem_minmax(6rem,2.4fr)_3.5rem_4rem_4rem] items-center gap-x-4 py-3">
      <div className="text-sm text-foreground">{row.label}</div>

      <div className="text-right text-sm tabular-nums text-muted-foreground">
        {Math.round(row.frequency * 100)}%
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-xs text-muted-foreground">{countLabel(row)}</div>
        <div
          className="h-2 rounded-full bg-muted"
          style={{ width: `${Math.max(trackPct, 2)}%` }}
          role="img"
          aria-label={`${row.label}: ${countLabel(row)}`}
        >
          <div
            className="h-2 rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      <div className="text-right text-sm tabular-nums text-foreground">
        {formatPercent(row.accuracy)}
      </div>
      <div className="text-right text-sm tabular-nums text-muted-foreground">
        {formatDuration(row.avgTimeMs)}
      </div>
      {showDifficulty ? (
        <div className="text-right text-sm tabular-nums text-muted-foreground">
          {row.avgDifficulty === null ? '—' : row.avgDifficulty.toFixed(1)}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

export default function BreakdownTable({
  rows,
  groups,
  showDifficulty = true,
  countLabel = (r) => `${r.correct} correct of ${r.attempted}`,
  emptyMessage = 'Nothing here yet. Answer some questions and this fills in.',
}: BreakdownTableProps) {
  const maxFrequency = React.useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.frequency), 0),
    [rows],
  );

  // Both memos must run before any early return, or the hook order changes
  // between the empty and populated renders.
  const ordered = React.useMemo(() => {
    if (!groups || groups.length === 0) return [{ name: '', rows }];
    const seen = new Set<string>();
    const out = groups
      .map((name) => {
        const inGroup = rows.filter((r) => r.group === name);
        inGroup.forEach((r) => seen.add(r.key));
        return { name, rows: inGroup };
      })
      .filter((g) => g.rows.length > 0);
    // Anything whose family is not in the declared order still renders, rather
    // than silently vanishing from the table.
    const rest = rows.filter((r) => !seen.has(r.key));
    if (rest.length > 0) out.push({ name: 'Other', rows: rest });
    return out;
  }, [groups, rows]);

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-[minmax(9rem,1.1fr)_4rem_minmax(6rem,2.4fr)_3.5rem_4rem_4rem] items-end gap-x-4 border-b border-border pb-2">
        <HeaderCell>{null}</HeaderCell>
        <HeaderCell className="text-right">Frequency</HeaderCell>
        <HeaderCell>{null}</HeaderCell>
        <HeaderCell className="text-right">Correct</HeaderCell>
        <HeaderCell className="text-right">Avg. Time</HeaderCell>
        <HeaderCell className="text-right">{showDifficulty ? 'Avg. Difficulty' : null}</HeaderCell>
      </div>

      {ordered.map((group) => (
        <section key={group.name || 'all'}>
          {group.name ? (
            <h3 className="pb-1 pt-6 font-serif text-lg font-semibold text-foreground">
              {group.name}
            </h3>
          ) : null}
          <div className="divide-y divide-border/60">
            {group.rows.map((row) => (
              <Row
                key={row.key}
                row={row}
                maxFrequency={maxFrequency}
                showDifficulty={showDifficulty}
                countLabel={countLabel}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
