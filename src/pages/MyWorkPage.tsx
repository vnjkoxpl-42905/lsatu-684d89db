import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from 'lucide-react';
import { routeWithReturnTo, useAssignedTodoFeed } from "@/hooks/useAssignedTodoFeed";
import PrescribedWeek from "@/components/classroom/PrescribedWeek";
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';
import { groupAssignedWork, workKindLabel, workDateLabel } from '@/components/my-work/assignedWorkOrganization';
import { WorkFilterSelect } from '@/components/my-work/WorkFilterSelect';
import './myWorkNotesRefinement.css';
import './myWorkOrganization.css';

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
  const { pathname, search: locationSearch } = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const requestedSubject = params.get('subject') ?? '';
  const requestedKind = params.get('kind') ?? '';
  const { rows, loading, failed, retry, evidenceWarnings = [] } = useAssignedTodoFeed();
  const visible = rows.filter((row) => row.sourceTable === READING_CENTER_SOURCE
    ? readingCenterAllowed && row.refId === 'library'
    : generalAccess).filter((row) => (row.status === "completed") === completed);
  const subjectLabels: Record<string, string> = { lr: 'Logical Reasoning', rc: 'Reading Comprehension', mixed: 'LR and RC', unknown: 'Other work' };
  const subjects = Object.keys(subjectLabels).filter((subject) => visible.some((row) => (row.workSection ?? 'unknown') === subject));
  const subject = subjects.includes(requestedSubject) ? requestedSubject : '';
  const kinds = [...new Set(visible.map(workKindLabel))];
  const kind = kinds.includes(requestedKind) ? requestedKind : '';
  const matches = visible.filter((row) => (!subject || (row.workSection ?? 'unknown') === subject) && (!kind || workKindLabel(row) === kind) && `${row.title} ${row.subtitle ?? ''} ${workKindLabel(row)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const groups = groupAssignedWork(matches, completed);
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value.slice(0, 500)); else next.delete(key);
    setParams(next, { replace: key === 'q' });
  }

  if (loading) return <p data-motion-item data-motion-ready="false" className="student-destination-message" role="status">Loading your work…</p>;
  if (failed && rows.length === 0) return (
    <div className="student-destination-message" role="alert">
      <p>{evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. We could not confirm whether this list is complete.` : "We could not load your assignments."}</p>
      <button type="button" className="classroom-button" onClick={retry}>Try again</button>
    </div>
  );

  return (
    <section data-motion-item data-motion-ready={loading ? "false" : "true"} className="student-work-list my-work-organized" aria-label={completed ? "Completed work" : "Work to do"}>
      {failed && (
        <div className="student-destination-message" role="alert">
          <p>{evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. Available saved work is still shown.` : "Some assignments could not refresh. Your saved work is still shown."}</p>
          <button type="button" className="classroom-button" onClick={retry}>Try again</button>
        </div>
      )}
      <div className="my-work-list-heading"><h2>{completed ? 'Completed work' : 'All assigned work'}</h2><span className="student-work-count" role="status">{matches.length}{search || subject || kind ? ` of ${visible.length}` : ''} {failed ? "shown (list may be incomplete)" : completed ? "completed" : "to do"}</span></div>
      {visible.length > 0 && <div className="my-work-list-controls"><label className="my-work-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search assigned work</span><input type="search" placeholder="Find an assignment…" value={search} onChange={(event) => updateFilter('q', event.target.value)} /></label>{subjects.length > 1 && <WorkFilterSelect label="Assignment subject" allLabel="All subjects" value={subject} options={subjects.map(value => ({ value, label: subjectLabels[value] }))} onChange={value => updateFilter('subject', value)} />}{kinds.length > 1 && <WorkFilterSelect label="Assignment type" allLabel="All work types" value={kind} options={kinds.map(value => ({ value, label: value }))} onChange={value => updateFilter('kind', value)} />}</div>}
      {visible.length === 0 ? (
        <p className="student-destination-message">
          {failed ? "We could not confirm whether this list is complete." : completed ? "Finished assignments will appear here after your work is saved." : "Nothing is assigned right now."}
        </p>
      ) : (
        <>{matches.length === 0 ? <div className="student-destination-message"><p>No assignments match these filters.</p><button className="classroom-button" type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('q'); next.delete('subject'); next.delete('kind'); setParams(next); }}>Clear filters</button></div> : groups.map((group) => <section className="my-work-status-group" key={group.label} aria-label={group.label}>
        {!completed && <h3>{group.label}<span>{group.rows.length}</span></h3>}
        <ul data-motion-list>
          {group.rows.map((row) => (
            <li key={row.key} data-motion-item data-motion-id={`assigned-work:${row.key}`}>
              <Link to={routeWithReturnTo(row.route, pathname + locationSearch)} className="student-work-row">
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.subtitle}</small>
                  <span className="my-work-row-meta">{row.title !== workKindLabel(row) && <span>{workKindLabel(row)}</span>}{workDateLabel(row.createdAt) && <span>Assigned <time dateTime={row.createdAt}>{workDateLabel(row.createdAt)}</time></span>}{row.dueAt && workDateLabel(row.dueAt) && <span className="my-work-due">Due <time dateTime={row.dueAt}>{workDateLabel(row.dueAt)}</time></span>}</span>
                </span>
                <span className="my-work-row-action"><span className="student-work-status">{row.progressUnverified ? "Progress unverified" : row.status === "in_progress" ? "In progress" : completed ? "Completed" : "Assigned"}</span><ArrowRight size={18} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul></section>)}</>
      )}
    </section>
  );
}
