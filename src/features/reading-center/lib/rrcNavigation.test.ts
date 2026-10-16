import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rrcExitPath } from './rrcNavigation';
const state = vi.hoisted(() => ({ hub: true, libraryOwner: '', fail: false }));
vi.mock('@/lib/readingCenterAccess', () => ({ hasReadingCenterAccess: async () => {
  if (state.fail) throw new Error('offline');
  return state.hub;
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const filters: Record<string, unknown> = {};
  const query = { select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    limit: async () => ({ data: filters.student_id === state.libraryOwner && filters.mode === 'section-library' ? [{ id: 'library' }] : [], error: null }) };
  return query;
} } }));
beforeEach(() => Object.assign(state, { hub: true, libraryOwner: '', fail: false }));
describe('RRC exits remain accessible for legacy assignments', () => {
  it('returns hub users from a section to RRC and from RRC to the hub', async () => {
    expect(await rrcExitPath('student')).toBe('/reading-center/rrc');
    expect(await rrcExitPath('student', true)).toBe('/reading-center');
  });
  it('returns an individual-section-only student to assigned work', async () => {
    state.hub = false;
    expect(await rrcExitPath('student')).toBe('/classroom');
  });
  it('keeps the collection return for a specifically assigned legacy library', async () => {
    state.hub = false; state.libraryOwner = 'student';
    expect(await rrcExitPath('student')).toBe('/reading-center/rrc');
  });
  it('does not use another student’s library entitlement', async () => {
    state.hub = false; state.libraryOwner = 'other';
    expect(await rrcExitPath('student')).toBe('/classroom');
  });
  it('returns a legacy-library-only student to assigned work instead of the locked hub', async () => {
    state.hub = false; state.libraryOwner = 'student';
    expect(await rrcExitPath('student', true)).toBe('/classroom');
  });
  it('keeps an accessible exit when the grant check fails', async () => {
    state.fail = true;
    expect(await rrcExitPath('student')).toBe('/classroom');
  });
});
