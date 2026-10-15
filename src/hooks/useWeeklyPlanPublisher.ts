import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from '@/lib/classroomItems';
import { runPublish, type PublishDeps, type PublishJob, type PublishOutcome } from '@/lib/weeklyPlanPublish';

/**
 * Runs weekly-plan publishes for the teacher page and keeps each one tied to
 * the teacher account AND the student it was started for.
 *
 * Ownership: a job's origin is (teacherId, studentId), fixed at creation.
 * Busy and stopped state are keyed by that pair, so a different teacher
 * account never sees, retries or dismisses another account's job, even with
 * the same student selected. A stopped job stays here for this page's
 * lifetime only; the records it wrote are on the server either way.
 *
 * Writes: the dependencies are captured when a job starts, and the engine
 * re-reads the signed-in account before every write and stops if it is not
 * the job's teacher. A request already sent when the account changes cannot
 * be recalled; its result is kept under the job's own origin.
 *
 * Settlement: `sameActor` says whether the job's teacher is still the page's
 * current teacher; `sameView` additionally requires the same student with no
 * switch of teacher or student in between. The caller may clear the builder
 * only on `sameView`, and may notify the student only on `sameActor`.
 */
export function publishKey(teacherId: string, studentId: string): string {
  return `${teacherId}\u0000${studentId}`;
}

export function useWeeklyPlanPublisher({
  currentTeacherId,
  currentStudentId,
  deps,
  onPublished,
}: {
  currentTeacherId: string | null;
  currentStudentId: string | null;
  deps: PublishDeps;
  onPublished: (job: PublishJob, info: { sameView: boolean; sameActor: boolean }) => void;
}) {
  const [stopped, setStopped] = React.useState<Record<string, PublishOutcome>>({});
  const [busy, setBusy] = React.useState<Record<string, true>>({});
  const busyRef = React.useRef(new Set<string>());

  // A new "view" each time the teacher or the selected student changes, even
  // back to one seen before, because the builder is emptied on every change.
  const viewRef = React.useRef({ teacherId: currentTeacherId, studentId: currentStudentId, epoch: 0, actorEpoch: 0 });
  if (viewRef.current.teacherId !== currentTeacherId || viewRef.current.studentId !== currentStudentId) {
    viewRef.current = {
      teacherId: currentTeacherId,
      studentId: currentStudentId,
      epoch: viewRef.current.epoch + 1,
      actorEpoch: viewRef.current.actorEpoch + Number(viewRef.current.teacherId !== currentTeacherId),
    };
  }

  const depsRef = React.useRef(deps);
  depsRef.current = deps;
  const onPublishedRef = React.useRef(onPublished);
  onPublishedRef.current = onPublished;

  const run = React.useCallback(async (job: PublishJob): Promise<PublishOutcome | null> => {
    // Only the current teacher can start or retry a job, and only their own.
    if (!job.teacherId || job.teacherId !== viewRef.current.teacherId) return null;
    const key = publishKey(job.teacherId, job.studentId);
    if (busyRef.current.has(key)) return null;
    busyRef.current.add(key);
    setBusy((prev) => ({ ...prev, [key]: true }));
    const startedIn = { ...viewRef.current };
    const jobDeps = depsRef.current;
    let outcome: PublishOutcome;
    try {
      outcome = await runPublish(job, jobDeps);
    } finally {
      busyRef.current.delete(key);
      setBusy((prev) => {
        const { [key]: _done, ...rest } = prev;
        return rest;
      });
    }
    if (outcome.ok) {
      setStopped((prev) => {
        const { [key]: _done, ...rest } = prev;
        return rest;
      });
      const now = viewRef.current;
      const sameActor = now.teacherId === job.teacherId && now.actorEpoch === startedIn.actorEpoch;
      onPublishedRef.current(outcome.job, {
        sameActor,
        sameView: sameActor && now.studentId === job.studentId && now.epoch === startedIn.epoch,
      });
    } else if (outcome.failedAt !== 'blocked') {
      // A blocked job wrote nothing, so there is nothing to resume.
      setStopped((prev) => ({ ...prev, [key]: outcome }));
    }
    return outcome;
  }, []);

  const keyFor = (studentId: string | null) =>
    currentTeacherId && studentId ? publishKey(currentTeacherId, studentId) : null;

  const retry = (studentId: string) => {
    const key = keyFor(studentId);
    const outcome = key ? stopped[key] : undefined;
    return outcome ? run(outcome.job) : Promise.resolve(null);
  };

  /** Stop offering a retry. Nothing on the server is changed or removed. */
  const dismiss = (studentId: string) => {
    const key = keyFor(studentId);
    if (!key) return;
    setStopped((prev) => {
      const { [key]: _gone, ...rest } = prev;
      return rest;
    });
  };

  return {
    run,
    retry,
    dismiss,
    /** The current teacher's stopped job for this student, if any. */
    stoppedFor: (studentId: string | null) => {
      const key = keyFor(studentId);
      return key ? stopped[key] ?? null : null;
    },
    busyFor: (studentId: string | null) => {
      const key = keyFor(studentId);
      return key ? !!busy[key] : false;
    },
  };
}

type Row = { id: string };
type Res<T> = { data: T | null; error: { message: string } | null };
/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as unknown as { from: (t: string) => any };
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * The live writes. Every one is safe to repeat: inserts carry ids chosen in
 * advance and fall back to reading the row that is already there; updates
 * report the rows they matched, and the publish step counts a plan that is
 * already published as matched.
 */
export function supabasePublishDeps(): PublishDeps {
  return {
    async currentActorId() {
      // The session the next request will actually be sent with.
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session?.user?.id ?? null;
    },

    async insertDraftPlan(row) {
      const { data, error } = (await db.from('weekly_plans').insert(row).select('id').maybeSingle()) as Res<Row>;
      if (data?.id) return data;
      const existing = (await db
        .from('weekly_plans')
        .select('id')
        .eq('id', row.id)
        .eq('student_id', row.student_id)
        .maybeSingle()) as Res<Row>;
      if (existing.data?.id) return existing.data;
      throw new Error(error?.message ?? 'The plan was not saved.');
    },


    async insertItems(rows) {
      const ids = rows.map((r) => r.id as string);
      const { data, error } = (await db
        .from('weekly_plan_items')
        .insert(rows)
        .select('id,sort_order')) as Res<{ id: string; sort_order: number }[]>;
      if (!error && data) return data;
      // The insert may have landed even though its answer did not. Report
      // whatever rows exist under the chosen ids; the caller requires all.
      const existing = (await db
        .from('weekly_plan_items')
        .select('id,sort_order')
        .in('id', ids)) as Res<{ id: string; sort_order: number }[]>;
      if (existing.data && existing.data.length > 0) return existing.data;
      throw new Error(error?.message ?? 'The tasks were not saved.');
    },

    async createMirror(input) {
      const existing = (await db
        .from('classroom_items')
        .select('id')
        .eq('source_table', 'weekly_plan_items')
        .eq('source_id', input.sourceId)
        .eq('student_id', input.studentId)
        .limit(1)) as Res<Row[]>;
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data?.[0]?.id) return existing.data[0];
      return createClassroomItem(input as unknown as Parameters<typeof createClassroomItem>[0]);
    },

    async linkMirror(itemId, mirrorId) {
      const { data, error } = (await db
        .from('weekly_plan_items')
        .update({ classroom_item_id: mirrorId })
        .eq('id', itemId)
        .select('id')) as Res<Row[]>;
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },

    async revealMirrors(ids) {
      const { data, error } = (await db
        .from('classroom_items')
        .update({ visible_to_student: true })
        .in('id', ids)
        .select('id')) as Res<Row[]>;
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },

    async publishPlan(planId, publishedAt) {
      const { data, error } = (await db
        .from('weekly_plans')
        .update({ status: 'published', published_at: publishedAt })
        .eq('id', planId)
        .eq('status', 'draft')
        .select('id')) as Res<Row[]>;
      if (error) throw new Error(error.message);
      if ((data?.length ?? 0) === 1) return 1;
      // Zero rows: either the earlier attempt already published it (its answer
      // was lost) or the row is gone or changed. Only the first counts.
      const check = (await db.from('weekly_plans').select('status').eq('id', planId).maybeSingle()) as Res<{ status: string }>;
      if (check.error) throw new Error(check.error.message);
      return check.data?.status === 'published' ? 1 : 0;
    },
  };
}
