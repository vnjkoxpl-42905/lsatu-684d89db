/**
 * useUser — bridged for LSAT U.
 *
 * In the standalone bootcamp this returned a stub anonymous user. Inside LSAT U
 * we adapt to the real auth user surfaced by `@/contexts/AuthContext`. The bootcamp's
 * Persistence layer keys on user.id, so each LSAT U student gets their own bootcamp
 * progress under their Supabase UUID.
 *
 * Auth gate is enforced one level up in src/pages/MainConclusionBootcamp.tsx — if
 * useAuth returns null user, that page redirects to /auth before this hook runs.
 *
 * The bootcamp's User Zod schema stays (used by other modules); we project the
 * Supabase user into that shape.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, User } from '@/bootcamps/main-conclusion/persistence/records';
import { now } from '@/bootcamps/main-conclusion/lib/ids';

// Legacy export (kept for any local tests that still imported the constant).
// In LSAT U the real Supabase user.id is authoritative.
export const STUB_USER_ID_EXPORT = '00000000-0000-4000-8000-000000000001';

export function useUser(): User | null {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!authUser) {
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const persist = getPersistence(authUser.id);
      let existing = await persist.get<User>(TABLES.users, authUser.id);
      if (!existing) {
        existing = User.parse({
          id: authUser.id,
          name:
            (authUser.user_metadata && (authUser.user_metadata.display_name as string)) ||
            (authUser.user_metadata && (authUser.user_metadata.username as string)) ||
            authUser.email ||
            'Student',
          started_at: now(),
          last_seen: now(),
          settings: {},
        });
        await persist.set(TABLES.users, authUser.id, existing);
      } else {
        existing = { ...existing, last_seen: now() };
        await persist.set(TABLES.users, authUser.id, existing);
      }
      if (!cancelled) setUser(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  return user;
}
