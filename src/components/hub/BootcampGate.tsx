import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { authUrlWithReturnTo } from '@/lib/authRedirect';
import { supabase } from '@/integrations/supabase/client';
import { bootcampIdFromRoute, classroomItemMatchesBootcamp } from '@/lib/bootcamps';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { useLoadedStudentWorkAcknowledgment } from '@/hooks/useStudentWorkState';
import { classroomContentKey, parseWorkIdentity, withWorkIdentity } from '@/lib/studentWorkIdentity';

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
  const { is_admin, has_classroom_access, loading: permsLoading } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const bootcampId =
    bootcampIdOverride ??
    bootcampIdFromRoute(routePath);
  const explicitRoutePaths = [routePath, ...(legacyRoutePaths ?? [])];
  const items=useClassroomItems();
  const requested=parseWorkIdentity(location.search);
  const matched=(items.data??[]).filter(row=>row.type==='bootcamp_module'&&(classroomItemMatchesBootcamp(row,bootcampId)||explicitRoutePaths.some(path=>row.source_id===path||row.source_id?.startsWith(`${path}/`)))).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
  const exact=requested?matched.find(row=>requested.sourceTable==='classroom_items'&&requested.sourceId===row.id):matched[0];
  const oldAlias=requested?.sourceTable==='classroom_items'?(items.rawData??[]).find(row=>row.id===requested.sourceId&&row.student_id===user?.id&&row.visible_to_student&&['assigned','in_progress'].includes(row.status)&&(!row.unlock_at||new Date(row.unlock_at).getTime()<=Date.now())&&((row as {issuance?:number}).issuance??1)===requested.issuance):undefined;
  const loaded=exact??(oldAlias?matched.find(row=>classroomContentKey(row)===classroomContentKey(oldAlias)):undefined);

  const { data: assigned, isLoading } = useQuery<boolean>({
    queryKey: ['bootcamp-gate', user?.id, routePath, bootcampId],
    enabled: !!user && !is_admin && !permsLoading && has_classroom_access,
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
  useLoadedStudentWorkAcknowledgment({sourceTable:'classroom_items',sourceId:loaded?.id,studentId:loaded?.student_id,ready:!!loaded&&!!assigned&&!items.isLoading&&!items.isError&&!permsLoading&&has_classroom_access&&!is_admin});
  useEffect(()=>{
    if(!exact&&loaded?.workIdentity&&oldAlias&&assigned&&!items.isLoading&&!items.isError){
      navigate(withWorkIdentity(`${location.pathname}${location.search}${location.hash}`,loaded.workIdentity),{replace:true});
    }
  },[exact,loaded,oldAlias,assigned,items.isLoading,items.isError,location.pathname,location.search,location.hash,navigate]);

  if (!authReady || permsLoading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={authUrlWithReturnTo(returnTo)} replace />;
  }

  if (is_admin || (has_classroom_access && assigned)) {
    return <>{children}</>;
  }

  if (has_classroom_access && isLoading) {
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
