import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseProgressProvider } from '../courseProgress';
import { IdeaBoard, blankBoard, boardCorrect, boardReducer, type BoardState, type TeachingIdea } from './IdeaBoard';

const ideas: [TeachingIdea, TeachingIdea] = [
  { id: 'rain', word: 'Rains', positive: 'it rains', negative: 'it does not rain' },
  { id: 'played', word: 'Played', positive: 'the game is played', negative: 'the game is not played' },
];
const originalNegative: [TeachingIdea, TeachingIdea] = [
  { id: 'opens', word: 'Opens', positive: 'the store opens', negative: 'the store does not open', originalNot: true },
  { id: 'arrives', word: 'Arrives', positive: 'the delivery arrives', negative: 'the delivery does not arrive' },
];
const sentence = 'The game is played unless it rains.';
const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  if (elementFromPointDescriptor) Object.defineProperty(document, 'elementFromPoint', elementFromPointDescriptor);
  else Reflect.deleteProperty(document, 'elementFromPoint');
});
function slot(side: 'if' | 'then') {
  return screen.getByRole('heading', { name: side === 'if' ? 'IF · sufficient condition' : 'THEN · necessary condition' }).closest('[data-idea-side]') as HTMLElement;
}
function ideaCard(index: number) {
  return screen.getAllByRole('button').filter(button => button.hasAttribute('aria-pressed'))[index];
}
function place(index: number, side: 'if' | 'then') {
  fireEvent.click(ideaCard(index));
  fireEvent.click(screen.getByRole('button', { name: `Place on ${side.toUpperCase()}` }));
}
function negate(side: 'if' | 'then') {
  fireEvent.click(screen.getByRole('button', { name: `Negate ${side.toUpperCase()} idea` }));
}
function check() { fireEvent.click(screen.getByRole('button', { name: 'Check this rule' })); }
function storageKeys() { return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!); }
function savedState(): BoardState {
  const key = storageKeys().find(key => key.startsWith('conditional-formative-v1:'));
  expect(key).toBeTruthy();
  return JSON.parse(localStorage.getItem(key!)!);
}
function pointerEvent(type: string, x: number, y: number) {
  return Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }), { pointerId: 1 });
}

describe('two-idea semantic operations', () => {
  it.each([3, 4] as const)('family %s accepts either starting idea with the family-specific negation', family => {
    for (const sides of [[0, 1], [1, 0]] as [number, number][]) {
      const state: BoardState = { ...blankBoard(), sides, negatives: [family === 3, family === 4] };
      expect(boardCorrect(state, ideas, family)).toBe(true);
      expect(boardCorrect({ ...state, negatives: [family === 4, family === 3] }, ideas, family)).toBe(false);
      expect(boardCorrect({ ...state, negatives: [false, false] }, ideas, family)).toBe(false);
      expect(boardCorrect({ ...state, negatives: [true, true] }, ideas, family)).toBe(false);
    }
  });
  it.each([3, 4] as const)('family %s preserves original NOT and accepts its correct double-negation cancellation', family => {
    for (const sides of [[0, 1], [1, 0]] as [number, number][]) {
      expect(boardCorrect({ ...blankBoard(), sides, negatives: [family === 3, family === 4] }, originalNegative, family)).toBe(true);
    }
  });
  it('rejects blank, incomplete and duplicate-idea arrangements', () => {
    expect(boardCorrect(blankBoard(), ideas, 3)).toBe(false);
    expect(boardCorrect({ ...blankBoard(), sides: [0, null] }, ideas, 3)).toBe(false);
    expect(boardCorrect({ ...blankBoard(), sides: [0, 0], negatives: [true, false] }, ideas, 3)).toBe(false);
  });
  it('moves one idea without duplicating it and resets its polarity to its original meaning', () => {
    let state = boardReducer(blankBoard(), { type: 'place', side: 'if', index: 0 });
    state = boardReducer(state, { type: 'negate', side: 'if' });
    state = boardReducer(state, { type: 'place', side: 'then', index: 0 });
    expect(state.sides).toEqual([null, 0]);
    expect(state.negatives).toEqual([false, false]);
  });
});

describe('formative learner workflow', () => {
  it('starts blank, gives an incomplete hint before an explicitly requested reveal, and distinguishes revealed from success', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Show one answer' })).toBeNull();
    expect(screen.queryByText(/If it does not rain, then/)).toBeNull();
    check();
    expect(screen.getByRole('status').textContent).toContain('Place one different idea on each side first.');
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    expect(screen.queryByText(/If it does not rain, then/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show one answer' }));
    expect(screen.getByRole('status').textContent).toContain('One answer, explained');
    expect(screen.getByRole('status').textContent).toContain('If it does not rain, then the game is played.');
    expect(screen.queryByText('This says the same thing.')).toBeNull();
    expect(savedState().status).toBe('revealed');
  });
  it('retains a wrong arrangement for a retry and lets reset return to the original blank task', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    place(0, 'if'); place(1, 'then');
    check();
    expect(savedState()).toMatchObject({ sides: [0, 1], negatives: [false, false], status: 'hint', misses: 1 });
    expect(within(slot('if')).getByText('it rains')).toBeTruthy();
    expect(within(slot('then')).getByText('the game is played')).toBeTruthy();
    expect(screen.queryByText(/If it does not rain, then/)).toBeNull();
    negate('if'); check();
    expect(screen.getByRole('status').textContent).toContain('This says the same thing.');
    expect(savedState()).toMatchObject({ status: 'success', misses: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    expect(savedState()).toEqual(blankBoard());
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toBe('');
  });
  it('shows removal of original NOT in the word, full idea and successful readback', () => {
    render(<IdeaBoard sentence="The store does not open unless the delivery arrives." ideas={originalNegative} family={3}/>);
    place(0, 'if');
    expect(slot('if').querySelector('[data-negated="true"]')).toBeTruthy();
    negate('if');
    expect(slot('if').querySelector('[data-negated="false"]')).toBeTruthy();
    expect(within(slot('if')).getByText('the store opens')).toBeTruthy();
    place(1, 'then'); check();
    expect(screen.getByRole('status').textContent).toContain('If the store opens, then the delivery arrives.');
    expect(savedState().status).toBe('success');
  });
  it('gives Group 4 its different THEN-negation operation and accepts the alternate orientation', () => {
    render(<IdeaBoard sentence="Rain and a played game cannot occur together in this example." ideas={ideas} family={4}/>);
    place(1, 'if'); place(0, 'then'); negate('if'); check();
    expect(screen.getByRole('status').textContent).toContain('Keep the IF idea as stated.');
    negate('if'); negate('then'); check();
    expect(screen.getByRole('status').textContent).toContain('If the game is played, then it does not rain.');
    expect(savedState().status).toBe('success');
  });
  it('keeps selection, placement, negation and checking reachable as native focusable buttons', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    expect(screen.getByRole('button', { name: 'Place on IF' })).toHaveProperty('disabled', true);
    const first = ideaCard(0);
    expect(first.tagName).toBe('BUTTON');
    expect(first.tabIndex).toBe(0);
    first.focus(); expect(document.activeElement).toBe(first);
    // jsdom does not perform the browser's native Enter/Space button activation.
    // Click exercises onClick; the host browser matrix verifies real keyboard input.
    fireEvent.click(first);
    const placement = screen.getByRole('button', { name: 'Place on IF' });
    placement.focus(); expect(document.activeElement).toBe(placement);
    expect(placement).toHaveProperty('disabled', false);
    fireEvent.click(placement);
    for (const name of ['Negate IF idea', 'Check this rule', 'Reset board']) {
      const button = screen.getByRole('button', { name });
      expect(button.tagName).toBe('BUTTON'); expect(button.tabIndex).toBe(0);
      button.focus(); expect(document.activeElement).toBe(button);
    }
    expect(slot('if').querySelector('[aria-live="polite"]')?.textContent).toContain('it rains');
  });
});

describe('drag input uses the same placement state as clicks', () => {
  it('pointer dragging retains original polarity and moves without duplicates', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    let target: Element | null = slot('if');
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target });
    function drag() { fireEvent(ideaCard(0), pointerEvent('pointerdown', 10, 10)); fireEvent(ideaCard(0), pointerEvent('pointermove', 50, 50)); fireEvent(ideaCard(0), pointerEvent('pointerup', 100, 100)); }
    drag();
    expect(savedState()).toMatchObject({ sides: [0, null], negatives: [false, false] });
    negate('if');
    target = slot('then'); drag();
    expect(savedState()).toMatchObject({ sides: [null, 0], negatives: [false, false] });
    target = null; drag();
    expect(savedState().sides).toEqual([null, 0]);
    place(1, 'if'); negate('if'); check();
    expect(savedState().status).toBe('success');
  });
  it('pointer drops and click placement produce the same arrangement', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => slot('if')) });
    fireEvent(ideaCard(0), pointerEvent('pointerdown', 10, 10));
    fireEvent(ideaCard(0), pointerEvent('pointerup', 100, 100));
    expect(savedState().sides).toEqual([0, null]);
    negate('if'); place(1, 'then'); check();
    expect(savedState().status).toBe('success');
  });
  it('a cancelled pointer drag and a short tap leave placement unchanged', () => {
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => slot('then')) });
    fireEvent(ideaCard(0), pointerEvent('pointerdown', 10, 10));
    fireEvent(ideaCard(0), pointerEvent('pointercancel', 50, 50));
    fireEvent(ideaCard(0), pointerEvent('pointerup', 100, 100));
    expect(savedState().sides).toEqual([null, null]);
    fireEvent(ideaCard(0), pointerEvent('pointerdown', 10, 10));
    fireEvent(ideaCard(0), pointerEvent('pointerup', 12, 12));
    expect(savedState().sides).toEqual([null, null]);
  });
});

describe('formative persistence stays separate from earned course work', () => {
  it('starts repair blank after the same sentence was solved in a core check', () => {
    const view = render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    place(0, 'if'); negate('if'); place(1, 'then'); check();
    expect(screen.getByText('This says the same thing.')).toBeTruthy();
    view.rerender(<IdeaBoard sentence={sentence} ideas={ideas} family={3} instanceId="repair-3"/>);
    expect(screen.queryByText('This says the same thing.')).toBeNull();
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    place(0, 'if');
    view.rerender(<IdeaBoard sentence={sentence} ideas={ideas} family={3} instanceId="paragraph-3"/>);
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    view.rerender(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    expect(screen.getByText('This says the same thing.')).toBeTruthy();
  });
  it.each([
    ['success with empty sides', { ...blankBoard(), status: 'success' }],
    ['revealed with empty sides', { ...blankBoard(), status: 'revealed' }],
    ['duplicate placed ideas', { ...blankBoard(), sides: [0, 0], status: 'success' }],
    ['invalid selection', { ...blankBoard(), selected: 8, sides: [0, 1], negatives: [true, false], status: 'success' }],
    ['invalid miss count', { ...blankBoard(), misses: -1, status: 'success' }],
    ['malformed side list', { ...blankBoard(), sides: { length: 2 }, status: 'success' }],
  ])('safely recovers %s without rendering a claimed success', (_label, saved) => {
    localStorage.setItem(`conditional-formative-v1:preview:3:${sentence}`, JSON.stringify(saved));
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    expect(screen.queryByText('This says the same thing.')).toBeNull();
    expect(screen.queryByText('One answer, explained')).toBeNull();
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    expect(savedState()).toEqual(blankBoard());
  });
  it('downgrades a complete but semantically wrong saved success while retaining the arrangement for correction', () => {
    localStorage.setItem(`conditional-formative-v1:preview:3:${sentence}`, JSON.stringify({
      ...blankBoard(), sides: [0, 1], negatives: [false, false], status: 'success', misses: 2,
    }));
    render(<IdeaBoard sentence={sentence} ideas={ideas} family={3}/>);
    expect(screen.queryByText('This says the same thing.')).toBeNull();
    expect(savedState()).toMatchObject({ sides: [0, 1], negatives: [false, false], status: 'editing', misses: 2 });
    expect(within(slot('if')).getByText('it rains')).toBeTruthy();
    negate('if'); check();
    expect(savedState().status).toBe('success');
  });
  it('reloads its draft and successful state without writing course progress', () => {
    const save = vi.fn();
    const ui = <CourseProgressProvider store={{ storageScope: 'student-one', steps: {}, save }}><IdeaBoard sentence={sentence} ideas={ideas} family={3}/></CourseProgressProvider>;
    const firstRender = render(ui);
    place(0, 'if'); negate('if'); place(1, 'then'); check();
    const original = savedState();
    firstRender.unmount();
    render(ui);
    expect(savedState()).toEqual(original);
    expect(screen.getByRole('status').textContent).toContain('This says the same thing.');
    expect(save).not.toHaveBeenCalled();
    expect(storageKeys().every(key => key.startsWith('conditional-formative-v1:'))).toBe(true);
  });
  it('isolates accounts and different board tasks rather than carrying a success to a fresh task', () => {
    const save = vi.fn();
    const ui = (storageScope: string, task = sentence) => <CourseProgressProvider store={{ storageScope, steps: {}, save }}><IdeaBoard sentence={task} ideas={ideas} family={3}/></CourseProgressProvider>;
    const view = render(ui('student-one'));
    place(0, 'if'); negate('if'); place(1, 'then'); check();
    view.rerender(ui('student-two'));
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    view.rerender(ui('student-one'));
    expect(screen.getByRole('status').textContent).toContain('This says the same thing.');
    view.rerender(ui('student-one', 'A fresh sentence with the same two ideas.'));
    expect(screen.getAllByText('Place an idea here')).toHaveLength(2);
    expect(save).not.toHaveBeenCalled();
  });
});
