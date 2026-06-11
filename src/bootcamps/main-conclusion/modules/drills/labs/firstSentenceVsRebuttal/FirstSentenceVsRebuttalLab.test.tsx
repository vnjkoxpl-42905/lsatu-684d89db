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
  it('confirms correct selections before advancing to the next step', async () => {
    renderLab();

    const continueButton = await screen.findByRole('button', { name: /continue to conclusion/i });
    await waitFor(() => expect(screen.getByText('Saved')).toHaveClass('fsvr-lab__save-status--visible'));

    fireEvent.click(continueButton);

    const warning = feedbackStatus(/choose an answer first/i);
    expect(warning).toHaveAttribute('aria-live', 'polite');
    expect(warning).toHaveClass('fsvr-lab__feedback--warning');

    const indicator = screen.getByRole('button', { name: /mark indicator word should/i });
    fireEvent.click(indicator);

    const success = feedbackStatus(/correct\. next: choose the main conclusion/i);
    expect(success).toHaveClass('fsvr-lab__feedback--correct');
    expect(indicator).toHaveClass('fsvr-lab__indicator--success');
    expect(screen.getByText(/identify the indicator words/i)).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1900));
    });
    expect(feedbackStatus(/correct\. next: choose the main conclusion/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next: choose the main conclusion/i }));

    expect(screen.getByText(/select the main conclusion/i)).toBeInTheDocument();

    const conclusionPart = screen.getAllByLabelText(/select this phrase/i)[0];
    fireEvent.keyDown(conclusionPart, { key: 'Enter' });

    const conclusionSuccess = feedbackStatus(/correct\. next: classify the structure/i);
    expect(conclusionSuccess).toHaveClass('fsvr-lab__feedback--correct');
    expect(screen.getByText(/select the main conclusion/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next: classify the structure/i }));

    expect(screen.getByText(/classify the argument structure/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /first sentence conclusion/i }));

    const structureSuccess = feedbackStatus(/correct\. next: find the supporting or opposing part/i);
    expect(structureSuccess).toHaveClass('fsvr-lab__feedback--correct');
    expect(screen.getByText(/classify the argument structure/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next: find the supporting or opposing part/i }));

    expect(screen.getByText(/finish the dissection/i)).toBeInTheDocument();
  });

  it('keeps warnings and wrong-answer feedback obvious without advancing', async () => {
    renderLab();

    const continueButton = await screen.findByRole('button', { name: /continue to conclusion/i });
    await waitFor(() => expect(screen.getByText('Saved')).toHaveClass('fsvr-lab__save-status--visible'));

    fireEvent.click(continueButton);

    const warning = feedbackStatus(/choose an answer first/i);
    expect(warning).toHaveAttribute('aria-live', 'polite');
    expect(warning).toHaveClass('fsvr-lab__feedback--warning');

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
