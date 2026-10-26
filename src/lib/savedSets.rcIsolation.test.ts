import { describe, expect, it, vi } from 'vitest';
const rows = vi.hoisted(() => [
  { id: 'lr', user_id: 'owner', name: 'LR set', filter_state: { kind: 'lr-builder', version: 1 }, question_ids: ['PT101-S1-Q1'], created_at: '2026-10-17' },
  { id: 'legacy', user_id: 'owner', name: 'Legacy set', filter_state: {}, question_ids: ['PT101-S1-Q2'], created_at: '2026-10-17' },
  { id: 'rc', user_id: 'owner', name: 'RC set', filter_state: { kind: 'rc-builder', version: 1 }, question_ids: ['RC-Q70'], created_at: '2026-10-17' },
  { id: 'future-rc', user_id: 'owner', name: 'Future RC set', filter_state: { kind: 'rc-builder', version: 99 }, question_ids: [], created_at: '2026-10-17' },
]);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }) }) } }));
import { listSavedSets } from './savedSets';
describe('LR saved set producer isolation', () => {
  it('keeps tagged and legacy LR while excluding every RC version', async () => {
    expect((await listSavedSets('owner')).map(row => row.id)).toEqual(['lr', 'legacy']);
  });
});
