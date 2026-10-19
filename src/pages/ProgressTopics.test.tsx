import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProgressTopics from './ProgressTopics';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/hooks/useFirstAnswerProgress', () => ({ useFirstAnswerProgress: read }));
vi.mock('@/hooks/useProgressWindow', () => ({ useProgressWindow: () => ['all', vi.fn()] }));
const answers = [1, 2, 3].map((n) => ({ attemptId: `attempts:${n}`, questionKey: `LR:q${n}`, area: 'LR', source: 'lr_attempts', mode: 'adaptive', topic: 'Weaken', correct: n < 3, gradedAt: '2026-09-01' }));
function load(missing: string[]) {
  read.mockReturnValue({ ledger: { answers, coverage: { includedSources: ['lr_attempts'], missingSources: missing.map((source) => ({ source, reason: 'offline' })) } }, loading: false, resolution: { state: 'ready' } });
}
describe('selected-student topic evidence', () => {
  it('withholds partial LR accuracy and labels every count as candidate evidence', () => {
    load(['lr_section_history']);
    render(<MemoryRouter><ProgressTopics studentId="student-2" /></MemoryRouter>);
    expect(read).toHaveBeenCalledWith('all', 'student-2');
    expect(screen.queryByText('67%')).not.toBeInTheDocument();
    expect(screen.getByText(/Topic accuracy is withheld/)).toBeInTheDocument();
    expect(screen.getByText('attempts:1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Practice questions' })).not.toBeInTheDocument();
    expect(screen.queryByText(/early signal/)).not.toBeInTheDocument();
  });
  it('an RC-only source failure does not suppress complete LR evidence', () => {
    load(['rc_attempts']);
    render(<MemoryRouter><ProgressTopics /></MemoryRouter>);
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText(/early signal/)).toBeInTheDocument();
  });
});
