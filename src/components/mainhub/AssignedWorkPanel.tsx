import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOptionalClassroomLayout } from "@/components/classroom/shell/classroomLayoutContext";
import {
  routeWithReturnTo,
  useAssignedTodoFeed,
} from "@/hooks/useAssignedTodoFeed";

const STATUS_LABEL = {
  assigned: "Ready",
  in_progress: "In progress",
} as const;

export default function AssignedWorkPanel({
  drillReturnTo = "/classroom",
  scope,
}: {
  drillReturnTo?: string;
  scope?: 'rc';
}) {
  const navigate = useNavigate();
  const classroom = useOptionalClassroomLayout();
  const { rows, loading, failed, retry, evidenceWarnings = [] } = useAssignedTodoFeed();
  const openRows = rows.filter((row) => row.status !== "completed" && (scope !== 'rc' || row.workSection === 'rc'));
  const shownRows = openRows.slice(0, 3);

  return (
    <section aria-label={scope === 'rc' ? 'Assigned RC work' : 'Assigned work'} className="drill-observatory-today">
      <div className="drill-observatory-today-inner flex flex-col">
        <div className="flex items-center justify-between gap-4 px-0.5">
          <h2 className="drill-observatory-label drill-observatory-ink-60">
            {scope === 'rc' ? 'Assigned RC work' : 'Assigned work'}
          </h2>
          {(scope === 'rc' || openRows.length > 3) && (
            <button
              type="button"
              className="drill-observatory-insight-link"
              onClick={() => {
                if (classroom) classroom.openSection("work");
                else navigate("/classroom");
              }}
            >
              View all assigned work
            </button>
          )}
        </div>

        {evidenceWarnings.length > 0 && (
          <div className="drill-observatory-today-quiet mt-3" role="alert">
            Could not confirm {evidenceWarnings.join(", ")}. Available saved work is still shown.{" "}
            <button type="button" className="drill-observatory-insight-link" onClick={retry}>Try again</button>
          </div>
        )}
        {loading && shownRows.length === 0 ? (
          <div aria-label="Loading assigned work" className="mt-3 grid animate-pulse gap-3">
            <div className="drill-observatory-today-rail h-[62px]" />
            <div className="drill-observatory-today-rail h-[62px]" />
            <div className="drill-observatory-today-rail h-[62px]" />
          </div>
        ) : shownRows.length > 0 ? (
          <ol className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
            {shownRows.map((row, index) => (
              <li key={row.key}>
                <button
                  type="button"
                  className="drill-observatory-today-rail drill-observatory-focus-inset flex w-full min-w-0 items-center gap-3 text-left"
                  onClick={() => navigate(routeWithReturnTo(row.route, drillReturnTo))}
                >
                  <ClipboardList
                    className="drill-observatory-ink-55 h-3.5 w-3.5 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="drill-observatory-ink-full block truncate text-[13px] font-medium">
                      {row.title}
                    </span>
                    <span className="drill-observatory-ink-55 mt-0.5 block truncate text-[11.5px]">
                      {row.subtitle || "Assigned by Joshua"}
                    </span>
                  </span>
                  <span className="drill-observatory-ink-55 shrink-0 text-[11.5px]">
                    {row.progressUnverified ? "Progress unverified" : scope !== 'rc' && index === 0 ? "Next" : STATUS_LABEL[row.status]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : evidenceWarnings.length > 0 ? null : failed ? (
          <div className="drill-observatory-today-quiet mt-3" role="alert">
            We could not confirm whether your assigned work list is complete.{" "}
            <button
              type="button"
              className="drill-observatory-insight-link"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="drill-observatory-today-quiet mt-3" aria-live="polite">
            {scope === 'rc' ? 'No RC work assigned right now. All your assigned work is available in My Work.' : 'Nothing assigned right now.'}
          </div>
        )}
      </div>
    </section>
  );
}
