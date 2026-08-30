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
