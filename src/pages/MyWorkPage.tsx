import { Link, useLocation } from "react-router-dom";
import { routeWithReturnTo, useAssignedTodoFeed } from "@/hooks/useAssignedTodoFeed";
import PrescribedWeek from "@/components/classroom/PrescribedWeek";
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';

export default function MyWorkPage({ completed }: { completed: boolean }) {
  const permissions = useUserPermissions();
  const readingCenter = useReadingCenterAccess(!permissions.is_admin);
  const generalAccess = permissions.is_admin || permissions.has_classroom_access;
  if (permissions.loading) return <p data-motion-item data-motion-ready="false" role="status" className="student-destination-message">Loading your work…</p>;
  // The prescribed week sits above the to-do list so a student can scan the
  // whole week Joshua set before working down the list. It reads its own
  // query, so a failed plan read never hides assignments and vice versa.
  return (
    <>
      {completed || !generalAccess ? null : <PrescribedWeek />}
      <MyWorkList completed={completed} generalAccess={generalAccess} readingCenterAllowed={readingCenter.allowed && !permissions.is_admin} />
    </>
  );
}

function MyWorkList({ completed, generalAccess, readingCenterAllowed }: { completed: boolean; generalAccess: boolean; readingCenterAllowed: boolean }) {
  const { pathname } = useLocation();
  const { rows, loading, failed, retry, evidenceWarnings = [] } = useAssignedTodoFeed();
  const visible = rows.filter((row) => row.sourceTable === READING_CENTER_SOURCE
    ? readingCenterAllowed && row.refId === 'library'
    : generalAccess).filter((row) => (row.status === "completed") === completed);

  if (loading) return <p data-motion-item data-motion-ready="false" className="student-destination-message" role="status">Loading your work…</p>;
  if (failed && rows.length === 0) return (
    <div className="student-destination-message" role="alert">
      <p>{evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. We could not confirm whether this list is complete.` : "We could not load your assignments."}</p>
      <button type="button" className="classroom-button" onClick={retry}>Try again</button>
    </div>
  );

  return (
    <section data-motion-item data-motion-ready={loading ? "false" : "true"} className="student-work-list" aria-label={completed ? "Completed work" : "Work to do"}>
      {failed && (
        <div className="student-destination-message" role="alert">
          <p>{evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. Available saved work is still shown.` : "Some assignments could not refresh. Your saved work is still shown."}</p>
          <button type="button" className="classroom-button" onClick={retry}>Try again</button>
        </div>
      )}
      <div className="student-work-count">{visible.length} {failed ? "shown (list may be incomplete)" : completed ? "completed" : "to do"}</div>
      {visible.length === 0 ? (
        <p className="student-destination-message">
          {failed ? "We could not confirm whether this list is complete." : completed ? "Finished assignments will appear here after your work is saved." : "Nothing is assigned right now."}
        </p>
      ) : (
        <ul>
          {visible.map((row) => (
            <li key={row.key}>
              <Link to={routeWithReturnTo(row.route, pathname)} className="student-work-row">
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.subtitle}</small>
                </span>
                <span className="student-work-status">{row.progressUnverified ? "Progress unverified" : row.status === "in_progress" ? "In progress" : completed ? "Completed" : "Assigned"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
