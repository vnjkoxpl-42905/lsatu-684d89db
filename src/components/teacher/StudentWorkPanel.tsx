/**
 * Everything a student has actually done, on the teacher's side of the glass.
 *
 * The data was always there — every sitting writes a `section_history` row
 * with its whole per-question record, and every day of practice writes a
 * `daily_stats` row — but nothing outside the student's own account ever read
 * it. This is that reader, keyed on class_id because that is how the teacher
 * workspace knows a student.
 *
 * One rule governs the empty state: reading these rows depends on the admin
 * SELECT policy, and a blocked read comes back as an empty list rather than an
 * error. So "no rows" is never rendered as "this student has done nothing" —
 * it says what it actually knows, which is that nothing came back.
 */

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchSectionHistoryByClass, summarizeSections } from '@/lib/sectionHistory';
import SectionHistoryList from '@/components/history/SectionHistoryList';
import { formatDurationMs } from '@/lib/drillHistory';

interface DailyStat {
  date: string;
  questions_answered: number | null;
  correct_answers: number | null;
  time_spent_ms: number | null;
}

/** Days of usage to show. A term's worth, which is what a session prep needs. */
const USAGE_DAYS = 60;

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/45">{label}</p>
      <p className="mt-1 text-xl font-semibold text-black/85">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-black/45">{sub}</p>}
    </div>
  );
}

export default function StudentWorkPanel({ classId }: { classId: string }) {
  const sections = useQuery({
    queryKey: ['teacher-student-sections', classId],
    enabled: !!classId,
    queryFn: () => fetchSectionHistoryByClass(classId),
  });

  const usage = useQuery({
    queryKey: ['teacher-student-usage', classId],
    enabled: !!classId,
    queryFn: async (): Promise<DailyStat[]> => {
      const since = new Date();
      since.setDate(since.getDate() - USAGE_DAYS);
      const { data, error } = await supabase
        .from('daily_stats')
        .select('date, questions_answered, correct_answers, time_spent_ms')
        .eq('class_id', classId)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyStat[];
    },
  });

  if (sections.isLoading || usage.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-black/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading their work…
      </div>
    );
  }

  if (sections.isError || usage.isError) {
    return (
      <p className="py-8 text-sm text-black/55">
        Their work could not be read. This is usually the admin read policy not being
        applied to this database yet, rather than an empty record.
      </p>
    );
  }

  const rows = sections.data ?? [];
  const days = usage.data ?? [];
  const summary = summarizeSections(rows);
  const totalMs = days.reduce((sum, d) => sum + (d.time_spent_ms ?? 0), 0);
  const totalQuestions = days.reduce((sum, d) => sum + (d.questions_answered ?? 0), 0);
  const activeDays = days.filter((d) => (d.questions_answered ?? 0) > 0).length;
  const lastActive = days.find((d) => (d.questions_answered ?? 0) > 0)?.date ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Sections sat"
          value={String(summary.sections)}
          sub={summary.bestLabel ? `Best ${summary.bestPercent}% · ${summary.bestLabel}` : undefined}
        />
        <Tile
          label={`Time on task · ${USAGE_DAYS}d`}
          value={formatDurationMs(totalMs)}
          sub={`${activeDays} day${activeDays === 1 ? '' : 's'} worked`}
        />
        <Tile label="Questions answered" value={String(totalQuestions)} sub={`last ${USAGE_DAYS} days`} />
        <Tile
          label="Last worked"
          value={lastActive ? new Date(`${lastActive}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }) : '—'}
          sub={lastActive ? undefined : 'no practice recorded'}
        />
      </div>

      {/* Day by day, so "how long were they on and when" is answerable rather
          than averaged away. Only days with work: a row of zeroes for every
          day they did nothing is noise, and the count above already says how
          many days were worked. */}
      {days.some((d) => (d.questions_answered ?? 0) > 0) && (
        <div className="rounded-xl border border-black/10 bg-white/40">
          <div className="border-b border-black/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-black/45">
            Usage by day
          </div>
          <div className="max-h-64 divide-y divide-black/5 overflow-y-auto">
            {days
              .filter((d) => (d.questions_answered ?? 0) > 0)
              .map((d) => (
                <div key={d.date} className="flex items-center gap-4 px-4 py-2 text-sm">
                  <span className="w-28 shrink-0 text-black/70">
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="w-20 tabular-nums text-black/55">
                    {formatDurationMs(d.time_spent_ms ?? 0)}
                  </span>
                  <span className="tabular-nums text-black/55">
                    {d.correct_answers ?? 0}/{d.questions_answered ?? 0} correct
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-black/45">
          Sections sat
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-black/55">
            No sittings came back for this student. Either they have not sat a section yet,
            or the admin read policy is not applied to this database.
          </p>
        ) : (
          <SectionHistoryList rows={rows} />
        )}
      </div>
    </div>
  );
}
