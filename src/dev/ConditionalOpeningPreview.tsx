import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { OpeningCourseNavigation, OpeningCourseScreen, type OpeningCourseUrl } from '@/bootcamps/conditionals/components/OpeningCourse';
import { courseStepsForEdition, openingCourseStep } from '@/bootcamps/conditionals/openingCoursePath';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { ConditionalRequirementsSummary } from '@/components/teacher/ConditionalRequirementsSummary';
import { snapshotConditionalRequirements } from '@/bootcamps/conditionals/courseRequirements';
import { ConditionalActivityCentre } from '@/bootcamps/conditionals/components/ConditionalActivityCentre';
import { conditionalActivitySearch, parseConditionalActivitySearch, type ConditionalActivityConfig } from '@/bootcamps/conditionals/activityRegistry';
import { conditionalUnits } from '@/bootcamps/conditionals/content';
import { ConditionalAssignmentFields } from '@/components/teacher/ConditionalAssignmentFields';
import type { ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { ConditionalActivityIdentity } from '@/bootcamps/conditionals/activityIdentity';
import '@/bootcamps/main-conclusion/styles/scoped.css';

/** Isolated development harness: no assignment or account persistence is mounted. */
export default function ConditionalOpeningPreview() {
  const [params] = useSearchParams();
  const [activityTarget, setActivityTarget] = useState<ConditionalAssignmentTarget>({ scope: 'activity', activityId: 'rephrase', activitySettings: { groups: ['g3'], timing: 'untimed' }, mode: 'practice', difficulty: 'beginner', courseEdition: FULL_CONDITIONAL_EDITION, curriculumVersion: 3 });
  const teacherRequirements = params.get('teacher-requirements-preview') === '1';
  const requirementsTarget = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: FULL_CONDITIONAL_EDITION } as const;
  const requirementsState = params.get('requirements-state');
  const exampleSnapshots = requirementsState === 'empty' ? [] : requirementsState === 'invalid' ? [{ version: 999 }]
    : requirementsState === 'current' ? [snapshotConditionalRequirements(requirementsTarget)] : [undefined];
  const edition = params.get('edition') === FULL_CONDITIONAL_EDITION ? FULL_CONDITIONAL_EDITION : undefined;
  const landing = edition ? 'home' : 'lessons';
  const requestedView = params.get('page') ?? landing;
  const view = requestedView === 'overview' ? landing : requestedView;
  const editionSteps = courseStepsForEdition(edition);
  const requestedStep = openingCourseStep(view);
  const steps = !edition && requestedStep && !requestedStep.editions?.includes(FULL_CONDITIONAL_EDITION) && !editionSteps.some(step => step.id === requestedStep.id) ? [...editionSteps, requestedStep] : editionSteps;
  const url: OpeningCourseUrl = (destination, run = false) => `/dev/conditional-opening-preview?page=${encodeURIComponent(destination)}${edition ? `&edition=${edition}` : ''}${run ? '&run=1' : ''}`;
  const workspaceLinks = { overview: url('overview'), review: url('review'), journal: url('journal'), reference: url('reference') };
  const previewGrant = params.get('grant') === 'group-3'
    ? { target: { scope: 'skill', difficulty: 'beginner' }, unitIds: ['group-3'] }
    : { target: { scope: 'course' }, unitIds: conditionalUnits.map(unit => unit.id) };
  const centreHref = (config?: ConditionalActivityConfig) => `${url('centre')}${params.get('grant') ? `&grant=${encodeURIComponent(params.get('grant')!)}` : ''}${config ? `&${conditionalActivitySearch(config)}` : ''}`;
  const centre = view === 'assignment-activity' ? <section className="cc-centre" data-course-heading><h1>Assign one conditional activity</h1><p>Local form preview. This creates no assignments.</p><ConditionalAssignmentFields value={activityTarget} onChange={setActivityTarget}/><ConditionalRequirementsSummary target={activityTarget}/></section> : <ConditionalActivityCentre userId="preview" grant={previewGrant} config={params.has('activity') ? parseConditionalActivitySearch(params) : undefined} href={centreHref} courseHref={url('lessons')} localOnly/>;
  const fixtureTitle = { review: 'Review attempts', journal: 'Journal', reference: 'Quick reference' }[view];
  const teacherRequirementsContent = <section className="oc-course-screen" data-course-heading>
    <h1>Assignment requirements preview</h1>
    <p>Local authoring examples. This view uses the same required-step summary as the teacher assignment form. It has no account records and creates no assignments.</p>
    <div className="max-w-2xl rounded-md border border-border bg-background p-5 my-6">
      <h2 className="text-lg font-medium mb-3">Conditional Logic Bootcamp</h2>
      <ConditionalRequirementsSummary target={requirementsTarget} existingSnapshots={exampleSnapshots}/>
    </div>
    <nav aria-label="Requirements examples" className="flex flex-wrap gap-4">
      {['historical', 'current', 'empty', 'invalid'].map(state => <Link key={state} to={`/dev/conditional-opening-preview?edition=${FULL_CONDITIONAL_EDITION}&teacher-requirements-preview=1&requirements-state=${state}`}>{state === 'empty' ? 'No existing assignment' : `${state[0].toUpperCase()}${state.slice(1)} assignment`}</Link>)}
    </nav>
  </section>;
  return <ConditionalActivityIdentity.Provider value={{ userId: "preview", localOnly: true }}><div className="mc-bootcamp cb-shell oc-workspace"><OpeningCourseNavigation view={view} url={url} workspaceLinks={workspaceLinks} chapters={[...new Set(editionSteps.map(step => step.part ?? 1))]}/><main className="cb-main"><header className="cb-workspace-bar cb-workspace-status"><label>Preview edition <select aria-label="Preview edition" value={edition ?? 'legacy'} onChange={event => { window.location.href = `/dev/conditional-opening-preview?page=lessons${event.target.value === FULL_CONDITIONAL_EDITION ? `&edition=${FULL_CONDITIONAL_EDITION}` : ''}`; }}><option value="legacy">Existing course</option><option value={FULL_CONDITIONAL_EDITION}>Full course · Chapters 1–7</option></select></label><div className="cb-save" role="status">{teacherRequirements ? 'Local preview · no account writes' : 'Local preview · saves in this browser'}</div></header>{(view === 'centre' || view === 'assignment-activity') ? centre : teacherRequirements ? teacherRequirementsContent : fixtureTitle ? <section className="oc-course-screen" data-course-heading><h1>{fixtureTitle}</h1><p>This preview has no account records.</p><Link to={url('lessons')}>Open lessons</Link></section> : <OpeningCourseScreen key={edition ?? 'legacy'} storageScope={`preview:${edition ?? 'legacy'}`} view={view} run={params.get('run') === '1'} url={url} steps={steps}/>}</main></div></ConditionalActivityIdentity.Provider>;
}
