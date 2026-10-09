import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConditionalPracticeRoom } from './ConditionalPractice';
import { readCachedRuns } from './practiceStore';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({}) }));
vi.mock('../hooks/useStudentActivities', () => ({ useStudentActivities: () => ({ assignments: [] }) }));

function mount(path = '/conditional-lab') {
  return render(<MemoryRouter initialEntries={[path]}><ConditionalPracticeRoom userId="test-user" localOnly /></MemoryRouter>);
}
function beginMissingLink() {
  const card = screen.getByRole('heading', { name: 'Missing Link' }).closest('section')!;
  fireEvent.click(within(card).getByRole('button', { name: /Open drill/ }));
  fireEvent.click(screen.getByRole('button', { name: /Start practice/ }));
}

describe('conditional practice workflow', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('shows individual links, hides explanation until resolved, and restores selection after reopening', () => {
    const view = mount();
    beginMissingLink();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /I've diagrammed it/ }));
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    const run = readCachedRuns('test-user')[0];
    const question = run.questions[0];
    expect(document.querySelector('.conditional-explanation')).toBeNull();
    const wrong = question.choices.findIndex(c => c.id !== question.correctChoiceId);
    fireEvent.click(screen.getAllByRole('radio')[wrong]);
    view.unmount();
    mount(`/conditional-lab?run=${run.id}`);
    expect(screen.getAllByRole('radio')[wrong]).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(document.querySelector('.conditional-explanation')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(document.querySelector('.conditional-explanation')).toHaveTextContent('The completed chain is A → B → C.');
    const saved = readCachedRuns('test-user')[0];
    expect(saved.answers.map(a => [a.verdict, a.revealed])).toEqual([['incorrect', false], [null, true]]);
  });

  it('keeps the first attempt when correcting an answer and starts a separate session', () => {
    mount();
    beginMissingLink();
    fireEvent.click(screen.getByRole('button', { name: /I've diagrammed it/ }));
    const run = readCachedRuns('test-user')[0];
    const q = run.questions[0];
    fireEvent.click(screen.getAllByRole('radio')[q.choices.findIndex(c => c.id !== q.correctChoiceId)]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getAllByRole('radio')[q.choices.findIndex(c => c.id === q.correctChoiceId)]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(readCachedRuns('test-user')[0].answers.map(a => a.verdict)).toEqual(['incorrect', 'correct']);
    fireEvent.click(screen.getByRole('button', { name: 'Conditional drills' }));
    beginMissingLink();
    const saved = readCachedRuns('test-user');
    expect(saved).toHaveLength(2);
    expect(saved.find(r => r.id === run.id)?.answers).toHaveLength(2);
    expect(saved.find(r => r.id !== run.id)?.answers).toHaveLength(0);
  });
});
