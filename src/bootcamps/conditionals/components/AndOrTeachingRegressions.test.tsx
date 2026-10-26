import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AndOrDrill } from './AndOrPractice';
import { AndOrLesson } from './AndOrLessons';
import { describeProbe } from './AndOrVisuals';
import { andOrDrills, andOrQuizzes, placementExamples } from '../content/andOrItems';
import { choiceStep } from '../content/andOrTasks';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

const NO_STEPS = {};
import { CourseProgressProvider } from '../courseProgress';
import { emptyProgress, recordCourseStep, type ConditionalProgress } from '../progress';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const transfer = andOrDrills[3];
const item = (id: string) => transfer.items.find(entry => entry.id === id)!;

describe('probe: a denied necessary member', () => {
  const required = placementExamples.find(entry => entry.id === 'both-required')!;
  it('concludes the team is not in the round when a required safety form is denied', () => {
    const text = describeProbe(required.item, { form: false });
    expect(text).toContain('the team is not in the regional round');
    expect(text).not.toMatch(/no additional conclusion/);
  });
  it('still reaches every member when the team is in the round', () => {
    expect(describeProbe(required.item, { regional: true })).toMatch(/every member of the requirement follows/);
  });
  it('still says no additional conclusion under this rule when nothing is denied or established', () => {
    const either = placementExamples.find(entry => entry.id === 'either-trigger')!;
    expect(describeProbe(either.item, { local: false, invite: false })).toMatch(/this rule gives no additional conclusion/);
  });
});

describe('permission and boundary wording', () => {
  it('expresses permission, not actual staying, for the library rule', () => {
    const late = item('ao-transfer-2').atoms.find(atom => atom.id === 'late')!;
    expect(late.short).toMatch(/allowed/i);
    expect(late.yes).toBe('the visitor is allowed to stay late');
    expect(late.no).toBe('the visitor is not allowed to stay late');
    for (const option of choiceStep(item('ao-transfer-2'))!.options) if (/stay/.test(option.text)) expect(option.text).toMatch(/allowed to stay/);
  });
  it('treats exactly at the weight limit as not under it', () => {
    const light = item('ao-transfer-4').atoms.find(atom => atom.id === 'light')!;
    expect(light.yes).toBe('the parcel is under the weight limit');
    expect(light.no).toBe('the parcel is at or over the weight limit');
    const options = choiceStep(item('ao-transfer-4'))!.options;
    expect(options.find(option => option.correct)!.text).toContain('at or over the weight limit');
    for (const option of options) expect(option.text).not.toMatch(/(?<!at or )over the weight limit/);
  });
});

it('teaches AND and OR as separate lessons, each with its own quiz and no internal pages',()=>{
  const and=render(<MemoryRouter><AndOrLesson id="and-or-both-or-either"/></MemoryRouter>);
  expect(screen.getByText(/AND conjoins two conditions/)).toBeVisible();
  expect(screen.queryByText(/OR includes at least one/)).toBeNull();
  expect(document.body.textContent).not.toMatch(/whole group|full group|Page \d of \d/i);
  expect(screen.queryByRole('button',{name:/page/i})).toBeNull();
  expect(screen.queryByText('no photo ID OR no proof of address')).toBeNull();
  const andTable=screen.getByRole('table',{name:'Does this meet the AND condition?'});
  expect(within(andTable).getAllByRole('row').slice(1).map(row=>within(row).getAllByRole('cell')[2].textContent)).toEqual(['✓Met','×Not met','×Not met','×Not met']);
  expect(screen.getByText(/The visitor might still get a card/)).toBeVisible();
  const wrong=choiceStep(andOrQuizzes['and-or-both-or-either'][0])!.options.find(option=>!option.correct)!;
  const quiz=screen.getByRole('region',{name:'Pop Quiz'});
  fireEvent.click(within(quiz).getByRole('button',{name:new RegExp('^'+wrong.text.slice(0,15).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}));
  expect(within(quiz).getByText(wrong.hint)).toBeVisible();
  and.unmount();
  render(<MemoryRouter><AndOrLesson id="and-or-either-condition"/></MemoryRouter>);
  expect(screen.getByText('OR includes at least one.')).toBeVisible();
  expect(screen.queryByText(/AND conjoins two conditions/)).toBeNull();
  expect(document.body.textContent).not.toMatch(/whole group|full group|Page \d of \d/i);
  const orTable=screen.getByRole('table',{name:'Does this fit “Mia will study on Saturday or on Sunday”?'});
  expect(within(orTable).getAllByRole('row').slice(1).map(row=>within(row).getAllByRole('cell')[2].textContent)).toEqual(['✓Fits','✓Fits','✓Fits','×Ruled out']);
  expect(screen.getByRole('region',{name:'Pop Quiz'})).toBeVisible();
});

it('keeps contraposition out of the AND and OR quizzes, which come before it is taught',()=>{
  for(const id of ['and-or-both-or-either','and-or-either-condition']) expect(andOrQuizzes[id].every(item=>item.task.kind==='status')).toBe(true);
});

describe('build feedback survives edits without going stale', () => {
  const open = () => {
    render(<AndOrDrill setId={transfer.id} run/>);
    fireEvent.click(screen.getByRole('button', { name: 'Question 3' }));
    const fields = screen.getAllByRole('textbox');
    fireEvent.change(fields[0], { target: { value: 'Slip signed' } });
    fireEvent.change(fields[1], { target: { value: 'Parent attends' } });
    fireEvent.change(fields[2], { target: { value: 'Gets a seat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  };
  const row = (label: string) => screen.getAllByText(label).map(node => node.closest('.ao-build-row')).find(Boolean) as HTMLElement;
  const side = (label: string, where: 'Left' | 'Right') => fireEvent.click(within(row(label)).getByRole('button', { name: where }));

  it('keeps a hint as earlier feedback after an edit, restores it on undo, and never shows it as correct', () => {
    open();
    for (const label of ['Slip signed', 'Parent attends', 'Gets a seat']) side(label, 'Right');
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    expect(screen.getByText('Not yet.')).toBeVisible();
    side('Slip signed', 'Left');
    expect(screen.queryByText('Not yet.')).toBeNull();
    expect(screen.getByText('Earlier feedback.')).toBeVisible();
    expect(screen.queryByText('That works.')).toBeNull();
    side('Slip signed', 'Right');
    expect(screen.getByText('Not yet.')).toBeVisible();
    expect(screen.queryByText('Earlier feedback.')).toBeNull();
  });

  it('reopens an accepted build when wording changes, keeps the text, and survives a reload', () => {
    open();
    side('Slip signed', 'Left'); side('Parent attends', 'Left'); side('Gets a seat', 'Right');
    fireEvent.click(screen.getByRole('button', { name: 'OR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    expect(screen.getByText('That works.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Permission slip signed' } });
    expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.queryByText('That works.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Check this step' })).toBeEnabled();
    cleanup();
    render(<AndOrDrill setId={transfer.id} run/>);
    expect(screen.getByRole('button', { name: /Check this step/ })).toBeEnabled();
    expect(screen.queryByText('That works.')).toBeNull();
  });
});

describe('account-store path through the real course reducer', () => {
  const account = { current: emptyProgress() as ConditionalProgress };
  function Account({ children }: { children: ReactNode }) {
    const [progress, setProgress] = useState(account.current);
    // Stable like production (routes.tsx saveStep): a new save every render would re-run the drill's record effect forever.
    const save = useCallback((id: string, patch: Parameters<typeof recordCourseStep>[2]) => setProgress(previous => { account.current = recordCourseStep(previous, id, patch); return account.current; }), []);
    const steps = progress.course ?? NO_STEPS;
    const store = useMemo(() => ({ steps, save }), [steps, save]);
    return <CourseProgressProvider store={store}>{children}</CourseProgressProvider>;
  }
  const mount = () => render(<Account><AndOrDrill setId={transfer.id} run/></Account>);
  const OUR_LABELS = { slip: 'Slip signed', parent: 'Parent attends', seat: 'Gets a seat' };

  /** Every transfer item finished and accepted; item 3 carries a drafted label set and a retained hint. */
  const seedFinished = () => {
    const items: Record<string, unknown> = {};
    for (const entry of transfer.items) {
      const keys = entry.task.kind !== 'build' ? ['answer'] : ['labels', 'diagram', ...(entry.task.withContrapositive ? ['contra'] : [])];
      items[entry.id] = {
        stepIndex: keys.length - 1, labels: entry.id === 'ao-transfer-3' ? OUR_LABELS : {},
        steps: Object.fromEntries(keys.map(key => [key, { tried: [], outcome: key === 'labels' ? 'done' : 'correct', misses: key === 'diagram' && entry.id === 'ao-transfer-3' ? 1 : 0, hint: key === 'diagram' && entry.id === 'ao-transfer-3' ? 'Check the connector on the left side.' : '', checked: '', builder: { place: {}, negated: {}, leftOp: 'and', rightOp: 'and' } }])),
      };
    }
    const saved = { version: 1, current: 2, items };
    account.current = recordCourseStep(emptyProgress(), transfer.id, { state: saved, done: 6, total: 6, status: 'done' });
  };

  beforeEach(() => { account.current = emptyProgress(); });

  it('restores accepted work and drafted labels from the account with the device cache empty', () => {
    seedFinished();
    localStorage.clear();
    mount();
    expect(screen.getByRole('heading', { name: 'Question 3 of 6' })).toBeVisible();
    expect(screen.getByRole('button', { name: /3\. Build the contrapositive \(done\)/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
    expect(screen.getAllByRole('textbox').map(field => (field as HTMLInputElement).value)).toEqual(Object.values(OUR_LABELS));
    expect(account.current.course![transfer.id].status).toBe('done');
  });

  it('drops a finished set back to started when a label edit invalidates required work, keeping drafts, misses and the hint', () => {
    seedFinished();
    localStorage.clear();
    mount();
    fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Permission slip signed' } });
    const step = account.current.course![transfer.id];
    expect(step.status).toBe('started');
    expect(step.done).toBe(5);
    expect(step.total).toBe(6);
    const item = (step.state as { items: Record<string, { labels: Record<string, string>; steps: Record<string, { outcome: string; misses: number; hint: string }> }> }).items['ao-transfer-3'];
    expect(item.labels.slip).toBe('Permission slip signed');
    expect(item.labels.parent).toBe('Parent attends');
    expect(item.steps.labels.outcome).toBe('open');
    expect(item.steps.diagram.outcome).toBe('open');
    expect(item.steps.contra.outcome).toBe('open');
    expect(item.steps.diagram.misses).toBe(1);
    expect(item.steps.diagram.hint).toBe('Check the connector on the left side.');
  });

  it('shows the invalidated item as incomplete in the question map after the edit', () => {
    seedFinished();
    localStorage.clear();
    mount();
    expect(screen.getByRole('button', { name: 'Question 3, completed, current' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Permission slip signed' } });
    expect(screen.getByRole('button', { name: 'Question 3, current' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Drill progress' }).getAttribute('aria-valuenow')).toBe('5');
  });

  const stepsOf = () => (account.current.course![transfer.id].state as { items: Record<string, { steps: Record<string, { outcome: string; everRevealed: boolean }> }> }).items['ao-transfer-3'].steps;

  it('remembers a reveal through a wording edit and a later correct rebuild, and reloads it from the account', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Question 3' }));
    const fields = screen.getAllByRole('textbox');
    fireEvent.change(fields[0], { target: { value: 'Slip signed' } });
    fireEvent.change(fields[1], { target: { value: 'Parent attends' } });
    fireEvent.change(fields[2], { target: { value: 'Gets a seat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    const where = (label: string, side: 'Left' | 'Right') => fireEvent.click(within(screen.getAllByText(label).map(node => node.closest('.ao-build-row')).find(Boolean) as HTMLElement).getByRole('button', { name: side }));
    where('Slip signed', 'Left'); where('Parent attends', 'Right'); where('Gets a seat', 'Right');
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show me the arrangement' }));
    expect(stepsOf().diagram).toMatchObject({ outcome: 'revealed', everRevealed: true });
    // Edit the wording: the grade reopens, the history stays.
    fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Permission slip signed' } });
    expect(stepsOf().diagram).toMatchObject({ outcome: 'open', everRevealed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    where('Permission slip signed', 'Left'); where('Parent attends', 'Left'); where('Gets a seat', 'Right');
    fireEvent.click(screen.getByRole('button', { name: 'OR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    expect(screen.getByText('That works.')).toBeVisible();
    expect(stepsOf().diagram).toMatchObject({ outcome: 'correct', everRevealed: true });
    cleanup();
    localStorage.clear();
    mount();
    expect(stepsOf().diagram).toMatchObject({ outcome: 'correct', everRevealed: true });
  });

  it('counts an item with a past reveal as completed, not as answered correctly without a reveal', () => {
    seedFinished();
    const state = account.current.course![transfer.id].state as { current: number; items: Record<string, { steps: Record<string, Record<string, unknown>> }> };
    state.current = 5;
    state.items['ao-transfer-3'].steps.diagram.everRevealed = true;
    localStorage.clear();
    mount();
    fireEvent.click(screen.getByRole('button', { name: /See results/ }));
    expect(screen.getByText(/6 of 6 questions completed\. 5 answered correctly without a reveal; 1 completed after seeing the answer/)).toBeVisible();
  });

  it('keeps historical completion for any step that does not ask to reopen', () => {
    const done = recordCourseStep(emptyProgress(), 'source-independent', { status: 'done', done: 6, total: 6 });
    const revisited = recordCourseStep(done, 'source-independent', { done: 2, total: 6 });
    expect(revisited.course!['source-independent'].status).toBe('done');
    const reopened = recordCourseStep(recordCourseStep(done, transfer.id, { status: 'done', done: 6, total: 6 }), transfer.id, { reopen: true, done: 5, total: 6 });
    expect(reopened.course![transfer.id].status).toBe('started');
    expect(reopened.course!['source-independent'].status).toBe('done');
    expect(reopened.course![transfer.id]).not.toHaveProperty('reopen');
  });
});

it('teaches diagram writing and distinguishes an unmet trigger from a broken conditional in both lessons', () => {
 const and = render(<MemoryRouter><AndOrLesson id="and-or-both-or-either"/></MemoryRouter>);
 expect(screen.getByRole('region', { name: 'Write the diagram' })).toHaveTextContent('Draw the horizontal arrow level with the + sign');
 expect(screen.getByRole('region', { name: 'When would the rule be broken?' })).toHaveTextContent('both documents but does not get a card');
 expect(screen.getByRole('region', { name: 'When would the rule be broken?' })).toHaveTextContent('could get a card through another route, or could leave without one');
 expect(screen.getByRole('region', { name: 'Write the diagram' })).toHaveTextContent('WrongPhoto ID by itself guarantees a card.');
 and.unmount();
 render(<MemoryRouter><AndOrLesson id="and-or-either-condition"/></MemoryRouter>);
 expect(screen.getByRole('region', { name: 'When would the rule be broken?' })).toHaveTextContent('shows a document and still gets no card');
 expect(screen.getByRole('region', { name: 'When would the rule be broken?' })).toHaveTextContent('shows neither document breaks nothing');
 expect(screen.getByRole('region', { name: 'Write the diagram' })).toHaveTextContent('Negate one half.');
 expect(screen.getByRole('region', { name: 'Write the diagram' })).toHaveTextContent('If Mia does not study on Saturday, she studies on Sunday.');
});

it('derives both library contrapositives through all three student-controlled steps in the contrapositive lesson', () => {
 render(<MemoryRouter><AndOrLesson id="and-or-negate-group"/></MemoryRouter>);
 for (const name of ['The library rule: reverse, negate and switch', 'The OR library rule: reverse, negate and switch']) {
  const demo = screen.getByRole('group', { name });
  for (const step of [1,2,3]) fireEvent.click(within(demo).getByRole('button', { name: new RegExp(`Step ${step}\\.`) }));
  expect(demo).toHaveAttribute('data-stage', '3');
  const figure = within(demo).getByRole('figure');
  const sides = figure.querySelectorAll('.ao-side');
  expect(sides[0].querySelectorAll('.ao-member')).toHaveLength(1);
  expect(sides[1].querySelectorAll('.ao-member')).toHaveLength(2);
  expect(sides[1].querySelector('.ao-connector')).toHaveAttribute('data-op', name.includes('OR library') ? 'and' : 'or');
  expect(within(demo).getByText(/If the visitor does not get a library card, then/)).toBeVisible();
 }
});

it('uses the taught short phrases locally without changing the shared rule readbacks', () => {
 const and = render(<MemoryRouter><AndOrLesson id="and-or-both-or-either"/></MemoryRouter>);
 expect([...screen.getByRole('region', { name: 'AND means both' }).querySelectorAll('.ao-diagram .ct-pill')].map(node => node.textContent)).toEqual(['Photo ID shown', 'Address proof shown', 'Gets card']);
 expect(within(screen.getByRole('region', { name: 'AND means both' })).getByText('If the visitor shows photo ID and the visitor shows proof of address, then the visitor gets a library card.')).toBeVisible();
 and.unmount();
 render(<MemoryRouter><AndOrLesson id="and-or-negate-group"/></MemoryRouter>);
 expect(screen.getByText('Not both:')).toBeVisible();
 expect(screen.getByText('Neither:')).toBeVisible();
});

it.each(['and-or-both-or-either', 'and-or-either-condition', 'and-or-either-side', 'and-or-negate-group'])('uses direct AND/OR wording instead of the rejected terminology in %s', id => {
 const { container } = render(<MemoryRouter><AndOrLesson id={id}/></MemoryRouter>);
 expect(container.textContent).not.toMatch(/\bconnectors?\b/i);
});

it('names the remaining necessary OR option when the trigger is met and one option is false', () => {
 const required = placementExamples.find(entry => entry.id === 'one-required')!;
 expect(describeProbe(required.item, { regional: true, laptop: false })).toContain('the team has a tablet');
 expect(describeProbe(required.item, { regional: true, laptop: false })).not.toContain('narrows it');
});

it('keeps finished conditional readbacks inside the student-controlled demonstrations', () => {
 const { container } = render(<MemoryRouter><AndOrLesson id="and-or-negate-group"/></MemoryRouter>);
 const finished = [...container.querySelectorAll('p')].filter(node => /If (a|the) visitor does not get a library card, then/.test(node.textContent ?? ''));
 expect(finished).toHaveLength(2);
 for (const node of finished) {
  expect(node.closest('.ao-demo')).not.toBeNull();
  expect(node).toHaveAttribute('data-show', 'false');
  expect(node).toHaveAttribute('aria-hidden', 'true');
 }
});
