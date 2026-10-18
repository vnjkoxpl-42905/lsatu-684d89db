import { Link, useSearchParams } from 'react-router-dom';
import { OpeningCourseNavigation, OpeningCourseScreen, type OpeningCourseUrl } from '@/bootcamps/conditionals/components/OpeningCourse';
import { OPENING_COURSE_PATH, openingCourseStep } from '@/bootcamps/conditionals/openingCoursePath';
import '@/bootcamps/main-conclusion/styles/scoped.css';

/** Isolated development harness: no assignment or account persistence is mounted. */
export default function ConditionalOpeningPreview() {
  const [params] = useSearchParams();
  const requestedView = params.get('page') ?? 'lessons';
  const view = requestedView === 'overview' ? 'lessons' : requestedView;
  const requestedStep = openingCourseStep(view);
  const steps = requestedStep && !OPENING_COURSE_PATH.some(step => step.id === requestedStep.id) ? [...OPENING_COURSE_PATH, requestedStep] : OPENING_COURSE_PATH;
  const url: OpeningCourseUrl = (destination, run = false) => `/dev/conditional-opening-preview?page=${encodeURIComponent(destination)}${run ? '&run=1' : ''}`;
  const workspaceLinks = { overview: url('overview'), review: url('review'), journal: url('journal'), reference: url('reference') };
  const fixtureTitle = { review: 'Review attempts', journal: 'Journal', reference: 'Reference' }[view];
  return <div className="mc-bootcamp cb-shell oc-workspace"><OpeningCourseNavigation view={view} url={url} workspaceLinks={workspaceLinks}/><main className="cb-main"><header className="cb-workspace-bar cb-workspace-status"><div className="cb-save" role="status">Local preview · saves in this browser</div></header>{fixtureTitle ? <section className="oc-course-screen" data-course-heading><h1>{fixtureTitle}</h1><p>This development navigation fixture has no account records. These pages use your saved work in the signed-in course.</p><Link to={url('lessons')}>Open lessons</Link></section> : <OpeningCourseScreen view={view} run={params.get('run') === '1'} url={url} steps={steps}/>}</main></div>;
}
