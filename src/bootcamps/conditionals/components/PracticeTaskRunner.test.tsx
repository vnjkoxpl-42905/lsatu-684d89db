import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PracticeTaskRunner } from './PracticeTaskRunner';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Attempt({ label }: { label: string }) {
  const [answer, setAnswer] = useState('');
  return <label>{label}<input value={answer} onChange={event => setAnswer(event.target.value)}/></label>;
}

const rounds = [
  { title: 'Keep the meaning', tasks: [
    { title: 'Find the complete condition', content: <Attempt label="First response"/> },
    { title: 'Read the arrow', content: <Attempt label="Second response"/> },
  ] },
  { title: 'Test a fresh rule', tasks: [
    { title: 'Apply the rule', content: <Attempt label="Third response"/> },
  ] },
];

it('exposes only the current task to accessibility queries while retaining other mounted tasks', () => {
  render(<PracticeTaskRunner rounds={rounds}/>);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.getByRole('region', { name: 'Find the complete condition' })).toBeVisible();
  expect(screen.queryByRole('textbox', { name: 'Second response' })).toBeNull();
  expect(screen.getByLabelText('Second response', { selector: 'input' })).not.toBeVisible();
});

it('moves focus to the task heading and retains entered responses across next, previous and round jumps', () => {
  render(<PracticeTaskRunner rounds={rounds}/>);
  fireEvent.change(screen.getByLabelText('First response'), { target: { value: 'Keep the full qualification' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  expect(screen.getByRole('heading', { name: 'Read the arrow' })).toHaveFocus();
  fireEvent.change(screen.getByLabelText('Second response'), { target: { value: 'Enough goes left' } });
  fireEvent.click(screen.getByRole('button', { name: 'Previous task' }));
  expect(screen.getByRole('heading', { name: 'Find the complete condition' })).toHaveFocus();
  expect(screen.getByLabelText('First response')).toHaveValue('Keep the full qualification');
  fireEvent.click(screen.getByRole('button', { name: '2. Test a fresh rule' }));
  expect(screen.getByRole('heading', { name: 'Apply the rule' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Next task' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous task' }));
  expect(screen.getByLabelText('Second response')).toHaveValue('Enough goes left');
});

it('shows bounded position progress and navigation without recording completion', () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  render(<PracticeTaskRunner rounds={rounds}/>);
  const progress = screen.getByRole('progressbar', { name: 'Current practice task' });
  expect(progress).toHaveAttribute('value', '1');
  expect(progress).toHaveAttribute('max', '3');
  expect(screen.getByRole('button', { name: 'Previous task' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  expect(progress).toHaveAttribute('value', '3');
  expect(screen.queryByRole('button', { name: /complete|finish/i })).toBeNull();
  expect(storage).not.toHaveBeenCalled();
  expect(within(screen.getByRole('navigation', { name: 'Task navigation' })).getAllByRole('button')).toHaveLength(2);
});
