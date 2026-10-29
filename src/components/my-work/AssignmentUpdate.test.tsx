import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ data: [] as any[], error: null as unknown, actor: 'student', pending: false, ack: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('@/hooks/useStudentWorkState', () => ({ useAssignmentGroupAcknowledgment: state.ack }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: state.actor } }, error: null }) }, rpc: async () => { if (state.pending)
            return new Promise(() => { }); return { data: state.data, error: state.error }; } } }));
import AssignmentUpdate from './AssignmentUpdate';
const group = '00000000-0000-4000-8000-000000000001';
function open() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/my-work/to-do?workGroup=' + group]}><AssignmentUpdate groupId={group}/></MemoryRouter></QueryClientProvider>); }
beforeEach(() => { state.actor = 'student'; state.error = null; state.pending = false; state.data = []; state.ack.mockReset(); });
it('shows exact mixed note and assignment members with independent read labels', async () => { state.data = [{ source_table: 'classroom_items', source_id: '00000000-0000-4000-8000-000000000002', issuance: 1, title: 'Teaching note', link: '/classroom/item/00000000-0000-4000-8000-000000000002', read_at: null }, { source_table: 'guided_drill_assignments', source_id: '00000000-0000-4000-8000-000000000003', issuance: 2, title: 'Guided practice', link: '/guided/00000000-0000-4000-8000-000000000003', read_at: '2026-10-28T10:00:00Z' }]; open(); await screen.findByRole('link', { name: /Teaching note Unread/ }); expect(screen.getByRole('link', { name: /Guided practice Read/ })).toHaveAttribute('href', expect.stringContaining('workIssuance=2')); await waitFor(() => expect(state.ack).toHaveBeenLastCalledWith({ ready: true })); });
it.each(['pending', 'error', 'actor'])('does not acknowledge a %s collection', async (kind) => { if (kind === 'pending')
    state.pending = true; if (kind === 'error')
    state.error = new Error('denied'); if (kind === 'actor')
    state.actor = 'other'; open(); if (kind !== 'pending')
    await screen.findByRole('alert'); expect(state.ack).toHaveBeenLastCalledWith({ ready: false }); });
it('loads a generic plan summary without pretending tasks were read', async () => { open(); await screen.findByText(/Your plan is ready/); await waitFor(() => expect(state.ack).toHaveBeenLastCalledWith({ ready: true })); expect(screen.queryByText('Read')).not.toBeInTheDocument(); });
it('keeps inaccessible group items hidden and the update unread', async () => { state.data = [{ source_table: 'classroom_items', source_id: '00000000-0000-4000-8000-000000000002', issuance: 1, title: 'Hidden course', link: '/bootcamp/course', read_at: null }]; render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AssignmentUpdate groupId={group} generalAccess={false}/></MemoryRouter></QueryClientProvider>); await screen.findByText(/Some items in this update/); expect(screen.queryByText('Hidden course')).not.toBeInTheDocument(); expect(state.ack).toHaveBeenLastCalledWith({ ready: false }); });
