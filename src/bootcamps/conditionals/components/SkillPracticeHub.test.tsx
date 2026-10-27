import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SkillPracticeHub } from './SkillPracticeHub';
import { ConditionalActivityIdentity } from '../activityIdentity';
import { courseStepsForEdition } from '../openingCoursePath';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';

vi.mock('./EmbeddedConditionalActivity', () => ({ EmbeddedConditionalActivity: (props: unknown) => <output data-testid="embedded-props">{JSON.stringify(props)}</output> }));
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
