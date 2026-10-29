import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { safeReviewHubReturn } from '@/lib/reviewHubReturn';

type ViewMemory = { actorId: string | null; paths: Record<string, string> };
const ReviewViewMemoryContext = createContext<ViewMemory | null>(null);

function useActorMemory() {
  const { user } = useAuth();
  const actorId = user?.id ?? null;
  const ref = useRef<ViewMemory>({ actorId, paths: {} });
  if (ref.current.actorId !== actorId) ref.current = { actorId, paths: {} };
  return ref.current;
}

/** Personal navigation only. The auth-scoped app owns it across full-screen detail routes. */
export function ReviewViewMemoryProvider({ children }: { children: ReactNode }) {
  const memory = useActorMemory();
  return <ReviewViewMemoryContext.Provider value={memory}>{children}</ReviewViewMemoryContext.Provider>;
}

export function useReviewViewMemory() {
  const shared = useContext(ReviewViewMemoryContext);
  // Isolated renders retain a bounded local fallback; production always has the provider.
  const local = useActorMemory();
  const memory = shared?.actorId === local.actorId ? shared : local;
  return useMemo(() => ({
    remember(origin: string) {
      const safe = safeReviewHubReturn(origin);
      if (!safe || !memory.actorId) return;
      const pathname = safe.split(/[?#]/, 1)[0];
      memory.paths[pathname] = safe;
    },
    target(pathname: string) {
      const safePath = safeReviewHubReturn(pathname);
      return safePath ? memory.paths[safePath] ?? safePath : pathname;
    },
  }), [memory]);
}
