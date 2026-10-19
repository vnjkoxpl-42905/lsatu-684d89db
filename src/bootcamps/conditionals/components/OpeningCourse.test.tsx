import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { OPENING_COURSE_PATH, LEGACY_OPENING_COURSE_STEPS, openingCourseStep, openingDrillNumber } from '../openingCoursePath';
import { OpeningCourseNavigation, OpeningCourseScreen } from './OpeningCourse';

const url = (id: string, run = false) => `/course/${id}${run ? '?run=1' : ''}`;
afterEach(cleanup);

it('offers five numbered lessons in Chapter 1 and eleven interleaved drill entries', () => {
  render(<MemoryRouter><OpeningCourseScreen url={url}/></MemoryRouter>);
  expect(screen.getByRole('region', { name: 'Chapter 1' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
  expect(screen.queryByText('Part 1')).toBeNull();
  const chapterOne = within(screen.getByRole('region', { name: 'Chapter 1' }));
  expect(document.querySelector<HTMLElement>('ol.oc-course-path')!.children).toHaveLength(16);
  expect(chapterOne.getAllByRole('link', { name: /Read lesson/ })).toHaveLength(5);
  expect(chapterOne.getAllByRole('link', { name: /View drill/ })).toHaveLength(11);
  expect(document.querySelector('.co-pages')).toBeNull();
  expect(OPENING_COURSE_PATH.slice(0, 6).map(step => step.id)).toEqual(['meaning', 'sufficient', 'necessary', 'must-arrow', 'contrapositive', 'foundation-practice']);
});

it('shows the rule count in plain words and never says statements or practise', () => {
  render(<MemoryRouter><OpeningCourseScreen url={url}/></MemoryRouter>);
  const card = screen.getByRole('heading', { name: /Find the indicators/ }).closest('li')!;
  expect(within(card).getByText('28 questions')).toBeVisible();
  expect(within(card).queryByRole('list')).toBeNull();
  expect(document.querySelector('ol.oc-course-path')!.textContent).not.toMatch(/statements|Practise/i);
});

it('teaches each prerequisite before the source drills that use it', () => {
  const position = (id: string) => OPENING_COURSE_PATH.findIndex(step => step.id === id);
  expect(position('necessary')).toBeLessThan(position('source-intro-identify'));
  expect(OPENING_COURSE_PATH.some(step => step.id === 'source-roles')).toBe(false);
  expect(position('necessary')).toBeLessThan(position('source-rephrase'));
  expect(position('necessary')).toBeLessThan(position('source-intro-identify'));
  expect(position('contrapositive')).toBeLessThan(position('source-full-translation'));
  expect(position('contrapositive')).toBeLessThan(position('source-intro-diagrams-contrapositive'));
  expect(position('contrapositive')).toBeLessThan(position('source-rephrase-contrapositive'));
  expect(position('contrapositive-practice')).toBeLessThan(position('source-independent'));
});

it.each(OPENING_COURSE_PATH)('renders the dedicated $id destination without an old reader index', async step => {
  render(<MemoryRouter><OpeningCourseScreen view={step.id} run={step.type === 'drill'} url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: step.title })).toBeVisible();
  if (step.lessonNumber) expect(screen.getByText(`Chapter ${step.part} · Lesson ${step.lessonNumber}`)).toBeVisible();
  await waitFor(() => expect(document.querySelector('.opening-course-content')).not.toBeNull());
  expect(document.querySelector('.co-pages')).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Course navigation' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Mark lesson/ })).toBeNull();
});

it('separates a drill landing from its attempt surface', () => {
  const { rerender } = render(<MemoryRouter><OpeningCourseScreen view="foundation-practice" url={url}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/course/foundation-practice?run=1');
  expect(screen.queryByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toBeNull();
  rerender(<MemoryRouter><OpeningCourseScreen view="foundation-practice" run url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toBeVisible();
});

it('retains a corrected answer when returning from another dedicated lesson', () => {
  const { rerender } = render(<MemoryRouter><OpeningCourseScreen view="meaning" url={url}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Yes, it says you win.' }));
  expect(screen.getByText('Not quite.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells you what follows if you win.' }));
  rerender(<MemoryRouter><OpeningCourseScreen view="sufficient" url={url}/></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'No, it tells you what follows if you win.' })).toBeNull();
  rerender(<MemoryRouter><OpeningCourseScreen view="meaning" url={url}/></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'No, it tells you what follows if you win.' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Correct.')).toBeVisible();
});

it('exposes only the permitted content and flashcard families', () => {
  const steps = OPENING_COURSE_PATH.filter(step => step.unitId === 'group-1');
  const { rerender } = render(<MemoryRouter><OpeningCourseScreen view="necessary" steps={steps} url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  expect(document.querySelector('.opening-course-content')).toBeNull();
  rerender(<MemoryRouter><OpeningCourseScreen view="tools" steps={steps} url={url}/></MemoryRouter>);
  // The mixed word deck is the only indicator set, and it is always there.
  expect(screen.getByRole('heading', { name: 'Indicator words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Group 2 words' })).toBeNull();
  const both = OPENING_COURSE_PATH.filter(step => step.unitId === 'group-1' || step.unitId === 'group-2');
  rerender(<MemoryRouter><OpeningCourseScreen view="tools" steps={both} url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Indicator words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Sufficient and necessary' })).toBeNull();
});


function CourseNavigationHarness() {
  const location = useLocation();
  const view = location.pathname.split('/').pop() || 'lessons';
  return <><OpeningCourseNavigation view={view} url={url}/><OpeningCourseScreen view={view} url={url}/></>;
}

function DrillRouteHarness() {
  const location = useLocation();
  const view = location.pathname.split('/').pop() || 'lessons';
  const run = new URLSearchParams(location.search).get('run') === '1';
  return <OpeningCourseScreen view={view} run={run} url={url}/>;
}

it('starts mixed practice from concrete instructions and returns to the same instruction page', async () => {
  render(<MemoryRouter initialEntries={['/course/mixed-practice']}><DrillRouteHarness/></MemoryRouter>);
  const instructions = screen.getByRole('region', { name: 'Practice instructions' });
  expect(screen.getByRole('heading', { level: 1, name: 'Conditional translation practice' })).toBeVisible();
  expect(within(instructions).getByRole('heading', { name: 'One step at a time' })).toBeVisible();
  expect(within(instructions).getAllByRole('listitem')).toHaveLength(5);
  expect(instructions.textContent).not.toMatch(/24 questions|5 stages/);
  expect(screen.queryByRole('region', { name: 'How this drill works' })).toBeNull();
  expect(document.querySelector('.opening-course-content')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Start practice' }));
  await waitFor(() => expect(document.querySelector('.opening-course-content')).not.toBeNull());
  expect(screen.queryByRole('region', { name: 'Practice instructions' })).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: 'Conditional translation practice' }).closest('.oc-drill-run-header')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'What does the rule cover?' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Begin practice' })).toBeNull();
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(screen.queryByText('Write each conditional as a diagram, read it back in English, and check whether it means the same thing.')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Back to instructions' }));
  expect(screen.getByRole('link', { name: 'Start practice' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Back to instructions' })).toBeNull();
  expect(document.querySelector('.oc-course-body')).toHaveAttribute('hidden');
});

it('focuses the destination after drawer navigation and restores the trigger after Escape', async () => {
  render(<MemoryRouter initialEntries={['/course/meaning']}><CourseNavigationHarness/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Course menu' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Course' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Conditional reasoning.' })).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Course menu' }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Course menu' })).toHaveFocus());
});

it('retains legacy destinations without duplicating the numbered course', () => {
  expect(OPENING_COURSE_PATH.filter(step => step.type === 'note').map(step => step.lessonNumber)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3']);
  expect(OPENING_COURSE_PATH.filter(step => step.part === 1 && step.type === 'note').map(step => step.lessonNumber)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
  expect(OPENING_COURSE_PATH.findIndex(step => step.id === 'contrapositive')).toBeLessThan(OPENING_COURSE_PATH.findIndex(step => step.id === 'foundation-practice'));
  for (const step of LEGACY_OPENING_COURSE_STEPS) {
    expect(openingCourseStep(step.id)).toBe(step);
    expect(OPENING_COURSE_PATH.some(current => current.id === step.id)).toBe(false);
  }
});

it('offers one course destination and keeps optional review routes out of primary navigation', () => {
  render(<MemoryRouter><OpeningCourseNavigation view="overview" url={url} workspaceLinks={{ overview: '/course', review: '/review', journal: '/journal', reference: '/reference' }}/></MemoryRouter>);
  const navigation = screen.getByRole('navigation', { name: 'Conditional course' });
  expect(within(navigation).getByRole('link', { name: 'Course' })).toHaveAttribute('href', '/course');
  expect(within(navigation).getByRole('link', { name: 'Course' })).toHaveAttribute('aria-current', 'page');
  expect(within(navigation).queryByRole('link', { name: /Lessons|Course overview|Review attempts|Journal/ })).toBeNull();
  expect(within(navigation).getByRole('link', { name: 'Quick reference' })).toHaveAttribute('href', '/reference');
});

it('continues the first unfinished course step without skipping prerequisites for a later draft', () => {
  const progressStore = { steps: { meaning: { status: 'done' as const, updatedAt: '2026-10-17' }, 'sufficient-practice': { status: 'started' as const, updatedAt: '2026-10-17', state: { draft: 'retained' } } }, save: () => {} };
  render(<MemoryRouter><OpeningCourseScreen url={url} progressStore={progressStore}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Start lesson 1.2/ })).toHaveAttribute('href', '/course/sufficient');
  expect(progressStore.steps['sufficient-practice'].state.draft).toBe('retained');
});

it('shows completion as a percentage of the available steps', () => {
 const steps = OPENING_COURSE_PATH.slice(0, 3);
 const progressStore = { steps: { meaning: { status: 'done' as const, updatedAt: '2026-10-17' } }, save: () => {} };
 render(<MemoryRouter><OpeningCourseScreen steps={steps} progressStore={progressStore} url={url}/></MemoryRouter>);
 expect(screen.getByRole('progressbar', { name: 'Course completion' })).toHaveAttribute('aria-valuenow', '33');
 expect(screen.getByText((_, node) => node?.tagName === 'STRONG' && node.textContent === '33% complete')).toBeVisible();
});
it('distinguishes lesson and drill timeline nodes with text and icons', () => {
 render(<MemoryRouter><OpeningCourseScreen url={url}/></MemoryRouter>);
 const lesson = document.querySelector('[data-kind="note"]')!;
 const drill = document.querySelector('[data-kind="drill"]')!;
 expect(within(lesson as HTMLElement).getByText('Lesson')).toBeVisible();
 expect(within(drill as HTMLElement).getByText('Drill 1')).toBeVisible();
 expect(lesson.querySelector('.oc-timeline-node svg')).not.toBeNull();
 expect(drill.querySelector('.oc-timeline-node svg')).not.toBeNull();
});
it('places Classroom after the course resources in the rail and mobile drawer', () => {
 render(<MemoryRouter><OpeningCourseNavigation view="lessons" url={url}/></MemoryRouter>);
 expect(document.querySelector('.oc-course-rail')!.lastElementChild).toHaveTextContent('Classroom');
 fireEvent.click(screen.getByRole('button', { name: 'Course menu' }));
 const dialog = screen.getByRole('dialog');
 expect(within(dialog).getByRole('link', { name: 'Classroom' }).previousElementSibling?.tagName).toBe('NAV');
});

it.each([[0, 200, '0% complete'], [66, 200, '33% complete'], [199, 200, '99% complete'], [200, 200, '99% complete']] as const)('shows honest partial drill percentage for %s of %s', (done, total, label) => {
 const step = OPENING_COURSE_PATH.find(step => step.id === 'foundation-practice')!;
 const progressStore = { steps: { [step.id]: { status: 'started' as const, updatedAt: '2026-10-17', done, total } }, save: () => {} };
 render(<MemoryRouter><OpeningCourseScreen steps={[step]} progressStore={progressStore} url={url}/></MemoryRouter>);
 expect(screen.getByText(label)).toBeVisible();
 expect(screen.getByRole('progressbar', { name: 'Course completion' })).toHaveAttribute('aria-valuenow', '0');
});
it('shows 100 percent only after all available course steps are done', () => {
 const step = OPENING_COURSE_PATH[0];
 const progressStore = { steps: { [step.id]: { status: 'done' as const, updatedAt: '2026-10-17' } }, save: () => {} };
 render(<MemoryRouter><OpeningCourseScreen steps={[step]} progressStore={progressStore} url={url}/></MemoryRouter>);
 expect(screen.getByRole('progressbar', { name: 'Course completion' })).toHaveAttribute('aria-valuenow', '100');
 expect(screen.getByText((_, node) => node?.tagName === 'STRONG' && node.textContent === '100% complete')).toBeVisible();
});

it('numbers the fifteen active drills once, Chapter 2 continuing after Chapter 1, and preserves the retired roles destination', () => {
 const drills = OPENING_COURSE_PATH.filter(step => step.type === 'drill');
 expect(drills.map(step => openingDrillNumber(step.id))).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
 expect(drills.slice(11).map(step => step.id)).toEqual(['and-or-meaning-practice', 'and-or-placement-practice', 'and-or-whole-group-practice', 'and-or-transfer-practice']);
 expect(drills.every(step => !/Drill \d/.test(step.title))).toBe(true);
 expect(openingCourseStep('source-roles')?.title).toBe('Place the conditions');
 expect(openingDrillNumber('source-roles')).toBeUndefined();
 render(<MemoryRouter><OpeningCourseScreen steps={[drills[3]]} url={url}/></MemoryRouter>);
 expect(screen.getByText('Drill 4')).toBeVisible();
 expect(screen.queryByRole('heading', { name: 'Place the conditions' })).toBeNull();
});
