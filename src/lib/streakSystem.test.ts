import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDayISO, addLocalDays } from './localDate';

// M151: streak day-boundary transitions. streakSystem is DB-driven, so we mock
// the supabase query builder and assert the streak math + that a persist failure
// surfaces (never celebrating a streak that was not saved).

type Row = Record<string, any> | null;

let dailyStatsByDate: Record<string, Row> = {};
let profileRow: Row = null;
let dailyReadError: { message: string } | null = null;
let profileReadError: { message: string } | null = null;
let profileUpdateError: { message: string } | null = null;
const profileUpdates: Array<Record<string, any>> = [];

function makeBuilder(table: string) {
  const filters: Record<string, any> = {};
  const builder: any = {
    _update: null as Record<string, any> | null,
    select() { return builder; },
    update(payload: Record<string, any>) { builder._update = payload; return builder; },
    eq(col: string, val: any) { filters[col] = val; return builder; },
    maybeSingle() {
      if (table === 'daily_stats') {
        return Promise.resolve({ data: dailyStatsByDate[filters.date] ?? null, error: dailyReadError });
      }
      if (table === 'profiles') {
        return Promise.resolve({ data: profileRow, error: profileReadError });
      }
      return Promise.resolve({ data: null, error: null });
    },
    // terminal for the update().eq() chain (awaited, no maybeSingle)
    then(onFulfilled: any, onRejected: any) {
      if (builder._update) {
        profileUpdates.push(builder._update);
        return Promise.resolve({ error: profileUpdateError }).then(onFulfilled, onRejected);
      }
      return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => makeBuilder(table) },
}));

// Imported after the mock is registered.
import { updateStreak } from './streakSystem';

const today = localDayISO();
const yesterday = addLocalDays(-1);
const twoDaysAgo = addLocalDays(-2);

beforeEach(() => {
  dailyStatsByDate = {};
  profileRow = null;
  dailyReadError = null;
  profileReadError = null;
  profileUpdateError = null;
  profileUpdates.length = 0;
});

describe('updateStreak', () => {
  it('returns zeros and writes nothing when there is no profile', async () => {
    const r = await updateStreak('class-1');
    expect(r.newStreak).toBe(0);
    expect(r.streakIncreased).toBe(false);
    expect(profileUpdates).toHaveLength(0);
  });

  it('increments the streak when yesterday was the last practice and today hits goal', async () => {
    dailyStatsByDate[today] = { questions_answered: 5 };
    profileRow = { streak_current: 3, last_practice_date: yesterday, longest_streak: 5, daily_goal_questions: 5 };
    const r = await updateStreak('class-1');
    expect(r.goalReached).toBe(true);
    expect(r.newStreak).toBe(4);
    expect(r.streakIncreased).toBe(true);
    expect(r.streakBroken).toBe(false);
    expect(profileUpdates).toHaveLength(1);
    expect(profileUpdates[0]).toMatchObject({ streak_current: 4, longest_streak: 5, last_practice_date: today });
  });

  it('resets to 1 and flags streakBroken after a gap day', async () => {
    dailyStatsByDate[today] = { questions_answered: 6 };
    profileRow = { streak_current: 7, last_practice_date: twoDaysAgo, longest_streak: 7, daily_goal_questions: 5 };
    const r = await updateStreak('class-1');
    expect(r.newStreak).toBe(1);
    expect(r.streakBroken).toBe(true);
    expect(r.streakIncreased).toBe(true);
    expect(profileUpdates[0]).toMatchObject({ streak_current: 1 });
  });

  it('is idempotent within a day: already practiced today writes nothing', async () => {
    dailyStatsByDate[today] = { questions_answered: 10 };
    profileRow = { streak_current: 4, last_practice_date: today, longest_streak: 6, daily_goal_questions: 5 };
    const r = await updateStreak('class-1');
    expect(r.newStreak).toBe(4);
    expect(r.streakIncreased).toBe(false);
    expect(profileUpdates).toHaveLength(0);
  });

  it('does not touch the streak when today has not reached the goal', async () => {
    dailyStatsByDate[today] = { questions_answered: 2 };
    profileRow = { streak_current: 4, last_practice_date: yesterday, longest_streak: 6, daily_goal_questions: 5 };
    const r = await updateStreak('class-1');
    expect(r.goalReached).toBe(false);
    expect(r.streakIncreased).toBe(false);
    expect(profileUpdates).toHaveLength(0);
  });

  it('throws when a read fails (a real error is not swallowed as empty)', async () => {
    dailyReadError = { message: 'network' };
    await expect(updateStreak('class-1')).rejects.toEqual({ message: 'network' });
  });

  it('throws when the streak persist fails, so the UI never shows a phantom streak', async () => {
    dailyStatsByDate[today] = { questions_answered: 5 };
    profileRow = { streak_current: 3, last_practice_date: yesterday, longest_streak: 5, daily_goal_questions: 5 };
    profileUpdateError = { message: 'rls denied' };
    await expect(updateStreak('class-1')).rejects.toEqual({ message: 'rls denied' });
  });
});
