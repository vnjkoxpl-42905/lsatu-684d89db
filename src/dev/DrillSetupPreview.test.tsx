import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DrillSetupPreview from './DrillSetupPreview';

vi.mock('@/contexts/QuestionBankContext', () => ({
  QuestionBankProvider: ({ children }: { children: ReactNode }) => children,
  useQuestionBank: () => ({ manifest: {}, isLoading: false, error: null }),
}));

vi.mock('@/components/drill/QuestionPicker', () => ({
  QuestionPicker: ({ onCancel }: { onCancel: () => void }) => (
    <button type="button" onClick={onCancel}>Back to practice options</button>
  ),
}));

describe('DrillSetupPreview navigation', () => {
  it('returns to the default Drill page and can reopen setup', () => {
    render(<MemoryRouter><DrillSetupPreview /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Back to practice options' }));
    expect(screen.getByRole('heading', { name: 'Smart Drill' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your practice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assigned work' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set up an LR drill' }));
    expect(screen.getByRole('button', { name: 'Back to practice options' })).toBeInTheDocument();
  });
});
