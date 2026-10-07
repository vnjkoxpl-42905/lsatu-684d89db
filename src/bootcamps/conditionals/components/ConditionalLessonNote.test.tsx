import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from '../content';
import { ConditionalLessonNote } from './ConditionalLessonNote';
vi.mock('@/components/ui/dynamic-island-toc', () => ({ DynamicIslandTOC: () => null }));
afterEach(cleanup);

function mount(id: string) {
  const unit = conditionalUnits.find(item => item.id === id)!;
  const complete = vi.fn();
  render(<MemoryRouter><ConditionalLessonNote unit={unit} onComplete={complete} reviewed={false} continueHref="/guided" /></MemoryRouter>);
  return { unit, complete };
}

it('explains a conditional before the case explorer and preserves every teaching paragraph', () => {
  const { unit, complete } = mount('orientation');
  expect(screen.getByRole('heading', { name: 'A promise about qualifying cases' })).toBeTruthy();
  unit.teaching.forEach(paragraph => expect(screen.getByText(paragraph)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Its tracking record was updated.' }));
  expect(screen.getByText('Whether the parcel was scanned remains unknown.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Its tracking record was not updated.' }));
  expect(screen.getByText('The parcel was not scanned.', { selector: 'strong' })).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  expect(complete).toHaveBeenCalledOnce();
});

it('checks the Group 2 target before revealing direction without a difficulty selector', () => {
  mount('group-2');
  expect(screen.queryByText('Entry → current pass.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Find the target' }));
  expect(screen.getByText('What is required? A current pass.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show the translation' }));
  expect(screen.getByText('Entry → current pass.')).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
});

it('distinguishes a chain rule from the new facts established by adding a case', () => {
  mount('direct-linking');
  expect(screen.getByText('Every calibrated meter is listed.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Add: Meter D is calibrated' }));
  expect(screen.getByText('Meter D is registered and listed.')).toBeTruthy();
});
