import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AndOrDrill } from './AndOrPractice';
import { AndOrLesson } from './AndOrLessons';
import { describeProbe } from './AndOrVisuals';
import { andOrDrills, placementExamples } from '../content/andOrItems';
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

it('teaches that one known AND member leaves the group not established, not false', () => {
  render(<MemoryRouter><AndOrLesson id="and-or-both-or-either"/></MemoryRouter>);
  const card = screen.getByText('Call the group met after one member.').closest('article') as HTMLElement;
  expect(within(card).getByText('Proof of address').parentElement).toHaveTextContent('Unknown');
  expect(within(card).getByText('Not established yet')).toBeVisible();
  expect(within(card).queryByText(/ruled out/)).toBeNull();
  expect(screen.queryByText(/One member leaves it unmet/)).toBeNull();
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
