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
 * auth user id. `students` maps between them, the same join the bootcamp insights
 * pages use.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface SourceResult {
  source: LessonProgressSource;
  rows: ProgressRow[];
}

/** Resolve the dossier's class_id to the auth user id the progress tables use. */
function useStudentUserId(classId: string | undefined) {
  return useQuery<string | null>({
    queryKey: ['dossier-student-user-id', classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('user_id')
        .eq('class_id', classId as string)
        .maybeSingle();
      return (data?.user_id as string) ?? null;
    },
  });
}

function useLessonProgress(userId: string | null | undefined) {
  return useQuery<SourceResult[]>({
    queryKey: ['dossier-lesson-progress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const results = await Promise.all(
        LESSON_PROGRESS_SOURCES.map(async (source) => {
          const columns = source.hasDetail
            ? 'lesson_id,data,completed_at,updated_at'
            : 'lesson_id,completed_at';
          let query = untypedDb.from(source.table).select(columns).eq('user_id', userId);
          if (source.lessonId) query = query.eq('lesson_id', source.lessonId);
          const { data, error } = await query;
          // A source that errors (missing table, blocked read) contributes
          // nothing rather than failing the whole tab.
          if (error || !Array.isArray(data)) return { source, rows: [] };
          return { source, rows: data as ProgressRow[] };
        }),
      );
      return results;
    },
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
  const { data: userId } = useStudentUserId(studentClassId);
  const { data: results = [] } = useLessonProgress(userId);

  const cards = results.flatMap(({ source, rows }) =>
    rows.map((row) => ({ source, row, key: `${source.key}:${row.lesson_id}` })),
  );

  if (cards.length === 0) return null;

  return (
    <section className="space-y-2 pt-2">
      <div className="text-[10px] uppercase tracking-wider text-black/45">Bootcamp lessons</div>
      <ul className="space-y-2">
        {cards.map(({ source, row, key }) => (
          <LessonCard key={key} source={source} row={row} />
        ))}
      </ul>
    </section>
  );
}
