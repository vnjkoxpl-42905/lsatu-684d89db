import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DossierProgress from './DossierProgress';

vi.mock('./StudentDossier', () => ({ useDossier: () => ({ studentId: 's2', studentName: 'Student Two' }) }));
vi.mock('@/components/analytics/FirstAnswerProgressPanel', () => ({ default: ({ studentId, hideWindowControl }: { studentId: string; hideWindowControl: boolean }) => <div>Accuracy {studentId} {String(hideWindowControl)}</div> }));
vi.mock('@/components/analytics/FirstAnswerHistoryPanel', () => ({ default: ({ studentId, window }: { studentId: string; window: number }) => <div>History {studentId} {window}</div> }));
vi.mock('@/pages/ProgressTopics', () => ({ default: ({ studentId, hideWindowControl }: { studentId: string; hideWindowControl: boolean }) => <div>Topics {studentId} {String(hideWindowControl)}</div> }));
describe('dossier uses one subject and window', () => {
  it('passes the same selected student into all three views', () => {
    render(<MemoryRouter initialEntries={['/teacher/students/s2/progress?window=14']}><DossierProgress /></MemoryRouter>);
    expect(screen.getByText('Accuracy s2 true')).toBeInTheDocument();
    expect(screen.getByText('History s2 14')).toBeInTheDocument();
    expect(screen.getByText('Topics s2 true')).toBeInTheDocument();
    expect(screen.getByText(/Student Two's progress/)).toBeInTheDocument();
  });
});
