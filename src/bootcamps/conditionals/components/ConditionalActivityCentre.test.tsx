import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('./EmbeddedConditionalActivity', () => ({ EmbeddedConditionalActivity: (props: unknown) => <output data-testid="embedded-player">{JSON.stringify(props)}</output> }));
vi.mock('@/features/conditional-refresher/ConditionalSkillActivity', () => ({ ConditionalSkillActivity: (props: unknown) => <output data-testid="skill-player">{JSON.stringify(props)}</output> }));
vi.mock('@/features/quick-drills/unless-drill/UnlessDrill', () => ({ default: () => <div data-testid="unless-player">Unless player</div> }));
vi.mock('./GuidedConditionalActivity', () => ({ GuidedConditionalActivity: (props: unknown) => <output data-testid="guided-player">{JSON.stringify(props)}</output> }));
vi.mock('./OpeningCourse', () => ({ OpeningCourseNavigation: () => null, OpeningCourseScreen: () => null }));
import { ConditionalActivityCentre, type ConditionalActivityCentreProps } from './ConditionalActivityCentre';
import { conditionalCentreUrl } from '../routes';
import { normalizeConditionalActivityConfig, type ConditionalActivityConfig } from '../activityRegistry';
const full = { target: { scope: 'course' }, unitIds: [] };
const g3 = { target: { scope: 'skill', difficulty: 'beginner' }, unitIds: ['group-3'] };
const href = (config?: ConditionalActivityConfig) => conditionalCentreUrl('?assignment=course-row&edition=full-conditionals-v3', config);
function mount(extra: Partial<ConditionalActivityCentreProps> = {}, query = '') {
  return render(<MemoryRouter initialEntries={[`/bootcamp/conditionals/centre${query}`]}><ConditionalActivityCentre userId="actor-7" grant={full} href={href} courseHref="/bootcamp/conditionals/lessons?assignment=course-row" {...extra}/></MemoryRouter>);
}
function config(value: ConditionalActivityConfig) { return normalizeConditionalActivityConfig(value)!; }
describe('the integrated conditional activity centre', () => {
  it('lists the ten full-course collections without mounting any hidden players', () => {
    mount();
    for (const title of ['Conditional Rephrase', 'Linking', 'Missing Links', 'Must Be True', 'Sort indicator words', 'Diagram practice', 'Sentence flashcards', 'Unless Drill', 'Conditional bank practice', 'Guided LSAT questions']) expect(screen.getByRole('link', { name: `Open ${title}` })).toBeTruthy();
    expect(screen.queryByTestId('embedded-player')).toBeNull();
    expect(screen.queryByTestId('skill-player')).toBeNull();
    expect(screen.queryByTestId('unless-player')).toBeNull();
    expect(screen.queryByTestId('guided-player')).toBeNull();
  });
  it('shows the exact assigned activity and settings without unrelated collections', () => {
    mount({ grant: { target: { scope: 'activity', activityId: 'missing-links', activitySettings: { level: 'words' } }, unitIds: [] } });
    const link = screen.getByRole('link', { name: 'Open Missing Links' });
    expect(link.getAttribute('href')).toContain('level=words');
    expect(screen.queryByRole('link', { name: 'Open Conditional Rephrase' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open Guided LSAT questions' })).toBeNull();
  });
  it('gives a Group 3 grant its matching translation activities without Missing Links or guided sets', () => {
    mount({ grant: g3 });
    for (const title of ['Conditional Rephrase', 'Diagram practice', 'Sentence flashcards', 'Unless Drill']) expect(screen.getByRole('link', { name: `Open ${title}` })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Open Missing Links' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open Guided LSAT questions' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open Sort indicator words' })).toBeNull();
  });
  it('denies a forged activity config before any player mounts', () => {
    mount({ grant: g3, config: config({ activity: 'missing-links', level: 'words' }) });
    expect(screen.getByText('This activity is not available in this work.')).toBeTruthy();
    expect(screen.queryByTestId('embedded-player')).toBeNull();
  });
  it('passes the shared actor and filtered item identity into the existing activity player', async () => {
    mount({ config: config({ activity: 'rephrase', groups: ['g3'], timing: 'untimed' }) });
    const props = JSON.parse((await screen.findByTestId('embedded-player')).textContent!);
    expect(props.userId).toBe('actor-7');
    expect(props.activity).toBe('rephrase');
    expect(props.selectedItemOrders.length).toBeGreaterThan(0);
    expect(props.timing).toBe('untimed');
    expect(screen.queryByTestId('skill-player')).toBeNull();
    const all = screen.getByRole('link', { name: 'All groups' }).getAttribute('href')!;
    expect(new URL(all, 'https://local.test').searchParams.get('assignment')).toBe('course-row');
  });
  it('keeps flashcard topic/task/review settings together and preserves the course grant', async () => {
    mount({ config: config({ activity: 'translate-cards', groups: ['g3'], stage: 'contrapositive', review: 'needs' }) });
    const props = JSON.parse((await screen.findByTestId('skill-player')).textContent!);
    expect(props.storageScope).toBe('actor-7');
    expect(props.groups).toEqual(['g3']);
    expect(props.stage).toBe('contrapositive');
    expect(props.review).toBe('needs');
    const all = new URL(screen.getByRole('link', { name: 'All cards' }).getAttribute('href')!, 'https://local.test');
    expect(all.searchParams.get('assignment')).toBe('course-row');
    expect(all.searchParams.get('groups')).toBe('g3');
    expect(all.searchParams.get('review')).toBe('all');
  });
  it('shows all thirteen guided sets in their correct bands', async () => {
    mount({ config: config({ activity: 'guided' }) });
    await screen.findByRole('heading', { name: 'Easier' });
    expect(screen.getAllByRole('link', { name: 'Open set' })).toHaveLength(13);
    for (const band of ['Easier', 'Medium', 'Harder']) expect(screen.getByRole('heading', { name: band })).toBeTruthy();
    expect(screen.queryByTestId('guided-player')).toBeNull();
  });
  it('opens a specifically assigned guided set internally with its selected context', async () => {
    const set = 'w2-04-conditional-logic-easier-set-1';
    mount({ grant: { target: { scope: 'activity', activityId: 'guided', activitySettings: { set } }, unitIds: [] }, config: config({ activity: 'guided', set }), localOnly: true }, '?view=run');
    const props = JSON.parse((await screen.findByTestId('guided-player')).textContent!);
    expect(props.slug).toBe(set);
    expect(props.view).toBe('run');
    expect(props.localOnly).toBe(true);
    expect(props.launchUrl).toContain('assignment=course-row');
    expect(props.runUrl).toContain('view=run');
  });
  it('cleans stale player context when changing activity while retaining assignment and edition', () => {
    const result = conditionalCentreUrl('?assignment=course-row&edition=full-conditionals-v3&activity=guided&set=w2-04-conditional-logic-easier-set-1&view=run&run=old&guidedAssignment=old&returnTo=%2Fwrong&groups=g3&timing=timed', config({ activity: 'missing-links', level: 'words' }));
    const url = new URL(result, 'https://local.test');
    expect(url.pathname).toBe('/bootcamp/conditionals/centre/missing-links');
    expect(url.searchParams.get('assignment')).toBe('course-row');
    expect(url.searchParams.get('edition')).toBe('full-conditionals-v3');
    expect(url.searchParams.get('level')).toBe('words');
    for (const key of ['view', 'run', 'guidedAssignment', 'returnTo', 'groups', 'timing', 'set']) expect(url.searchParams.has(key)).toBe(false);
  });
});
