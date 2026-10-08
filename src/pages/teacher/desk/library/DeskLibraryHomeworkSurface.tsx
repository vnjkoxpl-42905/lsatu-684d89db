import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Send } from 'lucide-react';
import { useHomeworkSets, type HomeworkSet } from '@/hooks/useHomeworkSets';
import { Input } from '@/components/ui/input';
import { LibraryViews, type LibraryItem } from '@/components/teacher/desk/library/LibraryViews';
import { LibraryFilterSelect } from '@/components/teacher/desk/library/LibraryFilterSelect';
import type { LibraryView } from '@/hooks/useDeskLibraryView';
import type { AssignWorkSheetItem } from '@/components/teacher/library/AssignWorkSheet';

/**
 * Homework sets in Library (spec D4). Same card system, same filters and the
 * same assign flow as Guided Drills — homework was the last Gen-1 surface, and
 * the point of keeping it was to stop it looking like a different product.
 */
export function DeskLibraryHomeworkSurface({
  view,
  onAssign,
  onBundle,
}: {
  view: LibraryView;
  onAssign: (item: AssignWorkSheetItem) => void;
  onBundle: (item: AssignWorkSheetItem) => void;
}) {
  const navigate = useNavigate();
  const { sets, loading, error } = useHomeworkSets();
  const [search, setSearch] = useState('');
  const [reasoningFilter, setReasoningFilter] = useState<string>('all');
  const [questionFilter, setQuestionFilter] = useState<string>('all');

  const reasoningTypes = useMemo(
    () => uniqueValues(sets.map((s) => s.reasoning_type)),
    [sets],
  );
  const questionTypes = useMemo(
    () => uniqueValues(sets.map((s) => s.question_type)),
    [sets],
  );

  const filtered = useMemo(
    () =>
      sets.filter((s) => {
        if (reasoningFilter !== 'all' && s.reasoning_type !== reasoningFilter) return false;
        if (questionFilter !== 'all' && s.question_type !== questionFilter) return false;
        if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [sets, search, reasoningFilter, questionFilter],
  );

  const sheetItem = (s: HomeworkSet): AssignWorkSheetItem => ({
    item: { kind: 'homework_set', setId: s.id },
    title: s.title,
    kindLabel: 'Homework',
  });

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <h2 className="text-base font-semibold text-black">Homework</h2>
        <p className="mt-0.5 text-xs text-black/55">
          {sets.length} set{sets.length === 1 ? '' : 's'}. Filter, open to edit, and assign to one or
          more students.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-xs border-black/15 bg-white/40 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
          />
          <LibraryFilterSelect
            value={reasoningFilter}
            onChange={setReasoningFilter}
            options={[
              { value: 'all', label: 'All reasoning types' },
              ...reasoningTypes.map((r) => ({ value: r, label: r })),
            ]}
          />
          <LibraryFilterSelect
            value={questionFilter}
            onChange={setQuestionFilter}
            options={[
              { value: 'all', label: 'All question types' },
              ...questionTypes.map((q) => ({ value: q, label: q })),
            ]}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {error ? (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-[#8a3b2f]">
            Couldn't load homework sets. {error}
          </div>
        ) : loading ? (
          <div className="text-xs text-black/45">Loading homework…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
            {sets.length === 0 ? 'No homework sets yet.' : 'No sets match your filters.'}
          </div>
        ) : (
          <LibraryViews
            view={view}
            items={filtered.map((s): LibraryItem => {
              const count = s.question_qids?.length ?? 0;
              return {
                id: s.id,
                eyebrow: s.is_guided_set ? 'GUIDED SET' : 'SET',
                title: s.title,
                subtitle: s.description ?? undefined,
                badges: [s.question_type, s.reasoning_type, s.question_feature].filter(
                  (b): b is string => !!b,
                ),
                meta: (
                  <span className="tabular-nums text-black/45">
                    {count} question{count === 1 ? '' : 's'}
                  </span>
                ),
                renderPreview: () => <HomeworkPreview set={s} questionCount={count} />,
                actions: (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/library/homework/${s.id}`)}
                      className="inline-flex items-center gap-1.5 border border-black/15 bg-white/40 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
                    >
                      <FileText className="h-3 w-3" /> Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onBundle(sheetItem(s))}
                      title="Add to the assign bundle"
                      aria-label={`Add ${s.title} to the assign bundle`}
                      className="ml-auto inline-flex items-center gap-1 border border-black/15 bg-white/40 px-2 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssign(sheetItem(s))}
                      className="inline-flex items-center gap-1.5 border border-teacher-accent/40 bg-teacher-accent/15 px-2.5 py-1 text-xs font-semibold text-teacher-accent-strong transition hover:bg-teacher-accent/25"
                    >
                      <Send className="h-3 w-3" /> Assign
                    </button>
                  </>
                ),
              };
            })}
          />
        )}
      </div>
    </section>
  );
}

function HomeworkPreview({ set, questionCount }: { set: HomeworkSet; questionCount: number }) {
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm font-semibold text-black">{set.title}</p>
      {set.description ? (
        <p className="text-xs leading-relaxed text-black/60">{set.description}</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-black/55">
        <Row label="Questions" value={String(questionCount)} />
        {set.estimated_minutes ? (
          <Row label="Estimated" value={`${set.estimated_minutes} min`} />
        ) : null}
        {set.question_type ? <Row label="Question type" value={set.question_type} /> : null}
        {set.reasoning_type ? <Row label="Reasoning" value={set.reasoning_type} /> : null}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-black/40">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </>
  );
}

function uniqueValues(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

export default DeskLibraryHomeworkSurface;
