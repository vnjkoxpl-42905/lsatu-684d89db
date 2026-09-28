import { Link, useLocation } from "react-router-dom";
import { routeWithReturnTo, useAssignedTodoFeed } from "@/hooks/useAssignedTodoFeed";

export default function MyWorkPage({ completed }: { completed: boolean }) {
  const { pathname } = useLocation();
  const { rows, loading, failed, retry } = useAssignedTodoFeed();
  const visible = rows.filter((row) => (row.status === "completed") === completed);

  if (loading) return <p className="student-destination-message" role="status">Loading your work…</p>;
  if (failed) return (
    <div className="student-destination-message" role="alert">
      <p>We could not load your assignments.</p>
      <button type="button" className="classroom-button" onClick={retry}>Try again</button>
    </div>
  );

  return (
    <section className="student-work-list" aria-label={completed ? "Completed work" : "Work to do"}>
      <div className="student-work-count">{visible.length} {completed ? "completed" : "to do"}</div>
      {visible.length === 0 ? (
        <p className="student-destination-message">
          {completed ? "Finished assignments will appear here after your work is saved." : "Nothing is assigned right now."}
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
                <span className="student-work-status">{row.status === "in_progress" ? "In progress" : completed ? "Completed" : "Assigned"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
