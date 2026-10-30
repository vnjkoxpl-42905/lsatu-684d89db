import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FirstAnswerProgressPanel from './FirstAnswerProgressPanel';

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/hooks/useFirstAnswerProgress', () => ({ useFirstAnswerProgress: read }));
vi.mock('@/hooks/useProgressWindow', () => ({ useProgressWindow: () => ['all', vi.fn()] }));
const area = { correct: 2, denominator: 3, percent: 67, sample: 'early', evidenceAttemptIds: ['attempts:one', 'attempts:two', 'attempts:three'], sources: ['lr_attempts'] };
describe('source-complete accuracy evidence', () => {
  it('withholds LR percentage when missing earlier LR data while keeping RC independent', () => {
    read.mockReturnValue({ resolution: { state: 'ready' }, loading: false, progress: { LR: area, RC: { ...area, evidenceAttemptIds: ['rc_attempts:r'] }, coverage: { includedSources: ['lr_attempts', 'rc_attempts'], missingSources: [{ source: 'lr_section_history', reason: 'offline' }], excludedRows: {} } } });
    render(<FirstAnswerProgressPanel studentId="student-2" />);
    expect(screen.getAllByText('67%')).toHaveLength(1);
    expect(screen.getByText(/Accuracy is withheld/)).toBeInTheDocument();
    expect(read).toHaveBeenCalledWith('all', 'student-2');
    fireEvent.click(screen.getAllByText('Show calculation records')[0]);
    expect(screen.getByText('attempts:one')).toBeInTheDocument();
  });
  it('withholds both areas if parent completion evidence is unavailable', () => {
    read.mockReturnValue({ resolution: { state: 'ready' }, loading: false, progress: { LR: area, RC: area, coverage: { includedSources: ['lr_attempts', 'rc_attempts'], missingSources: [{ source: 'practice_test_runs', reason: 'offline' }], excludedRows: {} } } });
    render(<FirstAnswerProgressPanel />);
    expect(screen.queryByText('67%')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Accuracy is withheld/)).toHaveLength(2);
    expect(screen.queryByText(/Early signal/)).not.toBeInTheDocument();
  });
});
