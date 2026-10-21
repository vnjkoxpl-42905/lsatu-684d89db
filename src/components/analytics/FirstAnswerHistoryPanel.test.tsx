import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FirstAnswerHistoryPanel from './FirstAnswerHistoryPanel';

vi.mock('@/hooks/useFirstAnswerProgress', () => ({
  useFirstAnswerProgress: () => ({
    ledger: {
      answers: [
        { attemptId: 'first', questionKey: 'PT1:Q1', area: 'LR', source: 'question_attempts', mode: 'drill', correct: true, gradedAt: '2026-09-27T14:00:00Z' },
        { attemptId: 'repeat', questionKey: 'PT1:Q1', area: 'LR', source: 'question_attempts', mode: 'drill', correct: false, gradedAt: '2026-09-28T14:00:00Z' },
        { attemptId: 'rc', questionKey: 'PT1:Q2', area: 'RC', source: 'rc_question_attempts', mode: 'rc-drill', correct: true, gradedAt: '2026-09-28T16:00:00Z' },
      ],
      coverage: { includedSources: ['question_attempts', 'rc_question_attempts'], missingSources: [], excludedRows: {} },
    },
    loading: false,
    error: null,
    resolution: { state: 'ready' },
    refresh: vi.fn(),
  }),
}));

describe('Saved answer history date groups', () => {
  it('groups same-day answers under one heading and preserves filter counts', () => {
    render(<MemoryRouter><FirstAnswerHistoryPanel window="all" /></MemoryRouter>);

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('September 28, 2026');
    expect(within(screen.getByRole('region', { name: 'September 28, 2026' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('3 saved answers match these filters.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'History answer' }), { target: { value: 'repeat' } });
    expect(screen.getByText('1 saved answer match these filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getByText('Missed · Repeat')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'History area' }), { target: { value: 'RC' } });
    expect(screen.getByText('0 saved answers match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
