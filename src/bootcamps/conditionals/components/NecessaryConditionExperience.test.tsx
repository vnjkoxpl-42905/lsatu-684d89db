import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { NecessaryConditionExperience } from './NecessaryConditionExperience';

afterEach(cleanup);

it('keeps one named panel visible and distinguishes given facts from conclusions', () => {
  render(<NecessaryConditionExperience/>);
  const rule = screen.getByText('If you are enrolled in law school, then you are a student.');
  expect(rule).toBeVisible();
  expect(screen.getByRole('tabpanel', { name: 'Law student' })).toHaveTextContent('Enrollment guarantees being a student.');
  fireEvent.click(screen.getByRole('tab', { name: 'History student' }));
  expect(rule).toBeVisible();
  const history = screen.getByRole('tabpanel', { name: 'History student' });
  expect(history).toHaveTextContent('history student who is not enrolled in law school');
  expect(history).toHaveTextContent('Being a student does not guarantee law-school enrollment.');
  expect(within(history).getByText('Not enrolled')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Not a student' }));
  expect(rule).toBeVisible();
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(screen.getByRole('tabpanel', { name: 'Not a student' })).toHaveTextContent('enrollment is ruled out');
  expect(screen.getByRole('tab', { name: 'Not a student' })).toHaveAttribute('aria-selected', 'true');
});

it('supports vertical arrow navigation, wrapping, Home and End with roving focus', () => {
  render(<NecessaryConditionExperience/>);
  expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  const tabs = screen.getAllByRole('tab');
  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[0]).toHaveAttribute('tabindex', '-1');
  expect(tabs[1]).toHaveAttribute('tabindex', '0');
  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs[2]).toHaveFocus();
  fireEvent.keyDown(tabs[2], { key: 'ArrowDown' });
  expect(tabs[0]).toHaveFocus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowUp' });
  expect(tabs[2]).toHaveFocus();
  fireEvent.keyDown(tabs[2], { key: 'Home' });
  expect(tabs[0]).toHaveFocus();
  const panel = screen.getByRole('tabpanel', { name: 'Law student' });
  expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
  expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
  expect(panel).toHaveAttribute('tabindex', '0');
});
