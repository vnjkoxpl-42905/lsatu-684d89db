import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useClassroomLayout } from "@/components/classroom/shell/classroomLayoutContext";
import { useClassroomHome } from "./useClassroomHome";
import { useHomeFreshness } from "./useHomeFreshness";
import ClassroomHomeView from "./ClassroomHomeView";
import TeacherHomeView from "./teacher/TeacherHomeView";
import { useTeacherHome } from "./teacher/useTeacherHome";
import "./home.css";

/**
 * Classroom Home. Two different pages behind one route, chosen by the role the
 * permissions read resolved for THIS account (`user_roles` admin), never by a
 * name, an email, a URL or a display label.
 *
 * Until that read has succeeded for the current actor, neither Home mounts: the
 * student hooks would start reading assignments for a teacher, and the teacher
 * hooks would start admin reads for a student. A cold failure offers a retry.
 * Once resolved, a later background failure keeps the resolved Home mounted
 * (so scroll, a pending completion or a read retry are not thrown away) and
 * shows a quiet notice instead.
 */
export default function ClassroomHome() {
  const permissions = useUserPermissions();

  if (!permissions.resolved) {
    return permissions.isError ? (
      <HomeRoleError onRetry={permissions.retry} />
    ) : (
      <HomeRoleSkeleton />
    );
  }

  return (
    <>
      {permissions.isError ? <HomeRefreshNotice onRetry={permissions.retry} /> : null}
      {permissions.is_admin ? <TeacherHome key={`teacher:${permissions.resolvedFor}`} /> : <StudentHome key={`student:${permissions.resolvedFor}`} permissionsResolved={permissions.resolved} />}
    </>
  );
}

function StudentHome({permissionsResolved}: {permissionsResolved:boolean}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openSection } = useClassroomLayout();
  const { model, loading, markDone, clearMessage, completingKey, retryWork } = useClassroomHome();
  const { refresh, refreshing } = useHomeFreshness(user?.id);

  return (
    <ClassroomHomeView
      model={model}
      loading={loading}
      actorId={user?.id}
      permissionsResolved={permissionsResolved}
      onOpen={(route) => navigate(route)}
      onSeeAllWork={() => openSection("work")}
      onMarkDone={markDone}
      onClearMessage={async (conversationId) => {
        try {
          await clearMessage(conversationId);
        } catch {
          toast.error("Could not clear that message. Try again.");
        }
      }}
      completingKey={completingKey}
      onRetryWork={retryWork}
      onRefresh={() => void refresh()}
      refreshing={refreshing}
    />
  );
}

function TeacherHome() {
  const navigate = useNavigate();
  const { model, retryInbox, retryRoster, retrySessions } = useTeacherHome();
  return (
    <TeacherHomeView
      model={model}
      onOpen={(route) => navigate(route)}
      onRetryInbox={retryInbox}
      onRetryRoster={retryRoster}
      onRetrySessions={retrySessions}
    />
  );
}

/** Reserved geometry while the role is unknown. Says nothing about either role. */
export function HomeRoleSkeleton() {
  return (
    <div className="classroom-home classroom-home-pending" data-motion-skip aria-busy="true" aria-label="Loading Home">
      <div className="classroom-home-top">
        <div className="classroom-home-masthead">
          <span className="classroom-home-skeleton-line classroom-home-skeleton-line-short" />
          <span className="classroom-home-skeleton-line classroom-home-skeleton-line-title" />
          <span className="classroom-home-skeleton-line" />
        </div>
      </div>
      <div className="classroom-home-grid">
        <div className="classroom-home-panel classroom-home-panel-main">
          <span className="classroom-home-skeleton-feature" />
        </div>
        <div className="classroom-home-rail">
          <div className="classroom-home-panel">
            <span className="classroom-home-skeleton-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeRoleError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="classroom-home classroom-home-pending" data-motion-skip>
      <section className="classroom-home-panel classroom-home-role-error" role="alert">
        <h1>Home did not load</h1>
        <p>Your account details did not come through, so this page cannot tell which Home to show yet.</p>
        {onRetry ? (
          <button type="button" className="classroom-home-cta classroom-home-cta-plain" onClick={onRetry}>
            <ReloadIcon aria-hidden="true" />
            Try again
          </button>
        ) : null}
      </section>
    </div>
  );
}

export function HomeRefreshNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="classroom-home-notice" role="status">
      <span>Your account details did not refresh. Home is showing what loaded last.</span>
      {onRetry ? (
        <button type="button" className="classroom-home-quiet-button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
