import { Link, useSearchParams } from 'react-router-dom';
import { OpeningCourseNavigation, OpeningCourseScreen, type OpeningCourseUrl } from '@/bootcamps/conditionals/components/OpeningCourse';
import { courseStepsForEdition, openingCourseStep } from '@/bootcamps/conditionals/openingCoursePath';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import '@/bootcamps/main-conclusion/styles/scoped.css';

/** Isolated development harness: no assignment or account persistence is mounted. */
export default function ConditionalOpeningPreview() {
  const [params] = useSearchParams();
  const requestedView = params.get('page') ?? 'lessons';
  const view = requestedView === 'overview' ? 'lessons' : requestedView;
  const edition = params.get('edition') === FULL_CONDITIONAL_EDITION ? FULL_CONDITIONAL_EDITION : undefined;
  const editionSteps = courseStepsForEdition(edition);
  const requestedStep = openingCourseStep(view);
  const steps = !edition && requestedStep && !requestedStep.editions?.includes(FULL_CONDITIONAL_EDITION) && !editionSteps.some(step => step.id === requestedStep.id) ? [...editionSteps, requestedStep] : editionSteps;
  const url: OpeningCourseUrl = (destination, run = false) => `/dev/conditional-opening-preview?page=${encodeURIComponent(destination)}${edition ? `&edition=${edition}` : ''}${run ? '&run=1' : ''}`;
  const workspaceLinks = { overview: url('overview'), review: url('review'), journal: url('journal'), reference: url('reference') };
  const fixtureTitle = { review: 'Review attempts', journal: 'Journal', reference: 'Quick reference' }[view];
  return <div className="mc-bootcamp cb-shell oc-workspace"><OpeningCourseNavigation view={view} url={url} workspaceLinks={workspaceLinks}/><main className="cb-main"><header className="cb-workspace-bar cb-workspace-status"><label>Preview edition <select aria-label="Preview edition" value={edition ?? 'legacy'} onChange={event => { window.location.href = `/dev/conditional-opening-preview?page=lessons${event.target.value === FULL_CONDITIONAL_EDITION ? `&edition=${FULL_CONDITIONAL_EDITION}` : ''}`; }}><option value="legacy">Existing course</option><option value={FULL_CONDITIONAL_EDITION}>Full course · Chapters 1–7</option></select></label><div className="cb-save" role="status">Local preview · saves in this browser</div></header>{fixtureTitle ? <section className="oc-course-screen" data-course-heading><h1>{fixtureTitle}</h1><p>This preview has no account records.</p><Link to={url('lessons')}>Open lessons</Link></section> : <OpeningCourseScreen key={edition ?? 'legacy'} storageScope={`preview:${edition ?? 'legacy'}`} view={view} run={params.get('run') === '1'} url={url} steps={steps}/>}</main></div>;
}
