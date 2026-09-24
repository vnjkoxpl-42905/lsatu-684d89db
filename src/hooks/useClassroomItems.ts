import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ClassroomItemType =
  | 'drill'
  | 'homework'
  | 'activity'
  | 'bootcamp_module'
  | 'note'
  | 'session_recap'
  | 'announcement'
  | 'upload_summary'
  | 'weekly_plan_task'
  | 'smartboard_recap'
  | 'practice_test';

export type ClassroomItemStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'archived';

export interface ClassroomItem {
  id: string;
  student_id: string;
  class_id: string | null;
  created_by: string;
  type: ClassroomItemType;
  title: string;
  description: string | null;
  content_html: string | null;
  content_markdown: string | null;
  source_table: string | null;
  source_id: string | null;
  status: ClassroomItemStatus;
  unlock_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  priority: number;
  visible_to_student: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Student-side: returns visible, unlocked classroom_items for the signed-in
 * user. Keep the explicit student_id filter even though RLS also protects
 * student accounts: admins can read every row, and may still open student-side
 * routes while testing. Without this scope, an admin sees every student's work
 * combined into one calendar.
 */
export function useClassroomItems() {
  const { user } = useAuth();
  return useQuery<ClassroomItem[]>({
    queryKey: ['classroom-items', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_items')
        .select('*')
        .eq('student_id', user!.id)
        .order('priority', { ascending: false })
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassroomItem[];
    },
  });
}

/**
 * Admin-side: full read of a single student's items (regardless of
 * visibility / unlock). Admin RLS bypass.
 */
export function useStudentClassroomItems(studentId: string | null) {
  return useQuery<ClassroomItem[]>({
    queryKey: ['classroom-items-admin', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_items')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassroomItem[];
    },
  });
}
