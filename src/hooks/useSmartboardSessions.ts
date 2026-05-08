import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export interface SmartboardSession {
  id: string;
  student_id: string;
  created_by: string;
  title: string;
  excalidraw_scene_json: unknown;
  preview_image_path: string | null;
  export_pdf_path: string | null;
  session_date: string;
  posted_to_classroom: boolean;
  linked_recap_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useSmartboardSessions(studentId: string | null) {
  return useQuery<SmartboardSession[]>({
    queryKey: ['smartboard-sessions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smartboard_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SmartboardSession[];
    },
  });
}

export function useSaveSmartboardSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      studentId: string;
      title?: string;
      sceneJson: unknown;
    }) => {
      if (!user) throw new Error('Not signed in');
      if (input.id) {
        const { data, error } = await supabase
          .from('smartboard_sessions')
          .update({
            title: input.title,
            excalidraw_scene_json: input.sceneJson as Json,
          })
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['smartboard-sessions'] });
        return data as SmartboardSession;
      }
      const { data, error } = await supabase
        .from('smartboard_sessions')
        .insert({
          student_id: input.studentId,
          created_by: user.id,
          title: input.title ?? 'Smartboard session',
          excalidraw_scene_json: input.sceneJson as Json,
        })
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['smartboard-sessions'] });
      return data as SmartboardSession;
    },
  });
}
