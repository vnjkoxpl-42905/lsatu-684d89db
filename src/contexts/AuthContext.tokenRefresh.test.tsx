import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

// The listener Supabase would install. The test drives it directly so a
// TOKEN_REFRESHED can be delivered on demand instead of waiting an hour.
let authListener: ((event: string, session: any) => void) | null = null;

const makeSession = (id: string) => ({
  access_token: `tok-${Math.random()}`,
  user: { id, email: 'j@example.com' },
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        authListener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: () => Promise.resolve({ data: { session: makeSession('user-1') } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: 'user-1' } }) }) }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

vi.mock('@/lib/cloudMirror', () => ({
  initCloudMirror: vi.fn(),
  stopCloudMirror: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn(), removeQueries: vi.fn() }),
}));

// Counts distinct `user` object identities the consumer has been handed. An
// effect keyed on `user` re-runs exactly this many times — which is how a live
// drill session was being rebuilt mid-lesson.
function Consumer({ onIdentity }: { onIdentity: (u: unknown) => void }) {
  const { user } = useAuth();
  onIdentity(user);
  return <div data-testid="uid">{user?.id ?? 'none'}</div>;
}

describe('AuthContext user identity across token refresh', () => {
  beforeEach(() => {
    authListener = null;
  });

  it('keeps the same user object when a TOKEN_REFRESHED arrives for the same person', async () => {
    const identities: unknown[] = [];
    render(<Consumer onIdentity={(u) => identities.push(u)} />, {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('user-1'));

    const before = identities[identities.length - 1];
    expect(before).toBeTruthy();

    // Supabase refreshes the token: same person, brand-new user object.
    await act(async () => {
      authListener?.('TOKEN_REFRESHED', makeSession('user-1'));
    });

    const after = identities[identities.length - 1];
    expect(after).toBe(before);
    expect(new Set(identities.filter(Boolean)).size).toBe(1);
  });

  it('still swaps the user object when a different person signs in', async () => {
    const identities: unknown[] = [];
    render(<Consumer onIdentity={(u) => identities.push(u)} />, {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('user-1'));
    const before = identities[identities.length - 1];

    await act(async () => {
      authListener?.('SIGNED_IN', makeSession('user-2'));
    });

    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('user-2'));
    expect(identities[identities.length - 1]).not.toBe(before);
  });
});
