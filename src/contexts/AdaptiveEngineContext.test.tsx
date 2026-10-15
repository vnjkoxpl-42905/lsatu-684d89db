import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdaptiveEngineProvider,
  useAdaptiveEngine,
} from '@/contexts/AdaptiveEngineContext';

const authState = vi.hoisted(() => ({ userId: 'student-1' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.userId ? { id: authState.userId } : null }),
}));

const seenEngines: unknown[] = [];

function EngineProbe() {
  const engine = useAdaptiveEngine();
  seenEngines.push(engine);
  return <div>{authState.userId}</div>;
}

describe('AdaptiveEngineProvider', () => {
  beforeEach(() => {
    authState.userId = 'student-1';
    seenEngines.length = 0;
  });

  it('replaces student-owned adaptive state when the signed-in user changes', () => {
    const view = render(
      <AdaptiveEngineProvider>
        <EngineProbe />
      </AdaptiveEngineProvider>,
    );
    const firstEngine = seenEngines.at(-1);

    authState.userId = 'student-2';
    view.rerender(
      <AdaptiveEngineProvider>
        <EngineProbe />
      </AdaptiveEngineProvider>,
    );

    expect(screen.getByText('student-2')).toBeInTheDocument();
    expect(seenEngines.at(-1)).not.toBe(firstEngine);
  });
});
