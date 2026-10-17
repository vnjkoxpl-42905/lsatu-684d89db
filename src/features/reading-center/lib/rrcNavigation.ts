import { supabase } from '@/integrations/supabase/client';
import { hasReadingCenterAccess } from '@/lib/readingCenterAccess';

/** Return only to a door the current account can open; legacy assignments remain usable. */
export async function rrcExitPath(userId: string, fromLibrary = false): Promise<string> {
  try {
    if (await hasReadingCenterAccess()) return fromLibrary ? '/reading-center' : '/reading-center/rrc';
    if (!fromLibrary) {
      const { data, error } = await supabase.from('activity_assignments').select('id')
        .eq('student_id', userId).eq('mode', 'section-library').limit(1);
      if (!error && data?.length) return '/reading-center/rrc';
    }
  } catch {
    // The student's assigned-work page is safe even when a grant read fails.
  }
  return '/classroom';
}
