import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const remember = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/ReviewViewMemoryContext', () => ({ useReviewViewMemory: () => ({ remember, target: (path: string) => path }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({loading:false, is_admin:true}) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({allowed:false, isPending:false}) }));
vi.mock('@/hooks/useClassroomMotion', () => ({ useClassroomMotion: vi.fn() }));
import { StudentDestination } from './StudentDestination';

describe('destination render purity', () => {
  it('does not write shared view memory before a render commits, while its own link uses the current URL', () => {
    remember.mockClear();
    const html = renderToString(<MemoryRouter initialEntries={['/review/progress?window=14&progressType=Flaw']}><StudentDestination destination="review" /></MemoryRouter>);
    expect(remember).not.toHaveBeenCalled();
    expect(html).toContain('href="/review/progress?window=14&amp;progressType=Flaw"');
  });
});
