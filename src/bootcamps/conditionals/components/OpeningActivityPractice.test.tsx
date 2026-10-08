import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DiagramDrills } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
import { DIAGRAM_ITEMS } from '@/features/conditional-refresher/content';
import { OpeningActivityPractice } from './OpeningActivityPractice';
import { openingActivityExplanations, openingActivityIds, openingActivityItems } from '../content/openingActivityItems';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function build(left: string, right: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Building left' }));
  fireEvent.click(screen.getByRole('button', { name: left }));
  fireEvent.click(screen.getByRole('button', { name: 'Building right' }));
  fireEvent.click(screen.getByRole('button', { name: right }));
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

it('uses exactly the individually reviewed source items without compounds or untaught groups', () => {
  expect(openingActivityItems.map(item => item.id)).toEqual(['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8']);
  openingActivityItems.forEach(item => {
    expect(item).toEqual(DIAGRAM_ITEMS.find(source => source.id === item.id));
    expect(['g1', 'g2']).toContain(item.group);
    expect(item.connectors).toBeUndefined();
    expect(openingActivityExplanations[item.id]).toBeTruthy();
  });
});

it('gates feedback, explains reversal and retry, and keeps original-only practice isolated from saved history', () => {
  localStorage.setItem('lsatu.conditional-refresher.v1', JSON.stringify({ diagram: { done: 31, correct: 20 }, flash: { f5: 'got' } }));
  localStorage.setItem('conditional-assignment:test', 'unchanged');
  const before = { ...localStorage };
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const { rerender } = render(<div><OpeningActivityPractice /></div>);
  expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(screen.queryByText(openingActivityExplanations.d1)).toBeNull();
  expect(screen.queryByText(/Contrapositive/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /^Not / })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  build('qualifies', 'trains');
  expect(screen.getByText('Not quite.')).toBeVisible();
  expect(screen.getByText(openingActivityExplanations.d1)).toBeVisible();
  expect(screen.queryByText(/Contrapositive/i)).toBeNull();
  rerender(<div hidden><OpeningActivityPractice /></div>);
  rerender(<div><OpeningActivityPractice /></div>);
  expect(screen.getByText('Not quite.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  build('trains', 'qualifies');
  expect(screen.getByText('Right.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('All dancers stretch.')).toBeVisible();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect({ ...localStorage }).toEqual(before);
});

it('restarts only the seven reviewed statements and never exposes timers or assignment completion', () => {
  render(<OpeningActivityPractice />);
  openingActivityItems.forEach(item => {
    expect(screen.getByText(item.prompt)).toBeVisible();
    build(item.left, item.right);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  });
  expect(screen.getByText('All diagram drills done.')).toBeVisible();
  expect(screen.queryByRole('button', { name: /mark.*complete/i })).toBeNull();
  expect(screen.queryByText(/seconds|timer|unless/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Practice again' }));
  expect(screen.getByText(openingActivityItems[0].prompt)).toBeVisible();
  expect(screen.getByText(`Statement 1 of ${openingActivityIds.length}. Build the original diagram.`)).toBeVisible();
});

it('retains legacy contrapositive acceptance and browser progress by default', () => {
  localStorage.setItem('lsatu.conditional-refresher.v1', JSON.stringify({ diagram: { done: 4, correct: 3 }, flash: { f5: 'got' } }));
  render(<DiagramDrills items={[DIAGRAM_ITEMS[0]]} />);
  build('Not qualifies', 'Not trains');
  expect(screen.getByText('Right.')).toBeVisible();
  expect(screen.getByText('Contrapositive:')).toBeVisible();
  expect(JSON.parse(localStorage.getItem('lsatu.conditional-refresher.v1')!)).toEqual({ diagram: { done: 5, correct: 4 }, flash: { f5: 'got' } });
});

it('rejects the contrapositive when the opening requests the original, even if negation controls are available', () => {
  render(<DiagramDrills items={[DIAGRAM_ITEMS[0]]} persistProgress={false} allowContrapositive={false} />);
  build('Not qualifies', 'Not trains');
  expect(screen.getByText('Not quite.')).toBeVisible();
  expect(screen.queryByText('Contrapositive:')).toBeNull();
});
