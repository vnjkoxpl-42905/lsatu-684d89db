import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedConditionalActivity } from './EmbeddedConditionalActivity';

const state = vi.hoisted(() => ({ assignmentReads: vi.fn(), rows: [] as Array<Record<string, unknown>>, load: vi.fn().mockResolvedValue([]), sync: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/features/activity-centre/components/ActivityRunner', () => ({ ActivityRunner: (props: { assignmentId?: string; practiceDefinition?: { items: Array<{ order: number }> }; timing?: string }) => <div data-testid="shared-player">{props.assignmentId ? `assignment:${props.assignmentId}` : `practice:${props.practiceDefinition?.items.map(item => item.order).join(',')}:${props.timing}`}</div> }));
vi.mock('@/features/activity-centre/conditionals/ConditionalPractice', () => ({ ConditionalPracticeRoom: (props: { embeddedMode: string; selectedQuestionIds?: string[] }) => <div>{props.embeddedMode}:{props.selectedQuestionIds?.join(',')}</div> }));
vi.mock('@/features/activity-centre/hooks/useStudentActivities', () => ({ useStudentActivities: () => { state.assignmentReads(); return { assignments: state.rows, loading: false, error: null }; } }));
vi.mock('@/features/activity-centre/conditionals/practiceStore', async () => {
  const actual = await vi.importActual<typeof import('@/features/activity-centre/conditionals/practiceStore')>('@/features/activity-centre/conditionals/practiceStore');
  return { ...actual, readCachedRuns: () => [], loadPracticeRuns: state.load, syncPendingPractice: state.sync };
});

describe('bootcamp embedded conditional collections', () => {
  beforeEach(() => { vi.clearAllMocks(); state.rows = []; });
  afterEach(cleanup);
  it('uses selected source orders with the shared Rephrase player and performs no account work in local preview', () => {
    render(<MemoryRouter><EmbeddedConditionalActivity activity="rephrase" userId="preview-user" backUrl="/bootcamp/conditionals" selectedItemOrders={[1, 3]} timing="untimed" localOnly /></MemoryRouter>);
    expect(screen.getByTestId('shared-player')).toHaveTextContent('practice:1,3:untimed');
    expect(state.assignmentReads).not.toHaveBeenCalled();
    expect(state.load).not.toHaveBeenCalled();
    expect(state.sync).not.toHaveBeenCalled();
  });
  it('opens existing owned work under its original assignment ID', async () => {
    state.rows = [{ id: 'old-row', activity_id: '7946f46b-e7f8-4c60-b405-4ece9c409deb', title: 'Conditional Rephrase', status: 'completed', completed_at: '2026-10-20T10:00:00Z' }];
    render(<MemoryRouter initialEntries={['/bootcamp/conditionals/opening-practice?assignment=course-row']}><EmbeddedConditionalActivity activity="rephrase" userId="student" backUrl="/bootcamp/conditionals" /></MemoryRouter>);
    await waitFor(() => expect(state.load).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Review assigned work' }));
    expect(screen.getByTestId('shared-player')).toHaveTextContent('assignment:old-row');
  });
  it('rejects an unrelated assignment ID even when provided in the URL', async () => {
    state.rows = [{ id: 'other-row', activity_id: 'not-rephrase', title: 'Another activity' }];
    render(<MemoryRouter initialEntries={['/bootcamp/conditionals/opening-practice?activityAssignment=other-row']}><EmbeddedConditionalActivity activity="rephrase" userId="student" backUrl="/bootcamp/conditionals" /></MemoryRouter>);
    await waitFor(() => expect(state.load).toHaveBeenCalled());
    expect(screen.getByRole('alert')).toHaveTextContent('not available for this account');
    expect(screen.queryByTestId('shared-player')).not.toBeInTheDocument();
  });
  it('maps Missing Links to its original distinct mode and selected questions', () => {
    render(<MemoryRouter><EmbeddedConditionalActivity activity="missing-links" userId="student" backUrl="/bootcamp/conditionals" selectedQuestionIds={['source-question']} localOnly /></MemoryRouter>);
    expect(screen.getByText('missing-link:source-question')).toBeInTheDocument();
  });
});
