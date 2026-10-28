import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PostSessionHomeState, PostSessionSnapshot, PostSessionTask, PostSessionChange } from './postSessionModel';

export const postSessionQueryKey = (actorId: string | undefined) => ['teacher-home:post-session', actorId] as const;
// This additive RPC has not yet been included in the generated database types.
const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>)(name, args);
const notInstalled = (error: { code?: string }) => ['PGRST202', '42883'].includes(error.code ?? '');

export function usePostSessionHome(actorId: string | undefined, isAdmin: boolean): PostSessionHomeState {
  const client = useQueryClient();
  const [saving, setSaving] = React.useState<{ actor: string; id: string } | null>(null);
  const [failure, setFailure] = React.useState<{ actor: string; message: string } | null>(null);
  const actorRef = React.useRef(actorId);
  actorRef.current = actorId;
  const busy = React.useRef(false);
  const enabled = !!actorId && isAdmin;
  const query = useQuery<PostSessionSnapshot>({
    queryKey: postSessionQueryKey(actorId), enabled, staleTime: 30_000, refetchInterval: 60_000, retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('teacher_post_session_home');
      if (error) {
        // A missing RPC during a later refresh must not erase saved work.
        if (notInstalled(error) && client.getQueryData(postSessionQueryKey(actorId)) === undefined) return { settings: null, tasks: [], handled: [] };
        throw error;
      }
      if (!data || !Array.isArray((data as PostSessionSnapshot).tasks) || !Array.isArray((data as PostSessionSnapshot).handled)) throw new Error('Invalid work list response');
      return data as PostSessionSnapshot;
    },
  });
  const update = async (task: PostSessionTask, change: PostSessionChange) => {
    if (!enabled || busy.current) return;
    const owner = actorId;
    busy.current = true;
    setSaving({ actor: owner, id: task.id }); setFailure(null);
    try {
      const { error } = await rpc('teacher_post_session_update', {
        _task_id: task.id, _expected_revision: task.revision, _action: change.action,
        _field: change.field ?? null, _value: change.value ?? null,
        _doc_id: change.docId ?? null, _student_id: change.studentId ?? null,
      });
      if (error) throw error;
      await client.invalidateQueries({ queryKey: postSessionQueryKey(owner), exact: true });
    } catch {
      if (actorRef.current === owner) setFailure({ actor: owner, message: 'Could not save this change. The latest work list has been requested. Check it and try again.' });
      await client.invalidateQueries({ queryKey: postSessionQueryKey(owner), exact: true });
    } finally {
      busy.current = false;
      if (actorRef.current === owner) setSaving(null);
    }
  };
  if (!enabled) return { state: 'setup' };
  const data = query.data;
  return {
    state: data ? data.settings && (data.settings.enabled || data.tasks.length > 0 || data.handled.length > 0) ? 'ready' : 'setup' : query.isError ? 'error' : 'loading', data,
    refreshFailed: !!data && query.isError,
    error: failure?.actor === actorId ? failure.message : undefined,
    savingId: saving?.actor === actorId ? saving.id : null,
    retry: () => { setFailure(null); void query.refetch(); }, update,
  };
}
