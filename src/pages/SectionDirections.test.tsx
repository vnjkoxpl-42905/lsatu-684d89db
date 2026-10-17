import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SectionDirectionsPage from './SectionDirections';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const assignment = vi.fn();
vi.mock('@/hooks/useStudentAssignments', () => ({
  useStudentAssignment: () => assignment(),
}));

const settings = vi.fn();
vi.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ settings: settings() }),
}));

function sectionRow(over: Record<string, unknown> = {}) {
  return {
    id: 'hw-9',
    set_id: 'set-1',
    set_title: 'PT156.S4 (LR)',
    set_description: null,
    question_qids: Array.from({ length: 26 }, (_, i) => `PT156-S4-Q${i + 1}`),
    status: 'assigned',
    created_at: '2026-09-11T00:00:00Z',
    ...over,
  };
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/section/hw-9']}>
      <Routes>
        <Route path="/section/:assignmentId" element={<SectionDirectionsPage />} />
        <Route path="/classroom/:assignmentId" element={<p>classroom detail</p>} />
        <Route path="/history" element={<p>history</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SectionDirectionsPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    settings.mockReturnValue({ defaultTimingMode: '35' });
    assignment.mockReturnValue({ assignment: sectionRow(), loading: false, error: null });
  });

  it('shows the section, the clock, the count, and the LR directions', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Section 4' })).toBeInTheDocument();
    expect(screen.getByText('Total Section Time - 35 minutes')).toBeInTheDocument();
    expect(screen.getByText('26 Questions')).toBeInTheDocument();
    expect(screen.getByText(/based on the reasoning presented in a brief passage/)).toBeInTheDocument();
  });

  it('offers a way back to home that starts nothing', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Back to home/ }));
    expect(navigate).toHaveBeenCalledWith('/classroom');
  });

  it('starts the section, and only then, on GO TO QUESTIONS', () => {
    mount();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'GO TO QUESTIONS' }));
    expect(navigate).toHaveBeenCalledTimes(1);
    const url = navigate.mock.calls[0][0] as string;
    expect(url.startsWith('/drill?')).toBe(true);
    const p = new URLSearchParams(url.slice('/drill?'.length));
    expect(p.get('assignment')).toBe('hw-9');
    expect(p.get('timer')).toBeNull();
  });

  it('reads an accommodated clock and carries it onto the launch', () => {
    settings.mockReturnValue({ defaultTimingMode: '52.5' });
    mount();
    expect(screen.getByText('Total Section Time - 52 minutes 30 seconds')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'GO TO QUESTIONS' }));
    const p = new URLSearchParams((navigate.mock.calls[0][0] as string).slice('/drill?'.length));
    expect(p.get('timer')).toBe('52.5');
  });

  it('sends a mixed set back to the ordinary assignment page', () => {
    assignment.mockReturnValue({
      assignment: sectionRow({ question_qids: ['PT156-S4-Q1', 'PT101-S2-Q1'] }),
      loading: false,
      error: null,
    });
    mount();
    expect(screen.getByText('classroom detail')).toBeInTheDocument();
  });

  it('sends a finished section to History rather than re-opening it', () => {
    assignment.mockReturnValue({
      assignment: sectionRow({ status: 'completed' }),
      loading: false,
      error: null,
    });
    mount();
    expect(screen.getByText('history')).toBeInTheDocument();
  });
});
