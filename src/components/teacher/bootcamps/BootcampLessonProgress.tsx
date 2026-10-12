/**
 * Bootcamp lesson progress inside the student dossier's Homework tab.
 *
 * Two jobs at once: how far the student has actually got, and what they wrote
 * while getting there. Progress and last-active are always visible; the writing
 * is collapsed behind a count so the Homework tab stays scannable, and expands
 * to the full set with each prompt above its answer.
 *
 * Everything rendered is read back from the student's stored record. A lesson
 * with no row shows nothing at all rather than a zero, a source that cannot
 * express partial progress shows no percentage, and a student's writing is
 * rendered as text, never as markup.
 *
 * The dossier is keyed by `profiles.class_id`; progress tables are keyed by the
 * auth user id. A scoped read-only RPC resolves the `students` mapping without
 * broadening that table's owner-only read policy.
 */

import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeShort } from '@/lib/time';
import {
  LESSON_PROGRESS_SOURCES,
  type LessonProgressSource,
} from './lessonProgressSources';

/**
 * `rc_lesson_progress` is newer than the last Supabase types regeneration, so
 * the client is cast once here, the established pattern in this repo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedDb = supabase as any;

interface ProgressRow {
  lesson_id: string;
  data?: Record<string, unknown> | null;
  completed_at?: string | null;
  updated_at?: string | null;
}

/** Resolve the dossier's class_id to the auth user id the progress tables use. */
function useStudentUserId(classId: string | undefined, actorId: string | undefined) {
  return useQuery<string | null>({
    queryKey: ['dossier-student-user-id', classId, actorId],
    enabled: !!classId && !!actorId,
    queryFn: async () => {
      const { data, error } = await untypedDb.rpc('get_student_progress_user_id', { p_class_id: classId });
      if (error) throw error;
      if (data == null) return null;
      if (typeof data !== 'string' || !data.trim()) throw new Error('Student account lookup returned an invalid identity.');
      return data;
    },
  });
}

function useLessonProgress(userId: string | null | undefined, actorId: string | undefined) {
  return useQueries({
    queries: LESSON_PROGRESS_SOURCES.map(source => ({
      queryKey: ['dossier-lesson-progress', userId, source.key, actorId],
      enabled: !!userId && !!actorId,
      queryFn: async (): Promise<ProgressRow[]> => {
        const columns = source.hasDetail
          ? 'lesson_id,data,completed_at,updated_at'
          : 'lesson_id,completed_at';
        let query = untypedDb.from(source.table).select(columns).eq('user_id', userId);
        if (source.lessonId) query = query.eq('lesson_id', source.lessonId);
        const { data, error } = await query;
        if (error) throw error;
        if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || Array.isArray(row)
          || typeof row.lesson_id !== 'string' || !row.lesson_id.trim())) {
          throw new Error('Bootcamp progress returned an invalid response.');
        }
        return data as ProgressRow[];
      },
    })),
  });
}

function percentOf(source: LessonProgressSource, row: ProgressRow): number | null {
  if (!source.totalScreens || !source.furthestKey || !row.data) return null;
  const raw = row.data[source.furthestKey];
  if (!Number.isInteger(raw)) return null;
  const furthest = raw as number;
  if (furthest < 0 || furthest >= source.totalScreens) return null;
  return Math.min(100, Math.round(((furthest + 1) / source.totalScreens) * 100));
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-black/45">{children}</span>
  );
}

function LessonCard({ source, row }: { source: LessonProgressSource; row: ProgressRow }) {
  const [open, setOpen] = useState(false);

  const percent = percentOf(source, row);
  const completed = !!row.completed_at;
  const written = source.prompts.filter((p) => {
    const value = row.data?.[p.storageKey];
    return typeof value === 'string' && value.trim().length > 0;
  });

  return (
    <li className="rounded-lg border border-black/12 bg-white/30 overflow-hidden">
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Meta>{source.bootcamp}</Meta>
            <div className="text-sm text-[#11181c] truncate">
              {source.lessonId ? source.title : row.lesson_id}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {completed ? (
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">
                Complete
              </span>
            ) : percent !== null ? (
              <span className="text-sm text-[#11181c] tabular-nums">{percent}%</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-black/45">
                In progress
              </span>
            )}
          </div>
        </div>

        {percent !== null && !completed ? (
          <div className="h-[3px] w-full rounded-full bg-white/40 overflow-hidden">
            <div className="h-full rounded-full bg-black/20" style={{ width: `${percent}%` }} />
          </div>
        ) : null}

        <div className="flex items-center gap-3 flex-wrap">
          {row.updated_at ? <Meta>Last worked {formatRelativeShort(row.updated_at)}</Meta> : null}
          {completed && row.completed_at ? (
            <Meta>Finished {formatRelativeShort(row.completed_at)}</Meta>
          ) : null}
        </div>

        {written.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/55 hover:text-black transition-colors"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {written.length} written {written.length === 1 ? 'response' : 'responses'}
          </button>
        ) : source.hasDetail ? (
          <Meta>No written responses yet</Meta>
        ) : null}
      </div>

      {open && written.length > 0 ? (
        <div className="border-t border-black/12 bg-white/30 px-4 py-3 space-y-4">
          {written.map((p) => (
            <div key={p.storageKey} className="space-y-1.5">
              <Meta>{p.chapter}</Meta>
              <p className="text-xs text-black/55 leading-relaxed">{p.prompt}</p>
              <p className="text-sm text-[#11181c] leading-relaxed whitespace-pre-wrap">
                {String(row.data?.[p.storageKey] ?? '')}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function BootcampLessonProgress({ studentClassId }: { studentClassId: string | undefined }) {
  const { user } = useAuth();
  const identity = useStudentUserId(studentClassId, user?.id);
  const userId = identity.data;
  const progress = useLessonProgress(userId, user?.id);

  const cards = progress.flatMap((result, index) =>
    (result.data ?? []).map((row) => ({ source: LESSON_PROGRESS_SOURCES[index], row, key: `${LESSON_PROGRESS_SOURCES[index].key}:${row.lesson_id}` })),
  );
  const failed = progress.map((result, index) => result.error ? LESSON_PROGRESS_SOURCES[index] : null).filter((source): source is LessonProgressSource => source !== null);
  const identityMissing = !!studentClassId && identity.isSuccess && !userId;
  const loading = !!studentClassId && (identity.isPending || (!!userId && progress.some(result => result.isPending)));
  const refreshing = identity.isFetching || progress.some(result => result.isFetching);
  const retry = () => {
    if (identity.error || identityMissing) void identity.refetch();
    for (const result of progress) if (userId && result.error) void result.refetch();
  };

  if (!studentClassId || (cards.length === 0 && !loading && !identity.error && !identityMissing && failed.length === 0)) return null;

  return (
    <section className="space-y-2 pt-2">
      <div className="text-[10px] uppercase tracking-wider text-black/45">Bootcamp lessons</div>
      {(identity.error || identityMissing) && <div role="alert" className="text-xs text-destructive">
        {identity.error ? 'Could not confirm the student account for bootcamp progress.' : 'No linked student account was found for bootcamp progress.'}
        {cards.length > 0 && ' Earlier saved progress is still shown.'}
        <button type="button" className="ml-2 underline" disabled={refreshing} onClick={retry}>Retry bootcamp progress</button>
      </div>}
      {failed.length > 0 && <div role="alert" className="text-xs text-destructive">
        Could not confirm {failed.map(source => `${source.bootcamp}: ${source.title}`).join(', ')}. This progress view may be incomplete.
        {cards.length > 0 && ' Earlier saved progress is still shown where available.'}
        <button type="button" className="ml-2 underline" disabled={refreshing} onClick={retry}>Retry bootcamp progress</button>
      </div>}
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading bootcamp progress…</p>}
      <ul className="space-y-2">
        {cards.map(({ source, row, key }) => (
          <LessonCard key={key} source={source} row={row} />
        ))}
      </ul>
    </section>
  );
}
