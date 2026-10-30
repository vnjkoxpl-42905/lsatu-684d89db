import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useConditionalAssignments } from './useConditionalAssignments';
import { conditionalProtectedGrantRoute, conditionalTargetKey } from '@/lib/conditionalBootcampAssignment';
const state = vi.hoisted(() => ({ row: {} as Record<string, unknown>, selected: '' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
 const query = { select: (fields: string) => { state.selected = fields; return query; }, eq: () => query, in: () => query, order: () => query,
 then: (resolve: (value: unknown) => void) => resolve({ data: [Object.fromEntries(state.selected.split(',').map(key => [key, state.row[key]]))], error: null }) };
 return query;
} } }));
afterEach(cleanup);
it('reads a realistic protected v3 classroom row including its protected source table', async () => {
 const target = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: 'full-conditionals-v3' } as const;
 state.row = { id: 'work-v3', student_id: 'student', type: 'bootcamp_module', title: 'Full course', source_table: 'bootcamps', source_id: conditionalProtectedGrantRoute(target, 'work-v3'), status: 'assigned', visible_to_student: true, unlock_at: null,
 metadata_json: { bootcamp_id: 'conditionals', conditional_target: target, conditional_target_key: conditionalTargetKey(target) } };
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
 const { result } = renderHook(() => useConditionalAssignments('student', false), { wrapper });
 await waitFor(() => expect(result.current.isSuccess).toBe(true));
 expect(state.selected.split(',')).toContain('source_table');
 expect(result.current.data).toHaveLength(1);
 expect(result.current.data![0].target.courseEdition).toBe('full-conditionals-v3');
});

it.each(['full-conditionals-v3', 'unknown-edition'])('surfaces an invalid %s row for repair without granting legacy or expanded work', async courseEdition => {
 state.row = { id: 'invalid-row', student_id: 'student', type: 'bootcamp_module', title: 'Assigned conditionals', source_table: 'bootcamps', source_id: '/bootcamp/conditionals', status: 'assigned', visible_to_student: true, unlock_at: null,
 metadata_json: { bootcamp_id: 'conditionals', conditional_target: { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition } } };
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
 const { result } = renderHook(() => useConditionalAssignments('student', false), { wrapper });
 await waitFor(() => expect(result.current.isSuccess).toBe(true));
 expect(result.current.data).toEqual([]);
 expect(result.current.unavailableAssignments).toEqual([{ id: 'invalid-row', title: 'Assigned conditionals', reason: 'teacher-update' }]);
});
