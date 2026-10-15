import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentBookingPanel from './StudentBookingPanel';

const api = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: api.invoke }, rpc: api.rpc } }));
vi.mock('sonner', () => ({ toast: { success: api.success, error: api.error } }));

describe('teacher missed session credit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let returned = false;
    api.invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === 'history'
      ? { redemptions: [
        { id: 'past', start_at: '2026-01-01T15:00:00Z', status: 'booked', credit_refunded: returned },
        { id: 'future', start_at: '2099-01-01T15:00:00Z', status: 'booked', credit_refunded: false },
      ] }
      : { pass: { id: 'pass', total_credits: 8, used_credits: returned ? 2 : 3, credits_remaining: returned ? 6 : 5, session_length_minutes: 70 } }, error: null }));
    api.rpc.mockImplementation(async () => { returned = true; return { data: { already_returned: false }, error: null }; });
  });

  it('requires confirmation, returns the selected credit, and removes the repeat action', async () => {
    render(<StudentBookingPanel studentId="student" studentName="Student" studentEmail="student@example.com" />);
    fireEvent.click(await screen.findByRole('button', { name: 'I missed this session' }));
    expect(api.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Return 1 credit' }));
    await screen.findByText('Credit returned');
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('admin_return_teacher_missed_credit', { _redemption_id: 'past' });
    expect(screen.queryByRole('button', { name: 'I missed this session' })).not.toBeInTheDocument();
  });

  it('keeps the credit and retry control when the backend fails', async () => {
    api.rpc.mockResolvedValue({ data: null, error: new Error('Unavailable') });
    render(<StudentBookingPanel studentId="student" studentName="Student" studentEmail="student@example.com" />);
    fireEvent.click(await screen.findByRole('button', { name: 'I missed this session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Return 1 credit' }));
    await waitFor(() => expect(api.error).toHaveBeenCalledWith('Unavailable'));
    expect(screen.getByRole('button', { name: 'Return 1 credit' })).toBeEnabled();
    expect(screen.queryByText('Credit returned')).not.toBeInTheDocument();
  });
});
