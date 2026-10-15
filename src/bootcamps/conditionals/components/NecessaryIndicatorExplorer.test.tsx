import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NecessaryIndicatorExplorer } from './NecessaryIndicatorExplorer';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function pointAt(element: HTMLElement, pointerType: string) {
  const event = new Event('pointerover', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(element, event);
}

it('keeps one ordered complete example and its exact necessary condition available for each tab', () => {
  const view = render(<NecessaryIndicatorExplorer/>);
  const tabs = view.getAllByRole('tab');
  expect(tabs.map(tab => tab.textContent?.replace(/^\d+/, '').replace('↗', ''))).toEqual([
    'only', 'only if', 'only when', 'only where', 'always', 'requires', 'must',
  ]);
  for (const tab of tabs) {
    fireEvent.click(tab);
    expect(tab).toHaveAttribute('aria-selected', 'true');
    const panel = view.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(panel.id).toBe(tab.getAttribute('aria-controls'));
    expect(panel.querySelector('blockquote')).toBeVisible();
    const requirement = panel.querySelector('.ni-requirement strong');
    expect(requirement).toHaveTextContent(tab.textContent?.includes('only where')
      ? 'A tutor is present where the seminar takes place.' : 'You are a student.');
  }
  fireEvent.click(view.getByRole('tab', { name: 'only where' }));
  expect(view.getByRole('tabpanel')).toHaveTextContent('A tutor could also be somewhere without a seminar.');
  fireEvent.click(view.getByRole('tab', { name: 'always' }));
  expect(view.getByRole('tabpanel')).toHaveTextContent('after enrollment ends');
  fireEvent.click(view.getByRole('tab', { name: 'must' }));
  expect(view.getByRole('tabpanel')).toHaveTextContent('not a task someone has been told to complete');
});

it('supports roving keyboard focus, arrow wrapping, Home and End', () => {
  const view = render(<NecessaryIndicatorExplorer/>);
  const tabs = within(view.getByRole('tablist')).getAllByRole('tab');
  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[0]).toHaveAttribute('tabindex', '-1');
  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs[6]).toHaveFocus();
  fireEvent.keyDown(tabs[6], { key: 'ArrowRight' });
  expect(tabs[0]).toHaveFocus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowUp' });
  expect(tabs[6]).toHaveFocus();
  fireEvent.keyDown(tabs[6], { key: 'Home' });
  expect(tabs[0]).toHaveFocus();
  expect(tabs.filter(tab => tab.tabIndex === 0)).toHaveLength(1);
});

it('supports mouse hover only beside the panel, ignoring touch and keeping a clicked narrow-layout choice', () => {
  const media = vi.fn().mockReturnValue({ matches: true });
  vi.stubGlobal('matchMedia', media);
  const view = render(<NecessaryIndicatorExplorer/>);
  const tabs = view.getAllByRole('tab');
  pointAt(tabs[1], 'mouse');
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(media).toHaveBeenCalledWith('(hover: hover) and (min-width: 621px)');
  pointAt(tabs[3], 'touch');
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  media.mockReturnValue({ matches: false });
  fireEvent.click(tabs[2]);
  pointAt(tabs[5], 'mouse');
  expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(tabs[3]);
  expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
});
