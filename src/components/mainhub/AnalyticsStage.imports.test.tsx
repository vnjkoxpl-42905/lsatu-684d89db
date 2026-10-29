import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({
  loading: false, error: null as string | null,
  analytics: null as Record<string, unknown> | null,
  actor: 'student-a', permissionActor: 'student-a', resolved: true,
  permissionLoading: false, analyticsAccess: false, admin: false,
}));
vi.mock('@/hooks/useStudentAnalytics', () => ({ useStudentAnalytics: () => ({ loading: state.loading, error: state.error, analytics: state.analytics, streak: null, refetch: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.actor ? { id: state.actor } : null }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: state.permissionLoading, resolved: state.resolved, resolvedFor: state.permissionActor, has_analytics_access: state.analyticsAccess, is_admin: state.admin }) }));
vi.mock('@/components/analytics/ImportedMetricsPanel', () => ({ default: () => <section aria-label="Existing imported reports">Outside report</section> }));
import AnalyticsStage from './AnalyticsStage';
afterEach(() => { cleanup(); Object.assign(state, { loading: false, error: null, analytics: null, actor: 'student-a', permissionActor: 'student-a', resolved: true, permissionLoading: false, analyticsAccess: false, admin: false }); });
function mount() { render(<MemoryRouter><AnalyticsStage tab="overview" onTabChange={() => {}} /></MemoryRouter>); }
function populatedAnalytics() {
  return { hasData: true, totalQuestions: 1, totalAttempts: 1, firstAttemptAccuracy: 100, trendDelta: null, priorities: [], byType: [], accuracyTrend: [], volumeByDay: [], repeatAccuracy: null, byReasoning: [], byFeature: [], byDifficulty: [] };
}
describe('Imported reports are independent of native analytics', () => {
  it.each(['loading', 'failure', 'empty'] as const)('keeps imports reachable during native %s', mode => {
    state.loading = mode === 'loading'; state.error = mode === 'failure' ? 'native failure' : null; state.analytics = mode === 'empty' ? { hasData: false } : null;
    mount(); expect(screen.getByRole('region', { name: 'Existing imported reports' })).toBeInTheDocument();
  });
});
describe('Practice analytics Progress handoff', () => {
  it.each([
    { name: 'analytics granted', grant: true, admin: false, resolved: true, loading: false, owner: 'student-a', visible: true },
    { name: 'admin granted', grant: false, admin: true, resolved: true, loading: false, owner: 'student-a', visible: true },
    { name: 'drill-only without analytics', grant: false, admin: false, resolved: true, loading: false, owner: 'student-a', visible: false },
    { name: 'unresolved analytics', grant: true, admin: false, resolved: false, loading: false, owner: 'student-a', visible: false },
    { name: 'loading permissions', grant: true, admin: false, resolved: true, loading: true, owner: 'student-a', visible: false },
    { name: 'previous actor grant', grant: true, admin: false, resolved: true, loading: false, owner: 'student-before-switch', visible: false },
  ])('shows the action only for current resolved access: $name', testCase => {
    state.analytics = populatedAnalytics(); state.analyticsAccess = testCase.grant; state.admin = testCase.admin; state.resolved = testCase.resolved; state.permissionLoading = testCase.loading; state.permissionActor = testCase.owner;
    mount(); const action = screen.queryByRole('button', { name: 'Open first-answer Progress' });
    if (testCase.visible) expect(action).toBeVisible(); else expect(action).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Existing imported reports' })).toBeInTheDocument();
  });
});
