/**
 * EntriesRail — left pane: the list of journaled questions, grouped by outcome
 * (Wrong / Unsure / Correct), filterable by question ID, with a "+ New entry"
 * action. Outcome is the student's self-rating when set, else the entry's
 * scored status.
 */
import * as React from 'react';
import { Plus, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WrongAnswerSmartRow } from '@/lib/journalService';

// The journal loads exclusively from the Logical Reasoning bank, so every
// entry is an LR question. Surfaced as a section badge to match the reference.
export const SECTION_BADGE = 'LR';

export type Outcome = 'wrong' | 'unsure' | 'correct';

export function outcomeOf(row: WrongAnswerSmartRow): Outcome {
  if (row.note?.self_rating) return row.note.self_rating;
  return row.status === 'right' ? 'correct' : 'wrong';
}

/** Entry headline: the student/AI title when present, else a question-type fallback. */
export function entryTitle(row: WrongAnswerSmartRow): string {
  return row.note?.title?.trim() || `${row.qtype} · ${row.label}`;
}

const GROUPS: { key: Outcome; label: string; dot: string }[] = [
  { key: 'wrong', label: 'Wrong', dot: 'bg-rose-500' },
  { key: 'unsure', label: 'Unsure', dot: 'bg-amber-500' },
  { key: 'correct', label: 'Correct', dot: 'bg-emerald-500' },
];

export interface EntrySuggestion {
  qid: string;
  label: string;
  qtype: string;
}

interface Props {
  rows: WrongAnswerSmartRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewEntry: () => void;
  suggestions?: EntrySuggestion[];
  onPickSuggestion?: (qid: string) => void;
  onCollapse?: () => void;
}

export function EntriesRail({
  rows,
  selectedId,
  onSelect,
  onNewEntry,
  suggestions = [],
  onPickSuggestion,
  onCollapse,
}: Props) {
  const [filter, setFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.label.toLowerCase().includes(q) || r.qid.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const grouped = React.useMemo(() => {
    const m: Record<Outcome, WrongAnswerSmartRow[]> = { wrong: [], unsure: [], correct: [] };
    for (const r of filtered) m[outcomeOf(r)].push(r);
    return m;
  }, [filtered]);

  return (
    <aside className="flex h-full flex-col border-r border-border bg-card/30">
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Entries · {rows.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewEntry}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            New entry
          </button>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse entries"
              aria-label="Collapse entries"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pt-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by question ID"
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
            {rows.length === 0 ? 'No entries yet. Flag a question or add one.' : 'No matches.'}
          </p>
        ) : (
          GROUPS.map((g) => {
            const items = grouped[g.key];
            if (items.length === 0) return null;
            return (
              <div key={g.key} className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <span className={cn('h-1.5 w-1.5 rounded-full', g.dot)} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {g.label} · {items.length}
                  </span>
                </div>
                {items.map((r) => {
                  const selected = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelect(r.id)}
                      className={cn(
                        'mb-1 w-full rounded-md px-2.5 py-2 text-left transition-colors',
                        selected ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {r.label}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {SECTION_BADGE}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-1 text-[12px] text-foreground/90">
                        {entryTitle(r)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {suggestions.length > 0 && onPickSuggestion && (
        <div className="border-t border-border px-3 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Add your next entry
          </div>
          <div className="space-y-1">
            {suggestions.map((s) => (
              <button
                key={s.qid}
                type="button"
                onClick={() => onPickSuggestion(s.qid)}
                className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left hover:bg-accent"
              >
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {s.label}
                </span>
                <span className="line-clamp-1 text-[11px] text-foreground/70">{s.qtype}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
