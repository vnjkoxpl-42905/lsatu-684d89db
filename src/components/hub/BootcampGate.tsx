import { type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { authUrlWithReturnTo } from '@/lib/authRedirect';
import { supabase } from '@/integrations/supabase/client';
import { bootcampIdFromRoute, classroomItemMatchesBootcamp } from '@/lib/bootcamps';

interface Props {
  /**
   * The route prefix for this bootcamp, e.g. "/bootcamp/principle-flaw" or
   * "/topics/abstract". Matched against either `metadata_json.bootcamp_id`
   * (slug, see `bootcampIdOverride`) or `source_id` on a classroom_items
   * row of type bootcamp_module.
   */
  routePath: string;
  /**
   * Override the slug extracted from `routePath`. Default behavior strips a
   * leading "/bootcamp/" and trailing path segments, which works for the
   * /bootcamp/* family. New surfaces under /topics/* should pass this
   * explicitly (e.g. routePath "/topics/abstract", bootcampIdOverride
   * "abstraction") so classroom_items rows assigned with the legacy slug
   * still resolve to the same gate.
   */
  bootcampIdOverride?: string;
  /**
   * Additional route paths to accept as `source_id` matches. Used when a
   * topic has moved (legacy /bootcamp/abstraction → /topics/abstract). The
   * current `routePath` is always matched.
   */
  legacyRoutePaths?: string[];
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
export default function BootcampGate({
  routePath,
  bootcampIdOverride,
  legacyRoutePaths,
  title,
  children,
}: Props) {
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const bootcampId =
    bootcampIdOverride ??
    bootcampIdFromRoute(routePath);
  const explicitRoutePaths = [routePath, ...(legacyRoutePaths ?? [])];

  const { data: assigned, isLoading } = useQuery<boolean>({
    queryKey: ['bootcamp-gate', user?.id, routePath, bootcampId],
    enabled: !!user && !is_admin && !permsLoading,
    queryFn: async () => {
      const { data, error } = await supabase
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
      return rows.some(
        (r) =>
          classroomItemMatchesBootcamp(r, bootcampId) ||
          (r.source_id
            ? explicitRoutePaths.some((path) => r.source_id === path || r.source_id?.startsWith(`${path}/`))
            : false),
      );
    },
  });

  if (!authReady || permsLoading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={authUrlWithReturnTo(returnTo)} replace />;
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
