/**
 * Closing out an assigned section when the student finishes sitting it.
 *
 * A section assigned from the teacher side is a `classroom_items` row carrying
 * the PrepTest and section in its metadata. Nothing connected finishing the
 * section to that row, so a completed section sat on Home for ever and the only
 * way to clear it was a "Mark done" button the student pressed themselves.
 *
 * That button is the wrong instrument for this kind of work. It asks the
 * student to assert something the system already knows, and it can be pressed
 * without doing the section at all. Sitting the section IS the completion, so
 * finishing the run closes the row.
 *
 * Deliberately quiet: a failure here must never surface in the runner or block
 * the results screen. The worst case is a card that lingers, which is exactly
 * where we already were.
 */
import { supabase } from '@/integrations/supabase/client';
import { completeLinkedTodo } from '@/lib/todoActions';

interface SectionAssignmentMeta {
  kind?: string;
  pt?: number;
  section?: number;
  section_kind?: string;
}

export async function closeOutAssignedSection(
  studentId: string,
  pt: number,
  section: number,
  sectionKind: 'lr' | 'rc' = 'lr',
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('classroom_items')
      .select('id, metadata_json')
      .eq('student_id', studentId)
      .eq('type', 'homework')
      .neq('status', 'completed');

    if (error || !data?.length) return 0;

    const matches = data.filter((row) => {
      const meta = (row.metadata_json ?? {}) as SectionAssignmentMeta;
      return (
        meta.kind === 'timed_section' &&
        meta.pt === pt &&
        meta.section === section &&
        (meta.section_kind ?? 'lr') === sectionKind
      );
    });
    if (!matches.length) return 0;

    const { error: updateError } = await supabase
      .from('classroom_items')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', matches.map((row) => row.id));

    if (updateError) {
      console.warn('[closeOutAssignedSection] update failed', updateError.message);
      return 0;
    }
    return matches.length;
  } catch (err) {
    console.warn('[closeOutAssignedSection] skipped', err);
    return 0;
  }
}

/**
 * Percent correct over every question in the set, blanks counted wrong, to two
 * decimals. This is the number stored on `homework_assignments.score`; both
 * finish paths use it so a section and a practice set are scored alike.
 */
export function homeworkScore(
  total: number,
  attempts: Iterable<[string, { selectedAnswer?: string | null; correct?: boolean }]>,
): number {
  if (total <= 0) return 0;
  let correct = 0;
  for (const [, a] of attempts) if (a.selectedAnswer && a.correct) correct += 1;
  return Math.round((correct / total) * 10000) / 100;
}

/**
 * The same idea for a homework set that is exactly one PrepTest section.
 *
 * Such a set runs as a real timed section (see `singleSectionOf` in
 * drillRunSpec.ts), so it finishes through `handleFinishSection`, not the
 * practice-set path that used to stamp `homework_assignments` completed. From
 * 2026-09-10 until this landed, nothing completed the row: the card stayed on
 * Home, and because a section closes its own card the "Mark done" button was
 * hidden too, so the student could not clear it either.
 *
 * Sitting the section is the completion. The `homework_assignments` row is
 * the source of truth (Home hides a card once the source row is completed);
 * the `classroom_items` mirror and any linked to-do are closed as well so
 * every list agrees. Returns true when the assignment row was stamped.
 *
 * Throws only if the source row cannot be updated: the caller decides how to
 * tell the student. A mirror or to-do that fails to close is logged and
 * ignored, because the source row already says the work is done.
 */
export async function closeOutHomeworkAssignment(
  assignmentId: string,
  studentId: string,
  score: number,
): Promise<boolean> {
  const completedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('homework_assignments')
    .update({ status: 'completed', completed_at: completedAt, score })
    .eq('id', assignmentId)
    .eq('student_id', studentId)
    .neq('status', 'completed')
    .select('id');
  if (error) throw error;
  const stamped = (data?.length ?? 0) > 0;

  const { error: mirrorError } = await supabase
    .from('classroom_items')
    .update({ status: 'completed', completed_at: completedAt })
    .eq('student_id', studentId)
    .eq('source_table', 'homework_assignments')
    .eq('source_id', assignmentId)
    .neq('status', 'completed');
  if (mirrorError) {
    console.warn('[closeOutHomeworkAssignment] mirror update failed', mirrorError.message);
  }

  await completeLinkedTodo(assignmentId);
  return stamped;
}
