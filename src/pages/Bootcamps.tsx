import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { BookOpen, Loader2, Lock } from 'lucide-react';
import { BUILD_SHA, BUILD_TIME } from '@/lib/buildInfo';
import { BOOTCAMPS, classroomItemMatchesBootcamp, isQuickDrill } from '@/lib/bootcamps';

export default function BootcampsPage() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const { data: items = [], isLoading: itemsLoading } = useClassroomItems();

  React.useEffect(() => {
    if (authReady && !user) navigate('/auth');
  }, [user, authReady, navigate]);

  const assignedBootcampIds = React.useMemo(() => {
    return new Set(
      BOOTCAMPS.filter((bc) =>
        items.some(
          (it) =>
            it.type === 'bootcamp_module' &&
            it.status !== 'archived' &&
            classroomItemMatchesBootcamp(
              {
                source_id: it.source_id,
                metadata_json: it.metadata_json as Record<string, unknown> | null,
              },
              bc.id,
            ),
        ),
      ).map((bc) => bc.id),
    );
  }, [items]);

  const visible = is_admin
    ? BOOTCAMPS
    : BOOTCAMPS.filter((b) => assignedBootcampIds.has(b.id));

  const loading = !authReady || permsLoading || (!is_admin && itemsLoading);

  return (
    // No header of its own: the classroom rail owns the way back, sign out and
    // the theme toggle. Drawing them again put a second set on top of the frame.
    <div className="bg-background">
      <section aria-labelledby="bootcamps-heading" className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 id="bootcamps-heading" className="text-3xl font-semibold tracking-tight text-foreground">Bootcamps</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            {is_admin
              ? 'All bootcamps. Students only see bootcamps you assign from the Teacher Workspace.'
              : 'Focused skill-building programs assigned to you by Joshua.'}
          </p>
          {/* Build stamp is a debugging aid, not something a student needs. */}
          {is_admin ? (
            <p
              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 select-text"
              title={`Build ${BUILD_SHA} · ${BUILD_TIME}`}
            >
              build {BUILD_SHA}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">No bootcamps assigned yet</h2>
              <p className="text-xs text-muted-foreground">
                Joshua will add bootcamps to your path from the Teacher Workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
          {([
            ['Bootcamps', visible.filter((b) => !isQuickDrill(b))],
            ['Quick Drills', visible.filter(isQuickDrill)],
          ] as const).filter(([, list]) => list.length > 0).map(([heading, list]) => (
          <div key={heading} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{heading}</h3>
            {list.map((bc) => (
              <div
                key={bc.id}
                className="rounded-xl bg-card border border-border shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-start"
              >
                <div
                  className="w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: bc.theme.bg,
                    borderColor: bc.theme.accent,
                    color: bc.theme.accent,
                  }}
                >
                  <BookOpen className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{bc.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                    {bc.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    {bc.stats.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(bc.route)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
                    >
                      {isQuickDrill(bc) ? 'Start drill' : 'Launch Bootcamp'}
                      <span className="ml-1">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          ))}
          </div>
        )}
      </section>
    </div>
  );
}
