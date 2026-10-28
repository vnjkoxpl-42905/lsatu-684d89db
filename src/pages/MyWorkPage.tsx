import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from 'lucide-react';
import { routeWithReturnTo, useAssignedTodoFeed } from "@/hooks/useAssignedTodoFeed";
import PrescribedWeek from "@/components/classroom/PrescribedWeek";
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';
import { groupAssignedWork, workKindLabel, workDateLabel, WORK_SUBJECT_LABELS, WORK_KINDS } from '@/components/my-work/assignedWorkOrganization';
import { WorkFilterSelect } from '@/components/my-work/WorkFilterSelect';
import { notifyClassroomListIntent } from '@/hooks/useClassroomMotion';
import AssignmentUpdate from '@/components/my-work/AssignmentUpdate';
import './myWorkNotesRefinement.css';
import './myWorkOrganization.css';

export default function MyWorkPage({ completed }: { completed: boolean }) {
  const [pageParams] = useSearchParams();
  const groupId = pageParams.get("workGroup");
  const permissions = useUserPermissions();
  const readingCenter = useReadingCenterAccess(!permissions.is_admin);
  const generalAccess = permissions.is_admin || permissions.has_classroom_access;
  if (permissions.loading) return <p role="status" className="student-destination-message">Loading your work…</p>;
  if (groupId && /^[0-9a-f-]{36}$/i.test(groupId)) return <AssignmentUpdate groupId={groupId} generalAccess={generalAccess} readingCenterAllowed={readingCenter.allowed && !permissions.is_admin} />;
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
  const sectionRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const recoverFilterKeyboard = useRef(false);
  const recoverFilterFocus = useRef<'subject' | 'kind' | 'clear' | null>(null);
  const { pathname, search: locationSearch } = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const requestedSubject = params.get('subject') ?? '';
  const requestedKind = params.get('kind') ?? '';
  const { rows, loading, failed, retry, evidenceWarnings = [] } = useAssignedTodoFeed();  const visible = rows.filter((row) => row.sourceTable === READING_CENTER_SOURCE
    ? readingCenterAllowed && row.refId === 'library'
    : generalAccess).filter((row) => (row.status === "completed") === completed);
  // A selected filter is intent, independent of partial feed contents and completion.
  const subject = Object.prototype.hasOwnProperty.call(WORK_SUBJECT_LABELS, requestedSubject) ? requestedSubject : '';
  const kind = WORK_KINDS.includes(requestedKind) ? requestedKind : '';
  const subjects = Object.keys(WORK_SUBJECT_LABELS).filter((value) => value === subject || visible.some((row) => (row.workSection ?? 'unknown') === value));
  const kinds = WORK_KINDS.filter((value) => value === kind || visible.some((row) => workKindLabel(row) === value));
  const showSubjects = subjects.length > 1 || Boolean(subject);
  const showKinds = kinds.length > 1 || Boolean(kind);
  useEffect(() => {
    const removed = recoverFilterFocus.current === 'clear' || (recoverFilterFocus.current === 'subject' ? !showSubjects : recoverFilterFocus.current === 'kind' && !showKinds);
    recoverFilterFocus.current = null;
    if (removed) (recoverFilterKeyboard.current ? searchRef.current ?? retryRef.current ?? sectionRef.current : sectionRef.current ?? errorRef.current)?.focus({ preventScroll: true });
    recoverFilterKeyboard.current = false;
  });
  const hasFilters = Boolean(search || subject || kind);
  const matches = visible.filter((row) => (!subject || (row.workSection ?? 'unknown') === subject) && (!kind || workKindLabel(row) === kind) && `${row.title} ${row.subtitle ?? ''} ${workKindLabel(row)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const groups = groupAssignedWork(matches, completed);
  function updateFilter(key: string, value: string, focusedWithin = false, modality: 'keyboard' | 'pointer' = 'pointer') {
    recoverFilterKeyboard.current = modality === 'keyboard';
    recoverFilterFocus.current = !value && focusedWithin && (key === 'subject' || key === 'kind') ? key : null;
    notifyClassroomListIntent(sectionRef.current, 'filter');
    const next = new URLSearchParams(params);
    if (value) next.set(key, value.slice(0, 500)); else next.delete(key);
    setParams(next, { replace: key === 'q' });
  }

  if (loading) return <p className="student-destination-message" role="status">Loading your work…</p>;
  if (failed && rows.length === 0 && !hasFilters) return (
    <div ref={errorRef} tabIndex={-1} className="student-destination-message" role="alert">
      <p>{evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. We could not confirm whether this list is complete.` : "We could not load your assignments."}</p>
      <button ref={retryRef} type="button" className="classroom-button" onClick={retry}>Try again</button>
    </div>
  );

  return (
    <section ref={sectionRef} data-work-sync="issuance-read-20261028" tabIndex={-1} className="student-work-list my-work-organized" aria-label={completed ? "Completed work" : "Work to do"}>
      {failed && (
        <div className="student-destination-message" role="alert">
          <p>{rows.length === 0 ? "We could not load your assignments or confirm whether any match these filters." : evidenceWarnings.length > 0 ? `Could not confirm ${evidenceWarnings.join(", ")}. Available saved work is still shown.` : "Some assignments could not refresh. Your saved work is still shown."}</p>
          <button type="button" className="classroom-button" onClick={retry}>Try again</button>
        </div>
      )}
      <div className="my-work-list-heading"><h2>{completed ? 'Completed work' : 'All assigned work'}</h2><span className="student-work-count" role="status">{matches.length}{search || subject || kind ? ` of ${visible.length}` : ''} {failed ? "shown (list may be incomplete)" : completed ? "completed" : "to do"}</span></div>
      {(visible.length > 0 || hasFilters) && <div className="my-work-list-controls"><label className="my-work-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search assigned work</span><input ref={searchRef} type="search" placeholder="Find an assignment…" value={search} onChange={(event) => updateFilter('q', event.target.value)} /></label>{showSubjects && <WorkFilterSelect label="Assignment subject" allLabel="All subjects" value={subject} options={subjects.map(value => ({ value, label: WORK_SUBJECT_LABELS[value] }))} onChange={(value, focusedWithin, modality) => updateFilter('subject', value, focusedWithin, modality)} />}{showKinds && <WorkFilterSelect label="Assignment type" allLabel="All work types" value={kind} options={kinds.map(value => ({ value, label: value }))} onChange={(value, focusedWithin, modality) => updateFilter('kind', value, focusedWithin, modality)} />}</div>}
      {visible.length === 0 && !hasFilters ? (
        <p className="student-destination-message">
          {failed ? "We could not confirm whether this list is complete." : completed ? "Finished assignments will appear here after your work is saved." : "Nothing is assigned right now."}
        </p>
      ) : (
        <>{matches.length === 0 ? <div className="student-destination-message"><p>{failed && rows.length === 0 ? "Try again to check for matching assignments, or clear your filters." : "No assignments match these filters."}</p><button className="classroom-button" type="button" onClick={(event) => { recoverFilterKeyboard.current = event.detail === 0; recoverFilterFocus.current = event.currentTarget === document.activeElement ? 'clear' : null; notifyClassroomListIntent(sectionRef.current, 'filter'); const next = new URLSearchParams(params); next.delete('q'); next.delete('subject'); next.delete('kind'); setParams(next); }}>Clear filters</button></div> : groups.map((group) => <section className="my-work-status-group" key={group.label} aria-label={group.label}>
        {!completed && <h3>{group.label}<span>{group.rows.length}</span></h3>}
        <ul data-motion-list>
          {group.rows.map((row) => (
            <li key={row.key} data-motion-item data-motion-id={`assigned-work:${row.key}`}>
              <Link to={routeWithReturnTo(row.route, pathname + locationSearch)} className="student-work-row">
                <span>
                  <strong>{row.title}{!completed && row.isUnread ? <span className="my-work-unread-label">Unread</span> : null}</strong>
                  <small>{row.subtitle}</small>
                  <span className="my-work-row-meta">{!completed && row.openedAt && !row.isUnread ? <span>Read</span> : null}{row.title !== workKindLabel(row) && <span>{workKindLabel(row)}</span>}{workDateLabel(row.createdAt) && <span>Assigned <time dateTime={row.createdAt}>{workDateLabel(row.createdAt)}</time></span>}{row.dueAt && workDateLabel(row.dueAt) && <span className="my-work-due">Due <time dateTime={row.dueAt}>{workDateLabel(row.dueAt)}</time></span>}</span>
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
