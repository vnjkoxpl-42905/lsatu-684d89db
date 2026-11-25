import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';

const db = vi.hoisted(() => ({
  sectionHistory: [] as Array<Record<string, unknown>>,
  practiceTestRuns: [] as Array<Record<string, unknown>>,
  outcomeRequests: [] as unknown[][],
  reviewRecords: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: USER_ID } }) }));
vi.mock('@/hooks/useClassId', () => ({ useClassId: () => ({ classId: USER_ID, loading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const makeChain = (rows: Array<Record<string, unknown>>) => {
        let outcomeProjection = false;
        let inFilter: { col: string; vals: unknown[] } | null = null;
        let eqFilter: Array<{ col: string; val: unknown }> = [];
        const resolve = () => {
          let filtered = rows;
          for (const f of eqFilter) {
            filtered = filtered.filter((r) => r[f.col] === f.val);
          }
          if (inFilter) {
            const set = new Set(inFilter.vals);
            filtered = filtered.filter((r) => set.has(r[inFilter!.col]));
          }
          return { data: filtered, error: null };
        };
        const chain: Record<string, any> = {
          select: (columns: string) => {
            outcomeProjection = table === 'section_history' && (columns === '*' || columns.includes('initial_score'));
            return chain;
          },
          eq: (col: string, val: unknown) => {
            eqFilter.push({ col, val });
            return chain;
          },
          contains: () => chain,
          not: () => chain,
          in: (col: string, vals: unknown[]) => {
            inFilter = { col, vals };
            if (outcomeProjection) db.outcomeRequests.push(vals);
            return chain;
          },
          order: () => chain,
          limit: () => chain,
          range: async () => resolve(),
          maybeSingle: async () => ({ data: resolve().data[0] ?? null, error: null }),
          then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled),
        };
        return chain;
      };

      if (table === 'section_history') return makeChain(db.sectionHistory);
      if (table === 'practice_test_runs') return makeChain(db.practiceTestRuns);
      if (table === 'section_review_records') return makeChain(db.reviewRecords);
      return makeChain([]);
    },
  },
}));

import { fetchSectionHistoryByClass } from './sectionHistory';
import { buildSittings, loadStudentPractice } from './studentAnalytics';
import { RecentPerformanceWidget } from '@/components/dashboard/RecentPerformanceWidget';

describe('F7: unified practice_test_runs "complete" status and section_review_records overlay', () => {
  beforeEach(() => {
    db.outcomeRequests = [];
    db.practiceTestRuns = [
      {
        id: 'run-complete',
        user_id: USER_ID,
        pt: 120,
        status: 'complete',
        completed_at: '2026-11-20T12:00:00Z',
        raw_correct: 60,
        raw_total: 75,
        scaled_score: 158,
      },
      {
        id: 'run-in-progress',
        user_id: USER_ID,
        pt: 121,
        status: 'in-progress',
        completed_at: null,
        raw_correct: null,
        raw_total: null,
        scaled_score: null,
      },
    ];

    db.sectionHistory = [
      {
        id: 'hist-pt-complete',
        user_id: USER_ID,
        class_id: USER_ID,
        pt: 120,
        section: 1,
        mode: 'full-section',
        initial_score: 21,
        initial_total: 25,
        initial_percent: 84,
        br_used: false,
        br_score: null,
        br_percent: null,
        br_delta: null,
        total_time_ms: 1800_000,
        avg_time_ms: 72_000,
        time_taken_ms: 1800_000,
        unanswered_count: 0,
        by_qtype_json: {},
        by_difficulty_json: {},
        questions_json: [],
        completed_at: '2026-11-20T11:30:00Z',
        created_at: '2026-11-20T11:30:00Z',
        practice_test_run_id: 'run-complete',
        release_requires_br: false,
      },
      {
        id: 'hist-pt-in-progress',
        user_id: USER_ID,
        class_id: USER_ID,
        pt: 121,
        section: 2,
        mode: 'full-section',
        initial_score: 15,
        initial_total: 25,
        initial_percent: 60,
        br_used: false,
        br_score: null,
        br_percent: null,
        br_delta: null,
        total_time_ms: 1800_000,
        avg_time_ms: 72_000,
        time_taken_ms: 1800_000,
        unanswered_count: 0,
        by_qtype_json: {},
        by_difficulty_json: {},
        questions_json: [],
        completed_at: '2026-11-21T11:30:00Z',
        created_at: '2026-11-21T11:30:00Z',
        practice_test_run_id: 'run-in-progress',
        release_requires_br: false,
      },
      {
        id: 'hist-assigned-released',
        user_id: USER_ID,
        class_id: USER_ID,
        pt: 122,
        section: 3,
        mode: 'full-section',
        initial_score: 12,
        initial_total: 25,
        initial_percent: 48,
        // Old history columns carry null; authoritative BR lives in section_review_records!
        br_used: false,
        br_score: null,
        br_percent: null,
        br_delta: null,
        total_time_ms: 1800_000,
        avg_time_ms: 72_000,
        time_taken_ms: 1800_000,
        unanswered_count: 0,
        by_qtype_json: {},
        by_difficulty_json: {},
        questions_json: [],
        completed_at: '2026-11-22T11:30:00Z',
        created_at: '2026-11-22T11:30:00Z',
        practice_test_run_id: null,
        release_requires_br: true,
      },
    ];

    db.sectionHistory.push(
      { ...db.sectionHistory[1], id: 'hist-missing-parent', practice_test_run_id: 'missing-parent' },
      { ...db.sectionHistory[2], id: 'hist-assigned-sealed' },
    );
    db.reviewRecords = [
      {
        history_id: 'hist-assigned-released',
        predicted_score: 14,
        br_results: [{ qid: 'q1', preAnswer: 'A', brAnswer: 'B', brTouched: true, brChanged: true, correct: true, preCorrect: false }],
        br_score: 20,
        br_total: 25,
        br_percent: 80,
        br_delta: 8,
        br_analysis_json: null,
        br_completed_at: '2026-11-22T12:00:00Z',
      },
    ];
  });

  it('teacher fetchSectionHistoryByClass hides in-progress PT legs and shows completed PT legs + BR review record', async () => {
    const rows = await fetchSectionHistoryByClass(USER_ID);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('hist-pt-complete');
    expect(ids).toContain('hist-assigned-released');
    expect(ids).not.toContain('hist-pt-in-progress');
    expect(ids).not.toContain('hist-missing-parent');
    expect(ids).not.toContain('hist-assigned-sealed');
    expect(db.outcomeRequests.flat().sort()).toEqual(['hist-assigned-released', 'hist-pt-complete']);
    expect(rows.find((r) => r.id === 'hist-assigned-released')?.brScore).toBe(20);
  });

  it('loadStudentPractice hides in-progress PT legs and overlays section_review_records BR score', async () => {
    const practice = await loadStudentPractice(USER_ID);
    const ids = practice.sections.map((s) => s.id);
    expect(ids).toContain('hist-pt-complete');
    expect(ids).toContain('hist-assigned-released');
    expect(ids).not.toContain('hist-pt-in-progress');
    expect(ids).not.toContain('hist-missing-parent');
    expect(ids).not.toContain('hist-assigned-sealed');
    expect(db.outcomeRequests.flat().sort()).toEqual(['hist-assigned-released', 'hist-pt-complete']);
    const assigned = practice.sections.find((s) => s.id === 'hist-assigned-released')!;
    expect(assigned.br_used).toBe(true);
    expect(assigned.br_score).toBe(20);
    const sittings = buildSittings(practice);
    expect(sittings.find((s) => s.id === 'section:hist-assigned-released')?.br).toEqual({ kind: 'percent', value: 80 });
  });

  it('RecentPerformanceWidget renders "complete" PT leg and merged BR score 20/25 (not 12/25)', async () => {
    render(<RecentPerformanceWidget />);
    await waitFor(() => expect(screen.getByText('PT122-S3')).toBeTruthy());
    expect(screen.getByText('PT120-S1')).toBeTruthy();
    expect(screen.queryByText('PT121-S2')).toBeNull();
    expect(db.outcomeRequests.flat().sort()).toEqual(['hist-assigned-released', 'hist-pt-complete']);
    expect(screen.getByText('20/25')).toBeTruthy();
    expect(screen.queryByText('12/25')).toBeNull();
  });
});
