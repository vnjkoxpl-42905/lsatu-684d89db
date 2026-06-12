/**
 * WrongAnswersSmartView — a read-only "smart" database fed by the class-scoped
 * wrong_answer_journal (via journalService.getWrongAnswerSmartRows). Reuses the
 * generic DatabaseView; clicking a row opens the attempt-history detail sheet.
 *
 * This is the ONLY place the class_id id-space touches the Journal UI.
 */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClassId } from '@/hooks/useClassId';
import { getWrongAnswerSmartRows } from '@/lib/journalService';
import type { JournalColumn, JournalView } from '@/lib/journalService';
import type { WAJEntry } from '@/lib/wajService';
import { DatabaseView } from '../database/DatabaseView';
import type { DatabaseRow } from '../database/types';
import { WrongAnswerDetailSheet } from './WrongAnswerDetailSheet';

const COLUMNS: JournalColumn[] = [
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
];

const VIEW: JournalView = {
  id: 'waj-table',
  database_id: 'waj',
  user_id: 'waj',
  name: 'All',
  kind: 'table',
  config: {},
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

export function WrongAnswersSmartView() {
  const { classId, loading: classLoading } = useClassId();
  const [selected, setSelected] = React.useState<WAJEntry | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['journal', 'wrong-answers', classId],
    queryFn: () => getWrongAnswerSmartRows(classId),
    enabled: !!classId,
  });

  const entriesById = React.useMemo(() => {
    const m = new Map<string, WAJEntry>();
    (data ?? []).forEach((r) => m.set(r.id, r.entry));
    return m;
  }, [data]);

  const rows: DatabaseRow[] = React.useMemo(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        title: r.label,
        icon: null,
        properties: {
          qtype: r.qtype,
          level: r.level,
          status: r.status === 'right' ? 'Now correct' : 'Still wrong',
          attempts: r.attempts,
          first_missed: new Date(r.first_missed).toLocaleDateString(),
        },
      })),
    [data],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-3xl">📕</span>
      </div>
      <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">Wrong Answers</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">
        Every question you missed in a drill, auto-collected. Open one to review your attempts and
        try it again.
      </p>

      {classLoading || isLoading ? (
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
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-16 text-center shadow-sm">
          <p className="text-[15px] font-medium text-foreground/80">No wrong answers yet</p>
          <p className="text-[13px] text-muted-foreground">
            Keep practicing — your missed questions will appear here.
          </p>
        </div>
      ) : (
        <DatabaseView
          columns={COLUMNS}
          rows={rows}
          views={[VIEW]}
          activeViewId={VIEW.id}
          readOnly
          onOpenRow={(id) => setSelected(entriesById.get(id) ?? null)}
        />
      )}

      <WrongAnswerDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
