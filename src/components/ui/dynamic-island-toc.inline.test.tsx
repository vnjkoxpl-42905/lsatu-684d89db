import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DynamicIslandTOC } from './dynamic-island-toc';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const selector = '#inline-toc-fixture h2, #inline-toc-fixture h3';

function fixture(variant?: 'floating' | 'inline') {
  return render(
    <>
      <h2 id="outside">Outside this lesson</h2>
      <article id="inline-toc-fixture">
        <h2 id="first">What does a conditional tell you?</h2>
        <h3 id="ignored" data-toc-ignore>Hidden from the contents</h3>
        <h3 data-toc-title="Read the complete idea before choosing a side">Short visible title</h3>
        <h2 id="last">Build an original and its contrapositive</h2>
      </article>
      <DynamicIslandTOC selector={selector} variant={variant} />
    </>,
  );
}

it('provides native inline disclosure with complete scoped headings in document order', () => {
  vi.useFakeTimers();
  const { container } = fixture('inline');
  act(() => { vi.advanceTimersByTime(100); });
  const nav = screen.getByRole('navigation', { name: 'Lesson contents' });
  const disclosure = nav.querySelector('details')!;
  expect(disclosure.querySelector('summary')?.textContent).toBe('On this page');
  expect(disclosure.open).toBe(false);
  disclosure.open = true;
  const links = within(nav).getAllByRole('link');
  expect(links.map(link => link.textContent)).toEqual([
    'What does a conditional tell you?',
    'Read the complete idea before choosing a side',
    'Build an original and its contrapositive',
  ]);
  expect(links.map(link => link.getAttribute('href'))).toEqual([
    '#first', '#short-visible-title', '#last',
  ]);
  expect([...nav.querySelectorAll('li')].map(item => item.getAttribute('data-toc-level'))).toEqual(['2', '3', '2']);
  expect(nav.querySelector('ol')).toBeTruthy();
  expect(nav.querySelector('button')).toBeNull();
  expect(container.querySelector('[class*="fixed"]')).toBeNull();
  expect(container.querySelector('svg')).toBeNull();
  expect(within(nav).queryByText('Outside this lesson')).toBeNull();
  expect(within(nav).queryByText('Hidden from the contents')).toBeNull();
});

it('keeps the floating island as the default presentation', () => {
  vi.useFakeTimers();
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500);
  const { container } = fixture();
  act(() => { vi.advanceTimersByTime(100); });
  expect(screen.queryByRole('navigation', { name: 'Lesson contents' })).toBeNull();
  expect(container.querySelector('details')).toBeNull();
  expect(container.querySelector('[class*="fixed"]')).toBeTruthy();
  expect(container.querySelector('svg')).toBeTruthy();
});
