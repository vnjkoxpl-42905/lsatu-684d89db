import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SkillPracticeHub } from './SkillPracticeHub';
import { ConditionalActivityIdentity } from '../activityIdentity';
import { courseStepsForEdition } from '../openingCoursePath';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';

vi.mock('./EmbeddedConditionalActivity', () => ({ EmbeddedConditionalActivity: (props: unknown) => <output data-testid="embedded-props">{JSON.stringify(props)}</output> }));
vi.mock('@/features/conditional-refresher/ConditionalSkillActivity', () => ({ ConditionalSkillActivity: (props: unknown) => <output data-testid="sentence-props">{JSON.stringify(props)}</output> }));
afterEach(cleanup);
const hub = (scope: string) => <MemoryRouter initialEntries={['/course/practice?activity=missing-links']}><SkillPracticeHub storageScope={scope} steps={courseStepsForEdition(FULL_CONDITIONAL_EDITION)} url={id => `/course/${id}`}/></MemoryRouter>;
it('never treats a legacy preview storage key as an authenticated owner', async () => {
  render(hub('preview:legacy'));
  const props = JSON.parse((await screen.findByTestId('embedded-props')).textContent!);
  expect(props).toMatchObject({ userId: 'anonymous', localOnly: true });
});
it('uses only the authenticated host identity for account-backed practice', async () => {
  render(<ConditionalActivityIdentity.Provider value={{ userId: 'authenticated-actor', localOnly: false }}>{hub('unrelated-storage-prefix:full-conditionals-v3')}</ConditionalActivityIdentity.Provider>);
  const props = JSON.parse((await screen.findByTestId('embedded-props')).textContent!);
  expect(props).toMatchObject({ userId: 'authenticated-actor', localOnly: false });
});
it('keeps an explicit authoring preview local even when it names a learner', async () => {
  render(<ConditionalActivityIdentity.Provider value={{ userId: 'preview', localOnly: true }}>{hub('preview:legacy')}</ConditionalActivityIdentity.Provider>);
  const props = JSON.parse((await screen.findByTestId('embedded-props')).textContent!);
  expect(props).toMatchObject({ userId: 'preview', localOnly: true });
});

it('keeps validated chapter and origin through sentence settings and the library return', async () => {
  render(<MemoryRouter initialEntries={['/course/tools?activity=translate-cards&groups=g3&courseChapter=3&from=exception-language']}><SkillPracticeHub steps={courseStepsForEdition(FULL_CONDITIONAL_EDITION)} url={id => `/course/${id}?assignment=course-row&edition=full-conditionals-v3`}/></MemoryRouter>);
  const player = await screen.findByTestId('sentence-props');
  expect(screen.getByRole('link', { name: 'All flashcards' })).toHaveAttribute('href', expect.stringContaining('courseChapter=3'));
  expect(screen.getByRole('link', { name: 'All flashcards' })).toHaveAttribute('href', expect.stringContaining('from=exception-language'));
  const review = screen.getByRole('link', { name: 'Needs practice' }).getAttribute('href')!;
  for (const fragment of ['courseChapter=3', 'from=exception-language', 'assignment=course-row', 'groups=g3', 'review=needs']) expect(review).toContain(fragment);
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  expect(screen.getByTestId('sentence-props')).toBe(player);
});
