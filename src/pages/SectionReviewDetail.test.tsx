import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { adaptLrSections, type LrSectionSourceRow } from '@/lib/firstAnswerProgress';
import { resolveProgressReviewCapability } from '@/lib/progressReviewCapability';
import { UNANSWERED } from '@/lib/sectionAnswer';
import SectionReviewDetail from './SectionReviewDetail';

const qid = 'PT101-S2-Q1';
const question = { qid, qnum: 1, qtype: 'Weaken', initialAnswer: 'B', initialCorrect: false, correctAnswer: 'A', brAnswer: 'C' };
const raw = (overrides: Partial<LrSectionSourceRow> = {}): LrSectionSourceRow => ({
  id: 'history',
  user_id: 'owner',
  mode: 'full-section',
  completed_at: '2026-10-28T12:00:00Z',
  practice_test_run_id: null,
  questions_json: [question],
  ...overrides,
});
const access = { actorId: 'owner', ownerId: 'owner', resolved: true, analytics: true };

function DestinationEcho() {
  const loc = useLocation();
  return <div data-testid="dest">{`${loc.pathname}${loc.search}`}</div>;
}

function mount(href: string) {
  return render(
    <MemoryRouter initialEntries={[href]}>
      <Routes>
        <Route path="/review/section/:historyId/:qid" element={<SectionReviewDetail />} />
        <Route path="/review/section/:historyId" element={<DestinationEcho />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SectionReviewDetail redirect to SectionReport walk (Phase 4.4)', () => {
  it('redirects legacy /review/section/:historyId/:qid links to the report walk at that question', () => {
    const [answer] = adaptLrSections([raw()], 'owner', new Set());
    const capability = resolveProgressReviewCapability(answer, access);
    expect(capability.status).toBe('available');
    if (capability.status !== 'available') throw new Error('Expected released section capability');

    mount(capability.href);
    expect(screen.getByTestId('dest').textContent).toBe(
      `/review/section/history?walk=1&qid=${encodeURIComponent(qid)}`,
    );
  });

  it('preserves a safe returnTo query parameter on redirect', () => {
    mount(`/review/section/history/${qid}?returnTo=${encodeURIComponent('/review/to-review')}`);
    expect(screen.getByTestId('dest').textContent).toBe(
      `/review/section/history?walk=1&qid=${encodeURIComponent(qid)}&returnTo=%2Freview%2Fto-review`,
    );
  });

  it('does not adapt unowned, unfinished, ungraded or unvisited blank section rows', () => {
    expect(
      adaptLrSections(
        [raw({ questions_json: [{ ...question, qid: 'PT110-S2-Q1', initialAnswer: UNANSWERED, initialCorrect: false }] })],
        'owner',
        new Set(),
      ),
    ).toEqual([]);
    for (const row of [
      raw({ user_id: 'other' }),
      raw({ completed_at: null }),
      raw({ mode: 'adaptive' }),
      raw({ practice_test_run_id: 'unfinished' }),
      raw({ questions_json: [{ ...question, initialCorrect: null }] }),
    ]) {
      expect(adaptLrSections([row], 'owner', new Set())).toEqual([]);
    }
    const [answer] = adaptLrSections([raw()], 'owner', new Set());
    expect(resolveProgressReviewCapability(answer, { ...access, actorId: 'other' }).status).toBe('unavailable');
  });
});
