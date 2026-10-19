import { beforeEach, describe, expect, it, vi } from 'vitest';

const { range, order, select, from } = vi.hoisted(() => ({
  range: vi.fn(), order: vi.fn(), select: vi.fn(), from: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

import { loadRecordedPayments } from './PaymentsPanel';

describe('recorded payment history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = { select, order, range };
    from.mockReturnValue(builder);
    select.mockReturnValue(builder);
    order.mockReturnValue(builder);
  });

  it('keeps history older than 90 days and loads beyond the first server page', async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => ({ id: `recent-${i}` }));
    const oldPayment = { id: 'old-payment', paid_at: '2024-01-01T12:00:00Z' };
    range.mockResolvedValueOnce({ data: firstPage, error: null });
    range.mockResolvedValueOnce({ data: [oldPayment], error: null });
    const rows = await loadRecordedPayments();
    expect(rows).toHaveLength(501);
    expect(rows[500]).toEqual(oldPayment);
    expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
    expect(order).toHaveBeenCalledWith('id', { ascending: false });
  });

  it('rejects a later-page failure instead of returning incomplete history', async () => {
    range.mockResolvedValueOnce({ data: Array(500).fill({ id: 'payment' }), error: null });
    const error = new Error('Ledger unavailable');
    range.mockResolvedValueOnce({ data: null, error });
    await expect(loadRecordedPayments()).rejects.toBe(error);
  });
});
