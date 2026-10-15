import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuestionBankProvider, useQuestionBank } from './QuestionBankContext';

const load = vi.fn(() => Promise.resolve());
const isReady = vi.fn(() => false);

vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    load: () => load(),
    isReady: () => isReady(),
    getManifest: () => ({ sections: [] }),
  },
}));

function Consumer() {
  const { isLoading } = useQuestionBank();
  return <div data-testid="state">{isLoading ? 'loading' : 'ready'}</div>;
}

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <QuestionBankProvider>
        <Consumer />
      </QuestionBankProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  load.mockClear();
  isReady.mockReturnValue(false);
});

describe('QuestionBankProvider route gating', () => {
  // The whole point of the change: the Activity Centre never reads the bank, so
  // it must not pay 5.5MB and ~111ms of parse for it.
  it.each([
    '/activities',
    '/activities/abc-123',
    '/activities/preview/some-activity',
    '/activity-lab',
    '/auth',
  ])('does not load the bank on %s', async (pathname) => {
    renderAt(pathname);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    expect(load).not.toHaveBeenCalled();
  });

  // Every other route keeps exactly the behaviour it had before. This is the
  // denylist's safety property, so it is asserted rather than assumed.
  it.each([
    '/drill',
    '/classroom',
    '/classroom/drill',
    '/journal',
    '/journal/pt120-s1-q7',
    '/flagged',
    '/flagged/pt120-s1-q7',
    '/analytics',
    '/sets',
    '/teacher/library/guided-drills',
    '/teacher/library/homework/set-1',
    '/bootcamp/principle-flaw',
    '/bootcamp/fallacy-flaw',
    '/bootcamp/intro-to-lr/hard-sentences/capstone',
    '/guided/assignment-1',
    '/guided-drills/some-slug',
  ])('still loads the bank on %s', async (pathname) => {
    renderAt(pathname);
    await waitFor(() => expect(load).toHaveBeenCalled());
  });

  // A near-miss must not be swallowed by the prefix match.
  it('treats /activities-archive as a normal route', async () => {
    renderAt('/activities-archive');
    await waitFor(() => expect(load).toHaveBeenCalled());
  });

  // Regression guard: consumers gate direct questionBank.getQuestion() calls on
  // isLoading, so a first render of false with an empty bank flashes "not found".
  it('starts in the loading state on a consumer route', () => {
    renderAt('/drill');
    expect(screen.getByTestId('state')).toHaveTextContent('loading');
  });

  it('never enters the loading state on a bank-free route', () => {
    renderAt('/activities/abc-123');
    expect(screen.getByTestId('state')).toHaveTextContent('ready');
  });

  it('loads when navigating from a bank-free route into a consumer route', async () => {
    // MemoryRouter only reads initialEntries on mount, so this has to be a real
    // in-app navigation rather than a rerender with different props.
    function GoToDrill() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/drill')}>go</button>;
    }

    render(
      <MemoryRouter initialEntries={['/activities/abc-123']}>
        <QuestionBankProvider>
          <Consumer />
          <GoToDrill />
        </QuestionBankProvider>
      </MemoryRouter>,
    );
    expect(load).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    await waitFor(() => expect(load).toHaveBeenCalled());
  });
});
