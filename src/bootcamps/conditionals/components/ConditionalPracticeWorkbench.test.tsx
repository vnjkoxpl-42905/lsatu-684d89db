import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConditionalPracticeWorkbench } from './ConditionalPracticeWorkbench';
import { conditionalPracticeSetupKey } from './practiceSetupState';
import { CONDITIONAL_ACTIVITIES, conditionalActivityAllowed, conditionalActivitySearch, normalizeConditionalActivityConfig, type ConditionalActivityConfig } from '../activityRegistry';

const full = { target: { scope: 'course' }, unitIds: [] };
const g3 = { target: { scope: 'skill', difficulty: 'beginner' }, unitIds: ['group-3'] };
const key = conditionalPracticeSetupKey('student', 'assignment', 'edition');
const normalized = (value: ConditionalActivityConfig) => normalizeConditionalActivityConfig(value)!;
const href = (value: ConditionalActivityConfig) => `/centre/${value.activity}?assignment=assignment&edition=edition&${conditionalActivitySearch(value)}`;
const defaults = CONDITIONAL_ACTIVITIES.map(item => normalized({ activity: item.id }));
function mount(extra: Partial<Parameters<typeof ConditionalPracticeWorkbench>[0]> = {}) {
  return render(<MemoryRouter><ConditionalPracticeWorkbench defaults={defaults} permits={value => conditionalActivityAllowed(full, value)} href={href} storageKey={key} {...extra}/></MemoryRouter>);
}
function choose(title: string) { fireEvent.click(screen.getByRole('button', { name: title })); }
function select(label: string, option: string) {
  const field = screen.getByRole('combobox', { name: label });
  const match = Array.from(field.querySelectorAll('option')).find(item => item.textContent === option)!;
  expect(match).toBeTruthy();
  fireEvent.change(field, { target: { value: match.value } });
}
function start(label = 'Start activity') { return new URL(screen.getByRole('link', { name: label }).getAttribute('href')!, 'https://local.test'); }
beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

describe('conditional practice setup', () => {
  it('converts original Rephrase progression to untimed when narrowing topic', () => {
    mount();
    const topic = screen.getByRole('combobox', { name: 'Topic' });
    const group = Array.from(topic.querySelectorAll('option')).find(option => option.textContent?.startsWith('Group 3'))!;
    fireEvent.change(topic, { target: { value: group.value } });
    expect(start().searchParams.get('groups')).toBe('g3');
    expect(start().searchParams.get('timing')).toBe('untimed');
    expect(screen.queryByRole('option', { name: 'Untimed, then timed' })).toBeNull();
  });
  it('fixes hard sentences at Advanced and restores the default level on leaving that mode', () => {
    mount(); choose('Conditional bank practice');
    select('Level', 'Medium'); select('Mode', 'Hard sentences');
    expect(start().searchParams.get('difficulty')).toBe('advanced');
    expect(screen.queryByRole('combobox', { name: 'Level' })).toBeNull();
    expect(screen.getByText('Advanced', { selector: '.cpw-static' })).toBeVisible();
    select('Mode', 'Skill practice');
    expect(start().searchParams.get('difficulty')).toBe('beginner');
    expect(screen.getByRole('combobox', { name: 'Level' })).toBeVisible();
  });
  it('shows exact focused settings as fixed and rejects forbidden cached widening', () => {
    const fixed = normalized({ activity: 'missing-links', level: 'words' });
    sessionStorage.setItem(key, JSON.stringify({ selected: 'missing-links', drafts: { 'missing-links': { activity: 'missing-links', level: 'all' } } }));
    const grant = { target: { scope: 'activity', activityId: 'missing-links', activitySettings: { level: 'words' } }, unitIds: [] };
    mount({ defaults: [fixed], permits: value => conditionalActivityAllowed(grant, value) });
    expect(start().searchParams.get('level')).toBe('words');
    expect(screen.queryByRole('combobox', { name: 'Question format' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Conditional Rephrase' })).toBeNull();
  });
  it('retains only Group 3 choices and falls back from a forbidden cached activity', () => {
    sessionStorage.setItem(key, JSON.stringify({ selected: 'guided', drafts: { rephrase: normalized({ activity: 'rephrase' }) } }));
    const choices = [normalized({ activity: 'rephrase', groups: ['g3'], timing: 'untimed' }), normalized({ activity: 'diagram', groups: ['g3'] }), normalized({ activity: 'translate-cards', groups: ['g3'] }), normalized({ activity: 'unless' })];
    mount({ defaults: choices, permits: value => conditionalActivityAllowed(g3, value) });
    expect(start().searchParams.get('groups')).toBe('g3');
    expect(screen.queryByRole('combobox', { name: 'Topic' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guided LSAT questions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sort indicator words' })).toBeNull();
  });
  it('restores each activity draft and selected activity after remount', () => {
    const view = mount(); choose('Missing Links'); select('Question format', 'Words');
    choose('Diagram practice'); select('Task', 'Build the contrapositive');
    view.unmount(); const restored = mount();
    expect(screen.getByRole('button', { name: 'Diagram practice' })).toHaveAttribute('aria-pressed', 'true');
    expect(start().searchParams.get('stage')).toBe('contrapositive');
    choose('Missing Links'); expect(start().searchParams.get('level')).toBe('words');
    restored.unmount();
  });
  it('isolates drafts by actor, assignment and edition', () => {
    const keys = [key, conditionalPracticeSetupKey('other', 'assignment', 'edition'), conditionalPracticeSetupKey('student', 'other', 'edition'), conditionalPracticeSetupKey('student', 'assignment', 'other')];
    expect(new Set(keys).size).toBe(4);
    const view = mount(); choose('Missing Links'); select('Question format', 'Words'); view.unmount();
    for (const storageKey of keys.slice(1)) { const next = mount({ storageKey }); expect(start().pathname).toBe('/centre/rephrase'); next.unmount(); }
  });
  it('recovers from corrupt cache without losing the available setup', () => {
    sessionStorage.setItem(key, '{broken'); mount();
    expect(start().pathname).toBe('/centre/rephrase');
  });
  it('keeps setup usable when storage reads and writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    mount(); choose('Missing Links'); select('Question format', 'Words');
    expect(start().searchParams.get('level')).toBe('words');
  });
  it('opens guided selection at its entrance without starting an attempt', () => {
    mount(); choose('Guided LSAT questions');
    expect(start('Open question sets').searchParams.has('view')).toBe(false);
    select('Question set', 'Easier set 1');
    expect(start('Open selected set').searchParams.get('set')).toBe('w2-04-conditional-logic-easier-set-1');
    expect(start('Open selected set').searchParams.has('view')).toBe(false);
  });
  it('delegates Unless timing and start to its native entrance', () => {
    mount(); choose('Unless Drill');
    expect(start('Open Unless Drill').pathname).toBe('/centre/unless');
    expect(screen.queryByRole('combobox', { name: 'Timing' })).toBeNull();
    expect(screen.getByText(/The drill guides you through its four forms/)).toBeVisible();
    expect(start('Open Unless Drill').searchParams.has('view')).toBe(false);
  });
});
