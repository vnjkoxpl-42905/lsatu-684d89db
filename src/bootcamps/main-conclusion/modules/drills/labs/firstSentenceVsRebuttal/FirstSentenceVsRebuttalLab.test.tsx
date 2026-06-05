import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FirstSentenceVsRebuttalLab } from './FirstSentenceVsRebuttalLab';

vi.mock('@/bootcamps/main-conclusion/hooks/useUser', () => ({
  useUser: () => ({ id: 'student-1' }),
}));

vi.mock('@/bootcamps/main-conclusion/hooks/useModuleProgress', () => ({
  useModuleProgress: () => ({ markDrillComplete: vi.fn() }),
}));

vi.mock('@/bootcamps/main-conclusion/persistence/factory', () => ({
  getPersistence: () => ({
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  }),
}));

function renderLab() {
  return render(
    <MemoryRouter>
      <FirstSentenceVsRebuttalLab drillId="first-sentence-vs-rebuttal-lab" title="First Sentence vs Rebuttal" />
    </MemoryRouter>,
  );
}

function feedbackStatus(message: RegExp) {
  const feedback = screen.getByText(message).closest('[role="status"]');
  expect(feedback).not.toBeNull();
  return feedback as HTMLElement;
}

describe('FirstSentenceVsRebuttalLab feedback', () => {
  it('shows obvious warning, success, and wrong feedback with target-state classes', async () => {
    renderLab();

    const continueButton = await screen.findByRole('button', { name: /continue to conclusion/i });
    await waitFor(() => expect(screen.getByText('Saved')).toHaveClass('fsvr-lab__save-status--visible'));

    fireEvent.click(continueButton);

    const warning = feedbackStatus(/choose an answer first/i);
    expect(warning).toHaveAttribute('aria-live', 'polite');
    expect(warning).toHaveClass('fsvr-lab__feedback--warning');

    const indicator = screen.getByRole('button', { name: /mark indicator word should/i });
    fireEvent.click(indicator);

    const success = feedbackStatus(/correct\. move to the next step/i);
    expect(success).toHaveClass('fsvr-lab__feedback--correct');
    expect(indicator).toHaveClass('fsvr-lab__indicator--success');

    const plainWord = screen.getByRole('button', { name: /check word obtaining/i });
    fireEvent.click(plainWord);

    const error = feedbackStatus(/hint:/i);
    expect(error).toHaveClass('fsvr-lab__feedback--wrong');
    expect(plainWord).toHaveClass('fsvr-lab__plain-word--miss');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1900));
    });
  });
});
