import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  /**
   * The route prefix for this bootcamp, e.g. "/bootcamp/principle-flaw".
   * Matched against either `metadata_json.bootcamp_id` (last segment) or
   * `source_id` on a classroom_items row of type bootcamp_module.
   */
  routePath: string;
  /**
   * The student-facing display name, used only by the locked state.
   */
  title?: string;
  children: ReactNode;
}

/**
 * Per-student bootcamp gate. Admins always pass. Students need a
 * matching `classroom_items` row of type='bootcamp_module' assigned to
 * them. If no row exists, render a calm "Not assigned yet" surface.
 *
 * Direct URL hits go through this gate, so a student typing
 * /bootcamp/principle-flaw won't see anything they weren't assigned.
 */
export default function BootcampGate({ routePath, title, children }: Props) {
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const navigate = useNavigate();
  const bootcampId = routePath.replace(/^\/bootcamp\//, '').replace(/\/.*$/, '');

  const { data: assigned, isLoading } = useQuery<boolean>({
    queryKey: ['bootcamp-gate', user?.id, routePath],
    enabled: !!user && !is_admin && !permsLoading,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('classroom_items')
        .select('id, status, source_id, metadata_json')
        .eq('type', 'bootcamp_module')
        .eq('student_id', user!.id)
        .neq('status', 'archived');
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        source_id: string | null;
        metadata_json: Record<string, unknown> | null;
      }>;
      return rows.some((r) => {
        if (r.source_id === routePath) return true;
        const mid = (r.metadata_json as any)?.bootcamp_id;
        return mid === bootcampId;
      });
    },
  });

  if (!authReady || permsLoading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (is_admin || assigned) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Not assigned yet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {title ? `${title} ` : 'This bootcamp '}
            isn't part of your current path. Joshua can add it from the Teacher Workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/classroom')}>
          Back to Classroom
        </Button>
      </div>
    </div>
  );
}
