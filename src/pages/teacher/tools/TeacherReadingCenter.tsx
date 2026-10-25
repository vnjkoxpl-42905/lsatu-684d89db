import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useHubStudents } from '@/hooks/useHubStudents';
import { supabase } from '@/integrations/supabase/client';
import { assignWork } from '@/lib/assignWork';
import { revokeReadingCenter, READING_CENTER_PATH } from '@/lib/readingCenterAccess';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

export default function TeacherReadingCenter() {
  const { user } = useAuth();
  const { rows: students, loading: studentsLoading, error: studentsError } = useHubStudents();
  const [params] = useSearchParams();
  const [studentId, setStudentId] = useState(params.get('student') ?? '');
  const [scheduled, setScheduled] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const cache = useQueryClient();
  const assignments = useQuery({
    queryKey: ['reading-center-assignment-admin', studentId], enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('classroom_items').select('*')
        .eq('student_id', studentId).eq('source_table', 'reading_center').eq('source_id', 'library')
        .eq('visible_to_student', true).in('status', ['assigned', 'in_progress', 'completed']);
      if (error) throw error;
      return (data ?? []) as ClassroomItem[];
    },
  });
  const current = assignments.data?.[0];
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['reading-center-assignment-admin', studentId] }),
      cache.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] }),
      cache.invalidateQueries({ queryKey: ['classroom-items', studentId] }),
      cache.invalidateQueries({ queryKey: ['reading-center-access', studentId] }),
    ]);
  };
  const assign = async () => {
    if (!user || !studentId) return;
    setBusy(true); setFeedback('');
    try {
      const result = await assignWork({ teacherId: user.id, studentIds: [studentId], item: { kind: 'reading_center' },
        scheduledForLocalDate: scheduled || undefined });
      if (result.failed.length) throw new Error(result.failed[0].error);
      await refresh();
      setFeedback(result.ok[0]?.notify && !Object.values(result.ok[0].notify).every(Boolean)
        ? 'Reading Center is assigned and visible in the student’s work. A notification did not arrive.'
        : scheduled
          ? `Reading Center assignment verified. It will appear in the student’s work from ${scheduled}.`
          : 'Reading Center assignment verified. The student can open it from their assigned work.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Assignment failed.'); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true); setFeedback('');
    try { await revokeReadingCenter(studentId); await refresh(); setFeedback('Reading Center access removed. Saved reading work is preserved.'); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not remove access.'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-6 sm:px-6">
    <div><h1 className="text-2xl font-semibold">Assign Reading Center</h1>
      <p className="mt-2 text-sm text-black/65">Give a student access to the reading tool. It appears in their assigned work when its start date arrives.</p></div>
    <Link className="inline-block rounded border border-black/20 px-4 py-2 text-sm" to={READING_CENTER_PATH}>Open Reading Center</Link>
    <div className="space-y-4 rounded border border-black/15 bg-white/30 p-5">
      <label className="block text-sm font-medium">Student
        <select className="mt-2 block w-full rounded border border-black/20 bg-white p-2" value={studentId}
          onChange={(event) => { setStudentId(event.target.value); setFeedback(''); }} disabled={studentsLoading || busy}>
          <option value="">Choose a student</option>
          {students.filter((student) => student.role !== 'admin').map((student) => <option key={student.class_id} value={student.class_id}>
            {student.display_name || student.email || student.class_id}{student.display_name && student.email ? ` (${student.email})` : ''}
          </option>)}
        </select>
      </label>
      {studentsError && <p role="alert">Could not load students: {studentsError.message}</p>}
      {assignments.isError && <p role="alert">Could not check this student’s current access. <button className="underline" onClick={() => void assignments.refetch()}>Try again</button></p>}
      {current ? <div className="space-y-3"><p className="text-sm">{current.unlock_at && new Date(current.unlock_at) > new Date()
        ? `Assigned. Available from ${new Date(current.unlock_at).toLocaleDateString('en-CA')}.`
        : 'Reading Center is assigned to this student.'}</p>
        <button className="rounded border border-black/25 px-4 py-2 text-sm" disabled={busy} onClick={() => void revoke()}>Remove access</button>
      </div> : <>
        <label className="block text-sm font-medium">Start date (optional)
          <input type="date" className="mt-2 block rounded border border-black/20 bg-white p-2" value={scheduled} onChange={(event) => setScheduled(event.target.value)} disabled={busy} />
        </label>
        <button className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40" onClick={() => void assign()}
          disabled={!studentId || busy || assignments.isPending || assignments.isError}>{busy ? 'Assigning…' : 'Assign Reading Center'}</button>
      </>}
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
    </div>
  </div>;
}
