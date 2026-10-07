import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FirstAnswerHistoryPanel from './FirstAnswerHistoryPanel';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';

vi.mock('@/hooks/useFirstAnswerProgress', () => ({
  useFirstAnswerProgress: vi.fn(() => ({
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
  })),
}));

describe('Saved answer history date groups', () => {
  it('keeps URL filters in the detailed table and exposes saved source IDs', () => {
    render(<MemoryRouter initialEntries={['/progress/history?historyAnswer=repeat&historySort=oldest']}><FirstAnswerHistoryPanel window="all" /></MemoryRouter>);
    expect(screen.getByRole('combobox', { name: 'History answer' })).toHaveValue('repeat');
    fireEvent.click(screen.getByRole('button', { name: 'Detailed table' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('repeat')).toBeInTheDocument();
    expect(within(table).queryByText('first')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'History mode' }), { target: { value: 'rc-drill' } });
    expect(screen.getByText('0 saved answers match these filters.')).toBeInTheDocument();
  });
  it('passes the selected student scope and returns to that dossier Review', () => {
    render(<MemoryRouter initialEntries={['/teacher/students/student-2/progress']}><Routes><Route path="teacher/students/:studentId"><Route path="progress" element={<FirstAnswerHistoryPanel window={14} studentId="student-2" />} /></Route></Routes></MemoryRouter>);
    expect(useFirstAnswerProgress).toHaveBeenCalledWith(14, 'student-2');
    expect(screen.getByRole('link', { name: 'Open Review' })).toHaveAttribute('href', '/teacher/students/student-2/review');
    expect(screen.queryByRole('link', { name: 'Practice questions' })).not.toBeInTheDocument();
  });
  it('shows stale URL filters visibly so they can be cleared', () => {
    render(<MemoryRouter initialEntries={['/progress/history?historyTopic=Flaw']}><FirstAnswerHistoryPanel window="all" /></MemoryRouter>);
    expect(screen.getByRole('combobox', { name: 'History topic' })).toHaveValue('Flaw');
    expect(screen.getByRole('option', { name: 'Flaw (no rows in this window)' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'History topic' }), { target: { value: 'all' } });
    expect(screen.getByText('3 saved answers match these filters.')).toBeInTheDocument();
  });
  it('uses the table for global question sorting and restores date order for grouping', () => {
    render(<MemoryRouter initialEntries={['/progress/history?historySort=question']}><FirstAnswerHistoryPanel window="all" /></MemoryRouter>);
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grouped list' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'History order' })).toHaveValue('newest');
  });
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
