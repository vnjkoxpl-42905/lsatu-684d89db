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

  it('grades only the designated follow-up, rejecting other same-role parts', async () => {
    // Q1 (vision test) has two support parts but designates p2 (night vision)
    // as the single answer. Clicking the other support sentence (the accident
    // statistic) must flash wrong, not select; clicking the designated one
    // must complete the step.
    renderLab();

    // Step 0 → indicators (tapping the only indicator confirms the step, so the
    // CTA flips straight to "Next: choose the main conclusion").
    await screen.findByRole('button', { name: /continue to conclusion/i });
    await waitFor(() => expect(screen.getByText('Saved')).toHaveClass('fsvr-lab__save-status--visible'));
    fireEvent.click(screen.getByRole('button', { name: /mark indicator word should/i }));
    fireEvent.click(screen.getByRole('button', { name: /next: choose the main conclusion/i }));

    // Step 1 → conclusion is the first phrase
    fireEvent.keyDown(screen.getAllByLabelText(/select this phrase/i)[0], { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /next: classify the structure/i }));

    // Step 2 → first-sentence structure
    fireEvent.click(screen.getByRole('button', { name: /first sentence conclusion/i }));
    fireEvent.click(screen.getByRole('button', { name: /next: find the supporting or opposing part/i }));

    expect(screen.getByText(/finish the dissection/i)).toBeInTheDocument();

    // Wrong same-role part: the accident-statistic sentence (not designated).
    const accidentStat = screen.getByText(/most car accidents occur at night/i).closest('[role="button"]') as HTMLElement;
    fireEvent.click(accidentStat);
    const miss = feedbackStatus(/hint:/i);
    expect(miss).toHaveClass('fsvr-lab__feedback--wrong');
    // It must NOT count as selected.
    expect(screen.getByText(/0 of 1 selected/i)).toBeInTheDocument();

    // Designated part: the night-vision sentence.
    const nightVision = screen.getByText(/many people whose daylight vision is adequate/i).closest('[role="button"]') as HTMLElement;
    fireEvent.click(nightVision);
    expect(screen.getByText(/1 of 1 selected/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /check dissection/i }));
    // Grading the single designated answer completes the question cleanly.
    const graded = feedbackStatus(/clean dissection/i);
    expect(graded).toHaveClass('fsvr-lab__feedback--correct');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1900));
    });
  });
});
