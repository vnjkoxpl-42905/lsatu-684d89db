import { lazy, Suspense, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { OpeningCourseStep } from '../openingCoursePath';
import type { OpeningCourseUrl } from './OpeningCourse';
import { allowedSkillGroups, lessonSkillGroup, parseSkillConfig, skillKindAllowed, skillPracticeUrl, type SkillConfig, type SkillKind } from '../skillPractice';
import { GROUP_LABEL } from '@/features/conditional-refresher/content';
import type { GroupId } from '@/features/conditional-refresher/content';
import './skill-practice.css';
import { ConditionalActivityIdentity } from '../activityIdentity';
import { ConditionalFilters, activityFiltersDefaultOpen } from './ConditionalFilters';
import { courseBrowseUrl, readCourseBrowseContext, withCourseBrowseContext } from '../courseBrowse';
import { CourseBrowseHeader } from './CourseBrowseNavigation';
import './flashcard-library.css';

const ConditionalSkillActivity = lazy(() => import('@/features/conditional-refresher/ConditionalSkillActivity').then(module => ({ default: module.ConditionalSkillActivity })));
const EmbeddedConditionalActivity = lazy(() => import('./EmbeddedConditionalActivity').then(module => ({ default: module.EmbeddedConditionalActivity })));
const UnlessDrill = lazy(() => import('@/features/quick-drills/unless-drill/UnlessDrill'));
const labels: Record<SkillKind, string> = { sort: 'Sort the indicators', 'translate-cards': 'Translate and recall', diagram: 'Build the diagram', unless: 'Unless speed drill', 'missing-links': 'Missing Links' };
const descriptions: Record<SkillKind, string> = {
  sort: 'Choose the group, then explain where its condition goes.', 'translate-cards': 'Recall a translation, compare the answer, and keep track of what needs another look.',
  diagram: 'Place the conditions, keep every negative, and check the rule.', unless: 'Practise the four unless forms after the untimed lesson checks.', 'missing-links': 'Supply the rule that connects the given rules to the conclusion.',
};
export function SkillPracticeLinks({ steps, url, cardsOnly = false }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; cardsOnly?: boolean }) {
  const kinds: SkillKind[] = cardsOnly ? ['translate-cards'] : ['sort', 'translate-cards', 'diagram', 'unless', 'missing-links'];
  const groups = allowedSkillGroups(steps);
  return <section className="skill-practice-list" aria-label="More skill practice"><h2>{cardsOnly ? 'Sentence flashcards' : 'Practise a specific skill'}</h2><p>Choose the task you need. This extra practice keeps its own place and does not change course completion.</p>
    <div className="skill-practice-choices">{kinds.filter(kind => skillKindAllowed(kind, steps)).map(kind => <div key={kind}><h3>{labels[kind]}</h3><p>{descriptions[kind]}</p><Link className="oc-action" to={skillPracticeUrl(url, { kind, groups: kind === 'unless' ? ['g3'] : groups })}>Open {labels[kind]}</Link></div>)}</div>
    {!kinds.some(kind => skillKindAllowed(kind, steps)) && <p>No additional activities are available in this work.</p>}
  </section>;
}
export function LessonSkillLinks({ lessonId, steps, url }: { lessonId: string; steps: OpeningCourseStep[]; url: OpeningCourseUrl }) {
  const group = lessonSkillGroup(lessonId);
  const groups = allowedSkillGroups(steps);
  const relevant = group && groups.includes(group) ? [group] : lessonId === 'negative-translation' ? groups : undefined;
  const missing = lessonId === 'missing-bridges' && skillKindAllowed('missing-links', steps);
  const compound = lessonId === 'and-or-negate-group' && skillKindAllowed('diagram', steps);
  if (!relevant?.length && !missing && !compound) return null;
  return <aside className="skill-lesson-links"><h2>Keep practising this skill</h2><p>Open a focused activity, then return to this lesson.</p><div className="fc-actions">
    {relevant?.length && <><Link className="oc-action" to={skillPracticeUrl(url, { kind: 'translate-cards', groups: relevant, from: lessonId })}>Sentence flashcards</Link><Link className="oc-action" to={skillPracticeUrl(url, { kind: 'diagram', groups: relevant, from: lessonId })}>Build a diagram</Link></>}
    {lessonId === 'negative-translation' && groups.length > 1 && <Link className="oc-action" to={skillPracticeUrl(url, { kind: 'sort', groups, from: lessonId })}>Sort the indicators</Link>}
    {group === 'g3' && <Link className="oc-action" to={skillPracticeUrl(url, { kind: 'unless', groups: ['g3'], from: lessonId })}>Unless speed drill</Link>}
    {missing && <Link className="oc-action" to={skillPracticeUrl(url, { kind: 'missing-links', from: lessonId })}>Practise Missing Links</Link>}
    {compound && <Link className="oc-action" to={skillPracticeUrl(url, { kind: 'diagram', groups, stage: 'contrapositive', from: lessonId })}>Build both diagrams</Link>}
  </div></aside>;
}
export function SkillPracticeHub({ steps, url, storageScope }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; storageScope?: string }) {
  const [params] = useSearchParams();
  const identity = useContext(ConditionalActivityIdentity);
  const browseContext = readCourseBrowseContext(params, steps);
  const config = parseSkillConfig(params, steps);
  if (!config) return <section className="skill-practice-hub" data-course-heading><h1>This activity is not available here.</h1><p>Choose an activity from the lessons available in this work.</p><Link className="oc-action" to={url('practice')}>Choose practice</Link></section>;
  const allowed = allowedSkillGroups(steps);
  const update = (patch: Partial<SkillConfig>) => {
    const href = skillPracticeUrl(url, { ...config, itemId: undefined, round: undefined, ...patch });
    return config.kind === 'translate-cards' ? withCourseBrowseContext(href, browseContext) : href;
  };
  const topicOptions: Array<{ label: string; groups: GroupId[] }> = [
    ...(allowed.length > 1 ? [{ label: 'All available groups', groups: allowed }] : []),
    ...allowed.map(group => ({ label: GROUP_LABEL[group], groups: [group] })),
    ...(allowed.includes('g1') && allowed.includes('g2') && allowed.length > 2 ? [{ label: 'Groups 1 and 2', groups: ['g1', 'g2'] as GroupId[] }] : []),
  ].filter(option => config.kind !== 'sort' || option.groups.length > 1);
  const actor = identity.userId ?? 'anonymous';
  const localOnly = identity.localOnly || !identity.userId;
  const configKey = `${actor}:${config.kind}:${config.groups.join(',')}:${config.stage}:${config.review}`;
  return <section className={`skill-practice-hub${config.kind === 'translate-cards' ? ' co-card-player' : ''}`}>
    <nav className="skill-return"><Link to={config.kind === 'translate-cards' ? courseBrowseUrl(url, 'flashcards', browseContext.chapter, browseContext.from) : url('practice')}>All {config.kind === 'translate-cards' ? 'flashcards' : 'practice'}</Link>{config.from && <Link to={url(config.from)}>Back to {steps.find(step => step.id === config.from)?.title}</Link>}</nav>
    {config.kind === 'translate-cards' ? <CourseBrowseHeader title={labels[config.kind]} description={descriptions[config.kind]} eyebrow={browseContext.chapter ? `Chapter ${browseContext.chapter} flashcards` : 'Flashcards'}/> : <header data-course-heading><p className="oc-label">Optional practice</p><h1>{labels[config.kind]}</h1><p>{descriptions[config.kind]}</p></header>}
    {!['unless', 'missing-links'].includes(config.kind) && <ConditionalFilters defaultOpen={activityFiltersDefaultOpen()} summary={`${config.groups.map(group => `Group ${group.slice(1)}`).join(', ')} · ${config.stage === 'translate' ? 'Translation' : 'Translation and contrapositive'}${config.kind === 'translate-cards' ? config.review === 'needs' ? ' · Needs practice' : ' · All cards' : ''}`}><div className="skill-settings" aria-label="Practice settings">
      <fieldset><legend>Topic</legend><div>{topicOptions.map(option => <Link key={option.groups.join(',')} aria-current={option.groups.join(',') === config.groups.join(',') ? 'true' : undefined} to={update({ groups: option.groups })}>{option.label}</Link>)}</div></fieldset>
      {config.kind !== 'sort' && <fieldset><legend>Task</legend><div>{(['translate', 'contrapositive'] as const).map(stage => <Link key={stage} aria-current={config.stage === stage ? 'true' : undefined} to={update({ stage })}>{stage === 'translate' ? 'Translate the rule' : 'Add the contrapositive'}</Link>)}</div></fieldset>}
      {config.kind === 'translate-cards' && <fieldset><legend>Cards</legend><div>{(['all', 'needs'] as const).map(review => <Link key={review} aria-current={config.review === review ? 'true' : undefined} to={update({ review })}>{review === 'all' ? 'All cards' : 'Needs practice'}</Link>)}</div></fieldset>}
    </div></ConditionalFilters>}
    <Suspense fallback={<p role="status">Loading practice…</p>}>
      {config.kind === 'missing-links' ? <EmbeddedConditionalActivity key={`${actor}:missing-links`} activity="missing-links" userId={actor} backUrl={url(config.from ?? 'practice')} localOnly={localOnly} />
        : config.kind === 'unless' ? localOnly ? <p>The Unless Drill uses account milestones. Open it from your signed-in bootcamp to practise the four forms.</p> : <div className="cir-root"><p>Start with the untimed lesson checks. This drill keeps the same speed milestones as the Group 3 activity.</p><UnlessDrill edition="full-conditionals-v3"/></div>
        : <ConditionalSkillActivity key={configKey} kind={config.kind} groups={config.groups} stage={config.stage} review={config.review} storageScope={actor} itemId={config.itemId} allowCompound={steps.some(step => step.id === 'and-or-either-side')} embedded/>}
    </Suspense>
  </section>;
}
