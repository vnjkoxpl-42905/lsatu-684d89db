import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalProtectedGrantRoute, conditionalTargetKey } from '@/lib/conditionalBootcampAssignment';
import { snapshotConditionalRequirements } from '@/bootcamps/conditionals/courseRequirements';
import AssignmentBuilder from './AssignmentBuilder';

const fixture = vi.hoisted(() => ({ items: [] as any[] }));
vi.mock('@/hooks/useClassroomItems', () => ({ useStudentClassroomItems: () => ({ data: fixture.items }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const query: any = { select: () => query, order: () => query, limit: async () => ({ data: [] }) }; return query;
} } }));
vi.mock('@/lib/assignWork', () => ({ assignWork: vi.fn() }));
vi.mock('@/components/teacher/AssignmentDateField', () => ({ AssignmentDateField: () => null }));

const target = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: 'full-conditionals-v3' } as const;
beforeEach(() => { vi.stubEnv('VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED', 'true'); fixture.items = []; });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

async function showAuthoring() {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AssignmentBuilder studentId="student" adminUserId="teacher"/></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Bootcamp/ }));
  const option = screen.getByRole('option', { name: 'Conditional Logic Bootcamp' });
  fireEvent.change(option.parentElement!, { target: { value: 'conditionals' } });
  fireEvent.change(await screen.findByRole('combobox', { name: 'Conditional course edition' }), { target: { value: 'full-conditionals-v3' } });
}

it('uses the shared prospective count and preserves the old generation without treating it as a duplicate', async () => {
  fixture.items = [{ id: 'older', type: 'bootcamp_module', status: 'assigned', source_table: 'bootcamps',
    source_id: conditionalProtectedGrantRoute(target, 'older'), metadata_json: { bootcamp_id: 'conditionals', conditional_target: target, conditional_target_key: conditionalTargetKey(target) } }];
  await showAuthoring();
  expect(await screen.findByText(/This new assignment requires 71 lessons and drills/)).toBeVisible();
  expect(screen.getByText(/Existing assignments retain their required steps \(70\)/)).toBeVisible();
  expect(screen.queryByText(/already assigned/i)).toBeNull();
});

it('recognizes an already assigned current requirements generation', async () => {
  fixture.items = [{ id: 'current', type: 'bootcamp_module', status: 'assigned', source_table: 'bootcamps',
    source_id: conditionalProtectedGrantRoute(target, 'current'), metadata_json: { bootcamp_id: 'conditionals', conditional_target: target,
      conditional_target_key: conditionalTargetKey(target), conditional_requirements: snapshotConditionalRequirements(target) } }];
  await showAuthoring();
  expect(await screen.findByText(/already assigned/i)).toBeVisible();
  expect(screen.getByText(/Existing assignments retain their required steps \(71\)/)).toBeVisible();
});
