import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConditionalPracticeRoom, generalPracticeResumeUrl } from './ConditionalPractice';
import { createPracticeRun, readCachedRuns } from './practiceStore';
import { CONDITIONAL_QUESTIONS } from './content';

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
  beforeEach(() => { localStorage.clear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
  afterEach(cleanup);
  it('continues a bootcamp-created General session through the current canonical grant URL, preserving its settings', () => {
    const saved = createPracticeRun('test-user', 'general', [], { sourceUrl: '/bootcamp/conditionals/centre/rephrase', collectionId: 'conditional-rephrase', items: [{ order: 1, prompt: 'If A, then B.', credited_answers: ['If A, then B.'], explanation: 'A is sufficient.' }] });
    const currentUrl = '/bootcamp/conditionals/centre/rephrase?assignment=current-grant&groups=g3&timing=untimed';
    function Address() { const location = useLocation(); return <span data-testid="resume-address">{location.pathname}{location.search}</span>; }
    render(<MemoryRouter initialEntries={['/activities/conditionals']}><ConditionalPracticeRoom userId="test-user" localOnly generalUrl={currentUrl}/><Address/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Continue saved practice' }));
    expect(screen.getByTestId('resume-address')).toHaveTextContent(`${currentUrl}&practiceRun=${saved.id}`);
    expect(readCachedRuns('test-user')[0].general!.sourceUrl).toBe('/bootcamp/conditionals/centre/rephrase');
    expect(generalPracticeResumeUrl(saved)).toBeUndefined();
    expect(generalPracticeResumeUrl(saved, 'https://elsewhere.invalid/run')).toBeUndefined();
  });
  it('does not expand an empty selected collection inside the bootcamp', () => {
    function Address() { const location = useLocation(); return <output>{location.search}</output>; }
    render(<MemoryRouter initialEntries={['/bootcamp/conditionals/opening-practice?assignment=course-row&edition=full-conditionals-v3']}><ConditionalPracticeRoom userId="test-user" localOnly embeddedMode="missing-link" selectedQuestionIds={['not-a-current-id']} backUrl="/bootcamp/conditionals" /><Address /></MemoryRouter>);
    // An empty or outdated selected ID cannot silently expand into the whole collection.
    fireEvent.click(screen.getByRole('button', { name: /Start practice/ }));
    expect(readCachedRuns('test-user')).toHaveLength(0);
    expect(screen.getByRole('link', { name: /Back to conditional practice/ })).toHaveAttribute('href', '/bootcamp/conditionals');
    expect(screen.getByText('Preview: saved on this device')).toBeInTheDocument();
    expect(screen.getByText('?assignment=course-row&edition=full-conditionals-v3')).toBeInTheDocument();
  });
  it('freezes the selected questions, preserves the course identity, and resumes its existing snapshot after filter changes', () => {
    const selected = CONDITIONAL_QUESTIONS.find(question => question.mode === 'missing-link')!;
    function Address() { const location = useLocation(); return <span data-testid="address">{location.search}</span>; }
    const view = render(<MemoryRouter initialEntries={['/bootcamp/conditionals/opening-practice?assignment=course-row&edition=full-conditionals-v3']}><ConditionalPracticeRoom userId="test-user" localOnly embeddedMode="missing-link" selectedQuestionIds={[selected.id]} /><Address /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Start practice/ }));
    const saved = readCachedRuns('test-user')[0];
    expect(saved.questions.map(question => question.id)).toEqual([selected.id]);
    expect(screen.getByTestId('address')).toHaveTextContent('assignment=course-row');
    expect(screen.getByTestId('address')).toHaveTextContent('edition=full-conditionals-v3');
    expect(screen.getByTestId('address')).toHaveTextContent(`run=${saved.id}`);
    view.unmount();
    render(<MemoryRouter initialEntries={[`/bootcamp/conditionals/opening-practice?assignment=course-row&run=${saved.id}`]}><ConditionalPracticeRoom userId="test-user" localOnly embeddedMode="missing-link" selectedQuestionIds={[]} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /I've diagrammed it/ })).toBeInTheDocument();
    expect(readCachedRuns('test-user')[0].questions).toEqual(saved.questions);
  });
  it('does not open a broader old session from an exact filtered assignment', () => {
    const questions = CONDITIONAL_QUESTIONS.filter(question => question.mode === 'missing-link').slice(0, 2);
    const saved = createPracticeRun('test-user', 'missing-link', questions);
    render(<MemoryRouter initialEntries={[`/bootcamp/conditionals/opening-practice?run=${saved.id}`]}><ConditionalPracticeRoom userId="test-user" localOnly embeddedMode="missing-link" selectedQuestionIds={[questions[0].id]} allowedQuestionIds={[questions[0].id]} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Session not available' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /I've diagrammed it/ })).not.toBeInTheDocument();
    expect(readCachedRuns('test-user')[0].questions).toHaveLength(2);
  });
  it('renders authored choice explanations as readable paragraphs and a semantic list after checking', () => {
    mount();
    beginMissingLink();
    fireEvent.click(screen.getByRole('button', { name: /I've diagrammed it/ }));
    const question = readCachedRuns('test-user')[0].questions[0];
    fireEvent.click(screen.getAllByRole('radio')[question.choices.findIndex(choice => choice.id === question.correctChoiceId)]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    const explanation = document.querySelector('.conditional-explanation')!;
    expect(within(explanation as HTMLElement).getAllByRole('listitem')).toHaveLength(4);
    expect(explanation.querySelectorAll('p').length).toBeGreaterThan(1);
    expect(within(explanation as HTMLElement).getByText(/Choice A:/)).toBeInTheDocument();
    expect(explanation.querySelectorAll('p')[0]).not.toHaveTextContent('Choice A:');
  });

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
