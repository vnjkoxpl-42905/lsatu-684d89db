import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentWorkAccessReceipts } from '@/hooks/useStudentWorkState';
import { classroomWorkIdentity, deduplicateEquivalentClassroomItems, type StudentWorkIdentity } from '@/lib/studentWorkIdentity';

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
  | 'practice_test'
  | 'link';

export type ClassroomItemStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'archived';

export interface ClassroomItem {
  workIdentity?:StudentWorkIdentity;
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
  const queryClient = useQueryClient();
  const userId = user?.id;
  const workState=useStudentWorkAccessReceipts();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`classroom-items-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_items', filter: `student_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['classroom-items', userId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, userId]);
  const query=useQuery<ClassroomItem[]>({
    queryKey: ['classroom-items', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const items = new Map<string, ClassroomItem>();
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('classroom_items')
          .select('*')
          .eq('student_id', user!.id)
          .order('priority', { ascending: false })
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as ClassroomItem[];
        for (const item of page) if (!items.has(item.id)) items.set(item.id, item);
        if (page.length < pageSize) return [...items.values()];
      }
    },
  });
  const data=workState.data?(query.data?deduplicateEquivalentClassroomItems(query.data):undefined)?.filter(item=>{
    const identity=classroomWorkIdentity(item,workState.data.practiceTests);
    return identity&&workState.data.access.some(row=>row.available&&row.source_table===identity.sourceTable&&row.source_id===identity.sourceId);
  }).map(item=>{
    const identity=classroomWorkIdentity(item,workState.data.practiceTests)!;
    const current=workState.data.access.find(row=>row.available&&row.source_table===identity.sourceTable&&row.source_id===identity.sourceId);
    const receipt=workState.data.receipts.find(row=>row.source_table===identity.sourceTable&&row.source_id===identity.sourceId&&row.issuance===current?.issuance);
    const {read_at:_priorRead,...metadata}=item.metadata_json??{};
    return {...item,workIdentity:{...identity,issuance:current?.issuance??identity.issuance},issuance:current?.issuance??identity.issuance,metadata_json:receipt?{...metadata,read_at:receipt.read_at}:metadata};
  }):undefined;
  return {...query,data,rawData:query.data,isLoading:query.isLoading||workState.isLoading,isError:query.isError||workState.isError,error:query.error??workState.error,refetch:async()=>{await workState.refetch();return query.refetch();}};
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
