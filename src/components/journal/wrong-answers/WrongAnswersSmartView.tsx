/**
 * WrongAnswersSmartView — the Wrong Answers study dashboard.
 *
 * Client-side view tabs filter rows from the class-scoped wrong_answer_journal
 * (merged with user-scoped notes). Clicking a row opens the detail sheet.
 * Reuses DatabaseView for the table; views are fixed client-side filters, NOT
 * stored in journal_views (which requires a real journal_pages FK).
 */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClassId } from '@/hooks/useClassId';
import { getWrongAnswerSmartRows } from '@/lib/journalService';
import type { JournalColumn, JournalView, WrongAnswerSmartRow } from '@/lib/journalService';
import type { WAJEntry } from '@/lib/wajService';
import { DatabaseView } from '../database/DatabaseView';
import type { DatabaseRow } from '../database/types';
import { WrongAnswerDetailSheet } from './WrongAnswerDetailSheet';

// ─────────────────────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS: JournalColumn[] = [
  { id: 'label', name: 'Question', type: 'text' },
  { id: 'qtype', name: 'Type', type: 'text' },
  { id: 'level', name: 'Level', type: 'number' },
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    options: ['Still wrong', 'Now correct'],
  },
  { id: 'attempts', name: 'Attempts', type: 'number' },
  { id: 'first_missed', name: 'First missed', type: 'text' },
  { id: 'last_attempted', name: 'Last attempt', type: 'text' },
  {
    id: 'reflection',
    name: 'Reflection',
    type: 'select',
    options: ['—', 'In progress', 'Mastered'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// View definitions (client-side only)
// ─────────────────────────────────────────────────────────────────────────────

type ViewId = 'all' | 'still-wrong' | 'now-correct' | 'by-type' | 'due';

interface SmartViewDef {
  id: ViewId;
  name: string;
  filter: (row: WrongAnswerSmartRow) => boolean;
}

const SMART_VIEWS: SmartViewDef[] = [
  { id: 'all', name: 'All', filter: () => true },
  { id: 'still-wrong', name: 'Still Wrong', filter: (r) => r.status === 'wrong' },
  { id: 'now-correct', name: 'Now Correct', filter: (r) => r.status === 'right' },
  {
    id: 'due',
    name: 'Due for Reattempt',
    filter: (r) =>
      r.note?.reattempt_due_at != null &&
      r.note.reattempt_due_at <= new Date().toISOString().slice(0, 10),
  },
  { id: 'by-type', name: 'By Type', filter: () => true }, // sorted client-side below
];

function makeJournalView(v: SmartViewDef): JournalView {
  return {
    id: v.id,
    database_id: 'waj',
    user_id: 'waj',
    name: v.name,
    kind: 'table',
    config: v.id === 'by-type' ? { sort: { columnId: 'qtype', direction: 'asc' } } : {},
    sort_order: 0,
    created_at: '',
    updated_at: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapper
// ─────────────────────────────────────────────────────────────────────────────

function reflectionLabel(row: WrongAnswerSmartRow): string {
  if (!row.note) return '—';
  if (row.note.review_status === 'mastered') return 'Mastered';
  if (row.note.review_status === 'in_progress') return 'In progress';
  return '—';
}

function toDbRow(r: WrongAnswerSmartRow): DatabaseRow {
  return {
    id: r.id,
    title: r.label,
    icon: null,
    properties: {
      label: r.label,
      qtype: r.qtype,
      level: r.level,
      status: r.status === 'right' ? 'Now correct' : 'Still wrong',
      attempts: r.attempts,
      first_missed: new Date(r.first_missed).toLocaleDateString(),
      last_attempted: r.last_attempted
        ? new Date(r.last_attempted).toLocaleDateString()
        : '—',
      reflection: reflectionLabel(r),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WrongAnswersSmartView() {
  const { classId, loading: classLoading } = useClassId();
  const [activeViewId, setActiveViewId] = React.useState<ViewId>('all');
  const [selected, setSelected] = React.useState<{ entry: WAJEntry; note: WrongAnswerSmartRow['note'] } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['journal', 'wrong-answers', classId],
    queryFn: () => getWrongAnswerSmartRows(classId),
    enabled: !!classId,
  });

  const activeDef = SMART_VIEWS.find((v) => v.id === activeViewId) ?? SMART_VIEWS[0];

  const filteredRows: DatabaseRow[] = React.useMemo(() => {
    const source = (data ?? []).filter(activeDef.filter);
    const sorted =
      activeViewId === 'by-type'
        ? [...source].sort((a, b) => a.qtype.localeCompare(b.qtype))
        : source;
    return sorted.map(toDbRow);
  }, [data, activeDef, activeViewId]);

  const smartById = React.useMemo(() => {
    const m = new Map<string, WrongAnswerSmartRow>();
    (data ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [data]);

  const views = SMART_VIEWS.map(makeJournalView);

  const loading = classLoading || isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-3xl">📕</span>
      </div>
      <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">Wrong Answers</h1>
      <p className="mb-5 text-[13px] text-muted-foreground">
        Every question you missed in a drill, auto-collected. Open one to review attempts and add
        your own reflection notes.
      </p>

      {/* View tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-border">
        {SMART_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveViewId(v.id)}
            className={cn(
              'px-3 py-1.5 text-[12px] font-medium transition-colors -mb-px border-b-2',
              activeViewId === v.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {v.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border border-border border-t-foreground/30" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-card p-12 text-center shadow-sm">
          <p className="text-[15px] font-medium text-foreground/80">Couldn't load your wrong answers</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-16 text-center shadow-sm">
          <p className="text-[15px] font-medium text-foreground/80">
            {activeViewId === 'all' ? 'No wrong answers yet' : 'No questions match this view'}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {activeViewId === 'all'
              ? 'Keep practicing — your missed questions will appear here.'
              : 'Try another view or keep drilling.'}
          </p>
        </div>
      ) : (
        <DatabaseView
          columns={COLUMNS}
          rows={filteredRows}
          views={views}
          activeViewId={activeViewId}
          readOnly
          onOpenRow={(id) => {
            const smart = smartById.get(id);
            if (smart) setSelected({ entry: smart.entry, note: smart.note });
          }}
        />
      )}

      <WrongAnswerDetailSheet
        entry={selected?.entry ?? null}
        note={selected?.note ?? null}
        classId={classId ?? ''}
        onClose={() => setSelected(null)}
        onNoteSaved={(note) => {
          // Merge saved note back into local state so the detail sheet refreshes
          // without waiting for a query refetch.
          setSelected((prev) => (prev ? { ...prev, note } : prev));
          refetch();
        }}
      />
    </div>
  );
}
