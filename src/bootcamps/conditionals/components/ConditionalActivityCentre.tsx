import { lazy, Suspense, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CONDITIONAL_ACTIVITIES, conditionalActivityAllowed, conditionalActivitySelection, normalizeConditionalActivityConfig, type ConditionalActivityConfig, type ConditionalActivityId } from '../activityRegistry';
import { GROUP_LABEL } from '@/features/conditional-refresher/content';
import { conditionalUnits } from '../content';
import './activity-centre.css';
import { useConditionalFeedbackMotion } from './useConditionalFeedbackMotion';
import { ConditionalFilters, activityFiltersDefaultOpen } from './ConditionalFilters';
import { ConditionalPracticeWorkbench } from './ConditionalPracticeWorkbench';
import { conditionalPracticeSetupKey } from './practiceSetupState';

const EmbeddedActivity = lazy(() => import('./EmbeddedConditionalActivity').then(module => ({ default: module.EmbeddedConditionalActivity })));
const SkillActivity = lazy(() => import('@/features/conditional-refresher/ConditionalSkillActivity').then(module => ({ default: module.ConditionalSkillActivity })));
const UnlessDrill = lazy(() => import('@/features/quick-drills/unless-drill/UnlessDrill'));
type Grant = Parameters<typeof conditionalActivityAllowed>[0];
export interface ConditionalActivityCentreProps {
  userId: string; setupScope?: string; grant?: Grant; isAdmin?: boolean; localOnly?: boolean;
  config?: ConditionalActivityConfig | null;
  href: (config?: ConditionalActivityConfig) => string;
  courseHref: string; renderLegacy?: (config: ConditionalActivityConfig) => ReactNode;
}
export function ConditionalActivityCentre({ userId, setupScope, grant, isAdmin, localOnly, config, href, courseHref, renderLegacy }: ConditionalActivityCentreProps) {
  const surface = useRef<HTMLElement>(null);
  useConditionalFeedbackMotion(surface);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const permits = (candidate: ConditionalActivityConfig) => !!isAdmin || !!grant && conditionalActivityAllowed(grant, candidate);
  const defaultFor = (activity: ConditionalActivityId) => {
    if (grant?.target.scope === 'activity' && grant.target.activityId === activity) return normalizeConditionalActivityConfig({ activity, ...(grant.target.activitySettings as object ?? {}) });
    const options: unknown[] = [{ activity }, ...(['g1', 'g2', 'g3', 'g4'] as const).map(group => ({ activity, groups: [group], ...(activity === 'rephrase' ? { timing: 'untimed' } : {}) })), { activity, groups: ['g1', 'g2'] }, ...(activity === 'legacy-practice' ? conditionalUnits.filter(unit => unit.phase === 'conditional').map(unit => ({ activity, unit: unit.id, difficulty: grant?.target.difficulty ?? 'beginner' })) : [])];
    return options.map(normalizeConditionalActivityConfig).find(candidate => candidate && permits(candidate)) ?? null;
  };
  const availableDefaults = CONDITIONAL_ACTIVITIES.map(entry => defaultFor(entry.id)).filter((candidate): candidate is ConditionalActivityConfig => candidate !== null);
  const setupKey = setupScope ?? conditionalPracticeSetupKey(userId, params.get('assignment') ?? (isAdmin ? 'admin' : 'preview'), params.get('edition') ?? 'conditionals-v1');
  if (config === null || config && !permits(config)) return <section className="cc-centre" data-course-heading><h1>This activity is not available in this work.</h1><p>Return to the centre to choose from your assigned activities.</p><Link className="oc-action" to={href()}>Practice centre</Link></section>;
  const item = config && CONDITIONAL_ACTIVITIES.find(entry => entry.id === config.activity);
  const constrained = grant && grant.target.scope !== 'course' && !isAdmin && config ? conditionalActivitySelection(config) : undefined;
  const allowCompound = !!isAdmin || grant?.target.scope === 'course' || !!grant?.unitIds.includes('and-or') && (config?.stage !== 'contrapositive' || grant.unitIds.includes('de-morgan'));
  const update = (patch: Partial<ConditionalActivityConfig>) => normalizeConditionalActivityConfig({ ...config, ...patch });
  const optionLink = (label: string, patch: Partial<ConditionalActivityConfig>, selected: boolean) => {
    const candidate = update(patch);
    return candidate && permits(candidate) ? <Link key={label} aria-current={selected ? 'true' : undefined} to={href(candidate)}>{label}</Link> : null;
  };
  return <section ref={surface} className={`cc-centre ${config ? 'cc-centre--activity' : 'cc-centre--home'}`} aria-label="Conditional practice centre">
    <nav className="cc-breadcrumb"><Link to={config ? href() : courseHref}><ArrowLeft size={15}/>{config ? 'Practice centre' : 'Back to the course'}</Link></nav>
    <header className="cc-heading" data-course-heading><p className="cc-course-name">Conditional Logic Bootcamp</p><h1>{item?.title ?? 'Practice centre'}</h1><p className="cc-intro">{item?.purpose ?? 'Choose the conditional skill you want to practise.'}</p></header>
    {!config ? <>
      <ConditionalPracticeWorkbench key={setupKey} defaults={availableDefaults} permits={permits} href={href} storageKey={setupKey}/>
    </> : <>
      {config.activity !== 'unless' && config.activity !== 'guided' && <ConditionalFilters defaultOpen={activityFiltersDefaultOpen()} summary={config.groups ? config.groups.length === 4 ? 'All groups' : config.groups.map(group => `Group ${group.slice(1)}`).join(', ') : config.level === 'words' ? 'Words' : config.level === 'variables' ? 'Symbols' : 'Current selection'}><div className="cc-settings" aria-label="Activity settings">
        {config.groups && <fieldset><legend>Topic</legend><div>{optionLink('All groups', { groups: ['g1', 'g2', 'g3', 'g4'] }, config.groups.length === 4)}{(['g1', 'g2', 'g3', 'g4'] as const).map(group => optionLink(GROUP_LABEL[group], { groups: [group], ...(config.activity === 'rephrase' && config.timing === 'progressive' ? { timing: 'untimed' } : {}) }, config.groups?.length === 1 && config.groups[0] === group))}{config.activity === 'sort' && optionLink('Groups 1 and 2', { groups: ['g1', 'g2'] }, config.groups.join(',') === 'g1,g2')}</div></fieldset>}
        {config.stage && <fieldset><legend>Task</legend><div>{optionLink('Translate', { stage: 'translate' }, config.stage === 'translate')}{optionLink('Add the contrapositive', { stage: 'contrapositive' }, config.stage === 'contrapositive')}</div></fieldset>}
        {config.review && <fieldset><legend>Cards</legend><div>{optionLink('All cards', { review: 'all' }, config.review === 'all')}{optionLink('Needs practice', { review: 'needs' }, config.review === 'needs')}</div></fieldset>}
        {config.level && <fieldset><legend>Question format</legend><div>{(['all', 'variables', 'words'] as const).map(level => optionLink(level === 'all' ? 'All questions' : level === 'variables' ? 'Symbols' : 'Words', { level }, config.level === level))}</div></fieldset>}
        {config.timing && <fieldset><legend>Timing</legend><div>{optionLink('Original progression', { timing: 'progressive' }, config.timing === 'progressive')}{optionLink('Untimed', { timing: 'untimed' }, config.timing === 'untimed')}{optionLink('Timed practice', { timing: 'timed' }, config.timing === 'timed')}</div></fieldset>}
        {config.activity === 'legacy-practice' && <>
          <label>Skill<select value={config.unit ?? ''} onChange={event => { const next = update({ unit: event.target.value || undefined }); if (next && permits(next)) navigate(href(next)); }}>{permits({ ...config, unit: undefined }) && <option value="">All available conditional skills</option>}{conditionalUnits.filter(unit => unit.phase === 'conditional' && permits({ ...config, unit: unit.id })).map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label>
          <fieldset><legend>Level</legend><div>{(['beginner', 'medium', 'advanced'] as const).map(difficulty => optionLink(difficulty[0].toUpperCase() + difficulty.slice(1), { difficulty }, config.difficulty === difficulty))}</div></fieldset>
          <fieldset><legend>Mode</legend><div>{(['practice', 'simulator', 'hard-sentences'] as const).map(mode => optionLink(mode === 'practice' ? 'Skill practice' : mode === 'simulator' ? 'Mixed application' : 'Hard sentences', { mode }, config.mode === mode))}</div></fieldset>
        </>}
      </div></ConditionalFilters>}
      {config.activity === 'rephrase' && <p className="cc-selection-note">{conditionalActivitySelection(config).selectionLabel}</p>}
      <Suspense fallback={<p role="status">Loading your activity…</p>}>
        {['rephrase', 'linking', 'missing-links', 'must-be-true'].includes(config.activity) && <EmbeddedActivity key={`${userId}:${config.activity}:${JSON.stringify(config)}`} activity={config.activity as 'rephrase'|'linking'|'missing-links'|'must-be-true'} userId={userId} backUrl={href()} localOnly={localOnly} {...conditionalActivitySelection(config)} allowedItemOrders={constrained?.selectedItemOrders} allowedQuestionIds={constrained?.selectedQuestionIds}/>}
        {['sort', 'diagram', 'translate-cards'].includes(config.activity) && <SkillActivity kind={config.activity as 'sort'|'diagram'|'translate-cards'} groups={config.groups!} stage={config.stage ?? 'translate'} review={config.review ?? 'all'} storageScope={userId} itemId={params.get('item') ?? undefined} allowCompound={allowCompound} embedded/>}
        {config.activity === 'unless' && (localOnly ? <p>The Unless Drill uses account milestones. Open it from your signed-in bootcamp to practise the four forms.</p> : <div className="cir-root"><UnlessDrill edition="full-conditionals-v3"/></div>)}
        {config.activity === 'legacy-practice' && (renderLegacy?.(config) ?? <p>Conditional bank practice is available in the signed-in bootcamp. This local preview does not write account progress.</p>)}
        {config.activity === 'guided' && <GuidedLibrary config={config} href={href} permits={permits} localOnly={localOnly} view={params.get('view') === 'run' ? 'run' : 'launch'}/>}
      </Suspense>
    </>}
  </section>;
}

const GuidedSets = lazy(() => import('./ConditionalGuidedLibrary'));
function GuidedLibrary(props: { config: ConditionalActivityConfig; href: ConditionalActivityCentreProps['href']; permits: (config: ConditionalActivityConfig) => boolean; localOnly?: boolean; view: 'launch'|'run' }) { return <GuidedSets {...props}/>; }
