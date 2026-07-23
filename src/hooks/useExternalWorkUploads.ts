import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UploadType =
  | '7sage_analytics'
  | 'pt_result'
  | 'lr_section'
  | 'rc_section'
  | 'drill_result'
  | 'score_report'
  | 'other';

export interface ExternalWorkUpload {
  id: string;
  student_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  storage_bucket?: string | null;
  source_platform: string | null;
  upload_type: UploadType;
  processing_status:
    | 'uploaded'
    | 'processing'
    | 'parsed'
    | 'needs_review'
    | 'failed';
  applied_to_analytics: boolean;
  extracted_text: string | null;
  parsed_json: unknown | null;
  confidence_score: number | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Statuses that mean parsing is still in flight — poll while any are present. */
const IN_FLIGHT: ExternalWorkUpload['processing_status'][] = ['uploaded', 'processing'];

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/**
 * Student-side: list of own uploads + a `submit` helper that uploads the
 * file to the private bucket and creates a row keyed to the student.
 */
export function useStudentExternalUploads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const list = useQuery<ExternalWorkUpload[]>({
    queryKey: ['external-uploads-mine', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('external_work_uploads')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExternalWorkUpload[];
    },
    // While a recent upload is still parsing, poll so the status chip flips
    // from Processing → Imported / Needs review without a manual refresh.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((u) => IN_FLIGHT.includes(u.processing_status))
        ? 4000
        : false,
  });

  const submit = useCallback(
    async (file: File, uploadType: UploadType, sourcePlatform?: string) => {
      if (!user) throw new Error('Not signed in');
      if (file.size > MAX_SIZE) throw new Error('File must be under 25MB');
      if (!ALLOWED.has(file.type)) {
        throw new Error('Only PDF and image files are accepted');
      }
      setSubmitting(true);
      try {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from('external-work-uploads')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data, error } = await supabase
          .from('external_work_uploads')
          .insert({
            student_id: user.id,
            uploaded_by: user.id,
            file_name: file.name,
            file_type: file.type,
            storage_path: path,
            upload_type: uploadType,
            source_platform: sourcePlatform ?? null,
            processing_status: 'uploaded',
          })
          .select()
          .single();
        if (error) {
          // Roll back the storage object so we never have an orphan file.
          await supabase.storage.from('external-work-uploads').remove([path]);
          throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ['external-uploads-mine'] });
        // Kick off auto-parse. Do not block the return on it — the file is
        // safely stored either way — but refresh status when it settles.
        supabase.functions
          .invoke('parse-external-work', { body: { uploadId: (data as unknown as ExternalWorkUpload).id } })
          .catch((err) => console.error('parse-external-work invoke failed', err))
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ['external-uploads-mine'] });
          });
        return data as unknown as ExternalWorkUpload;
      } finally {
        setSubmitting(false);
      }
    },
    [user, queryClient],
  );

  return { ...list, submit, submitting };
}

/**
 * Admin queue across all students. Defaults to only items that need
 * review — flip `all=true` for the full archive.
 */
export function useAdminUploadsQueue(opts: { all?: boolean } = {}) {
  const all = !!opts.all;
  const { user } = useAuth();
  return useQuery<ExternalWorkUpload[]>({
    queryKey: ['external-uploads-queue', all],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from('external_work_uploads').select('*');
      if (!all) {
        q = q.in('processing_status', ['uploaded', 'needs_review']);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExternalWorkUpload[];
    },
  });
}

export function useStudentExternalUploadsForStudent(studentId: string | null) {
  return useQuery<ExternalWorkUpload[]>({
    queryKey: ['external-uploads-by-student', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_work_uploads')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExternalWorkUpload[];
    },
  });
}
