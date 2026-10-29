import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RcIndexPassageWithPt } from '../lib/rcAdaptive';
import type { RcFinderAddress } from '../lib/rcPassageFinder';
import { RcPassageFinder } from './RcPassageFinder';

const row = (passageId: number, preptest: number, section: number, setNumber: number, title: string, topic: string, questionCount = 6): RcIndexPassageWithPt => ({
  passageId, preptest, section, setNumber, title, topic, questionCount,
  format: 'Standard', frameworks: [], difficulty: 3, explainedCount: questionCount, questionIds: [],
  firstWords: 'Hidden opening sentence about volcanoes',
});
const passages: RcIndexPassageWithPt[] = [
  row(1, 140, 3, 1, 'Marine ecosystems', 'Natural Science', 7),
  row(2, 140, 3, 2, 'The history of public libraries', 'Humanities'),
  row(3, 152, 2, 1, 'Water rights', 'Law'),
  row(4, 152, 4, 1, 'Legal positivism', 'Law'),
  row(5, 119, 1, 1, 'Ocean currents', 'Natural Science'),
];

function Harness({ status = 'ready', list = passages, onRetry = () => {}, initial = { pt: '', section: '', passage: '' }, spy }: {
  status?: 'loading' | 'ready' | 'failed'; list?: RcIndexPassageWithPt[]; onRetry?: () => void; initial?: RcFinderAddress; spy?: (address: RcFinderAddress) => void;
}) {
  const [address, setAddress] = React.useState(initial);
  return (
    <div>
      <section aria-labelledby="h"><h3 id="h">Have a passage in mind?</h3>
        <RcPassageFinder passages={list} status={status} onRetry={onRetry} address={address} onAddressChange={next => { spy?.(next); setAddress(next); }} />
      </section>
      <button type="button">Outside</button>
    </div>
  );
}

const input = () => screen.getByRole('combobox', { name: 'Find a passage' });
const activeOption = () => document.getElementById(input().getAttribute('aria-activedescendant') ?? '');

afterEach(() => {
  window.matchMedia = (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
});

describe('RcPassageFinder combobox', () => {
  it('anchors a short upward panel by its bottom and follows parent reflow', () => {
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    let anchorTop = 500;
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return this.classList.contains('rc-finder-instrument')
        ? { x: 40, y: anchorTop, top: anchorTop, left: 40, bottom: anchorTop + 60, right: 440, width: 400, height: 60, toJSON: () => ({}) }
        : originalRect.call(this);
    });
    try {
      const view = render(<Harness />);
      input().focus();
      fireEvent.change(input(), { target: { value: '140 3 1' } });
      fireEvent.keyDown(input(), { key: 'ArrowDown' });
      expect(input()).toHaveAttribute('aria-expanded', 'true');
      const panel = document.querySelector<HTMLElement>('.rc-finder-panel')!;
      expect(panel.style.top).toBe('');
      expect(panel.style.bottom).toBe('208px');
      expect(panel.style.transformOrigin).toBe('bottom center');
      anchorTop = 550;
      view.rerender(<Harness status="loading" />);
      expect(panel.style.bottom).toBe('158px');
    } finally {
      bounds.mockRestore();
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });

  it('names the focusable combobox and wires valid popup references only while open', () => {
    render(<Harness />);
    const field = input();
    expect(field.tagName).toBe('INPUT');
    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(field).not.toHaveAttribute('aria-controls');
    expect(field).not.toHaveAttribute('aria-activedescendant');
    expect(field).toHaveAccessibleDescription(/Type an address like 140 3 1/);
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(field).toHaveAttribute('aria-expanded', 'true');
    const listbox = document.getElementById(field.getAttribute('aria-controls')!);
    expect(listbox).toHaveAttribute('role', 'listbox');
    expect(listbox).toHaveAccessibleName('PrepTests');
    expect(activeOption()).toHaveAttribute('role', 'option');
    expect(within(listbox!).getAllByRole('group').map(group => group.getAttribute('aria-labelledby') && document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent)).toEqual(['110s', '140s', '150s']);
    for (const option of within(listbox!).getAllByRole('option')) expect(document.querySelectorAll(`[id="${option.id}"]`)).toHaveLength(1);
  });

  it('keeps the highlighted option distinct from the committed one', () => {
    render(<Harness initial={{ pt: '140', section: '3', passage: '1' }} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options.map(option => option.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    // The first arrow lands on the committed passage; the next moves only the highlight.
    expect(activeOption()).toBe(options[0]);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(activeOption()).toBe(options[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('data-highlighted', 'true');
    expect(options[0]).toHaveAttribute('data-chosen', 'true');
    expect(options[0]).not.toHaveAttribute('data-highlighted');
  });

  it('steps PrepTest, section and passage with the keyboard, then closes with focus kept', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    input().focus();
    fireEvent.change(input(), { target: { value: '152' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith({ pt: '152', section: '', passage: '' });
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Sections in PT 152');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith({ pt: '152', section: '4', passage: '' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith({ pt: '152', section: '4', passage: '1' });
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(input());
    expect(screen.getByRole('status')).toHaveTextContent('PT 152 · Section 4 · Passage 1 Legal positivism');
  });

  it('clears per level with Backspace and the status actions', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ pt: '140', section: '3', passage: '1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change passage' }));
    expect(spy).toHaveBeenLastCalledWith({ pt: '140', section: '3', passage: '' });
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(spy).toHaveBeenLastCalledWith({ pt: '140', section: '', passage: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(spy).toHaveBeenLastCalledWith({ pt: '', section: '', passage: '' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes on Escape, then clears the typed text on a second Escape', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'law' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('law');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).toHaveValue('');
  });

  it('closes on a press outside without committing anything', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.change(input(), { target: { value: '140' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('chooses with a pointer and keeps focus in the field while doing it', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ pt: '140', section: '3', passage: '' }} />);
    input().focus();
    fireEvent.click(screen.getByRole('button', { name: 'Browse the passage index' }));
    const option = screen.getByRole('option', { name: /The history of public libraries/ });
    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);
    expect(spy).toHaveBeenLastCalledWith({ pt: '140', section: '3', passage: '2' });
    expect(document.activeElement).toBe(input());
  });

  it('never reads opening words, and labels each result with metadata only', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'volcanoes' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(/No passage titles or topics match/)).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: 'marine' } });
    const [option] = screen.getAllByRole('option');
    expect(option).toHaveAccessibleName('Marine ecosystems, PT 140 Section 3 Passage 1, Natural Science, 7 questions');
    expect(document.body).not.toHaveTextContent('Hidden opening sentence');
  });

  it('shows loading and a retryable failure inside the index instead of an empty list', () => {
    const retry = vi.fn();
    const { rerender } = render(<Harness status="loading" list={[]} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getByText('Loading the passage index…')).toBeInTheDocument();
    rerender(<Harness status="failed" list={[]} onRetry={retry} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading passages' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('announces result counts politely after typing settles', () => {
    vi.useFakeTimers();
    try {
      render(<Harness />);
      fireEvent.change(input(), { target: { value: '140 3 1' } });
      act(() => { vi.advanceTimersByTime(300); });
      expect(screen.getByText('Exact address found. Press Enter to choose it.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RcPassageFinder phone sheet', () => {
  it('opens a modal sheet, traps the search inside it and returns focus to its trigger', async () => {
    window.matchMedia = (query: string) => ({ matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const trigger = screen.getByRole('button', { name: /Find a passage/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    const sheet = await screen.findByRole('dialog', { name: 'Find a passage' });
    expect(sheet).toHaveAccessibleDescription('3 PrepTests · 119–152');
    expect(document.activeElement).toBe(within(sheet).getByRole('combobox', { name: 'Find a passage' }));
    fireEvent.change(input(), { target: { value: '140 3 2' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith({ pt: '140', section: '3', passage: '2' });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Radix restores focus on the next task after the sheet unmounts.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Find a passage/ })));
    fireEvent.click(screen.getByRole('button', { name: /Find a passage/ }));
    const reopened = await screen.findByRole('dialog', { name: 'Find a passage' });
    fireEvent.keyDown(within(reopened).getByRole('combobox'), { key: 'Escape' });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Find a passage/ })));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
