import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiagnosticsAnalyticsSurface } from '../DiagnosticsAnalyticsSurface';

vi.mock('@/bootcamps/main-conclusion/hooks/useDiagnostics', () => ({
  useDiagnostics: () => ({
    loading: false,
    progress: {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: '00000000-0000-4000-8000-000000000002',
      unlocked_modules: ['M1', 'M2', 'M3', 'M5', 'M6'],
      unlocked_routes: [],
      completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.3'],
      completed_drills: ['MC-DRL-CT'],
      completed_milestones: [],
      completed_hard_sections: ['5.1'],
      completed_capstones: [],
      updated_at: '2026-10-10T12:00:00.000Z',
    },
    calibrationAttempts: [],
    simulatorAttempts: [],
    drillStageGates: [],
    trapsTags: [],
    srsItems: [],
    rrRecordings: [],
    fsvrSession: null,
    fsvrViewedAt: null,
  }),
}));

vi.mock('@/bootcamps/main-conclusion/hooks/useIntroLrAttempts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/bootcamps/main-conclusion/hooks/useIntroLrAttempts')>();
  return {
    ...actual,
    useIntroLrAttempts: () => ({
      loading: false,
      attempts: [
        {
          id: 'att-1',
          drill_id: 'native-lab:conclusion-type:run-1',
          question_id: 'ct-q1',
          mode: 'native_lab_v1',
          selected_answer: '{"answer":"recommendation","ordinal":1}',
          correct: true,
          time_ms: 5000,
          created_at: '2026-10-10T11:00:00.000Z',
        },
      ],
      total: 1,
      correct: 1,
      accuracy: 100,
      byMode: [{ mode: 'Conclusion Type Lab', total: 1, correct: 1, accuracy: 100 }],
      byDrill: [],
      lastAttemptAt: '2026-10-10T11:00:00.000Z',
    }),
  };
});

vi.mock('@/bootcamps/main-conclusion/hooks/usePracticeDrillStatus', () => ({
  usePracticeDrillStatus: () => ({
    loading: false,
    statuses: {
      'first-sentence-conclusions': {
        slug: 'first-sentence-conclusions',
        state: 'in-progress',
        answered: 2,
        total: 6,
        correct: 2,
        resumeIndex: 2,
        questionOutcomes: ['correct', 'correct', 'unanswered', 'unanswered', 'unanswered', 'unanswered'],
      },
      'rebuttal-conclusions': {
        slug: 'rebuttal-conclusions',
        state: 'not-started',
        answered: 0,
        total: 6,
        correct: 0,
        resumeIndex: 0,
        questionOutcomes: ['unanswered', 'unanswered', 'unanswered', 'unanswered', 'unanswered', 'unanswered'],
      },
    },
    refresh: vi.fn(),
  }),
}));

describe('DiagnosticsAnalyticsSurface', () => {
  it('renders live Intro to LR KPIs, practice sets, drill labs, and checklist without dead legacy widgets', () => {
    render(
      <MemoryRouter>
        <DiagnosticsAnalyticsSurface />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Diagnostic Profile' })).toBeInTheDocument();
    expect(screen.getByText('3 / 13')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 / 12')).toBeInTheDocument();
    expect(screen.getByText('1 / 8')).toBeInTheDocument();

    expect(screen.getByText('Main Conclusion Practice Sets')).toBeInTheDocument();
    expect(screen.getByText('Drill Labs and Graded Exercises')).toBeInTheDocument();
    expect(screen.getByText('Curriculum Checklist')).toBeInTheDocument();
    expect(screen.getByText('Recent Saved Reps')).toBeInTheDocument();

    // Dead M6 widgets are removed
    expect(screen.queryByText(/Trait coverage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Retention load/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Program memory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Weakness map by trait/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Where the misses cluster/i)).not.toBeInTheDocument();

    // Switching tabs in Curriculum Checklist shows Hard Sentences entries
    fireEvent.click(screen.getByRole('tab', { name: /Hard Sentences/i }));
    expect(screen.getByText('Why Hard Sentences')).toBeInTheDocument();
    expect(screen.getByText('The Jordan Move')).toBeInTheDocument();
  });
});
