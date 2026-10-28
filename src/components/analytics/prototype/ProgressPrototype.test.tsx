import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ProgressPrototype from './ProgressPrototype';
import type { GradedQuestionAnswer } from '@/lib/firstAnswerProgress';
import { DEMO_AS_OF, demoAnswers, demoCoverage } from './fixture';

afterEach(cleanup);

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current preview URL">{location.pathname}{location.search}</output>;
}

function renderPreview(search = '?variant=desk&window=30') {
  return render(<MemoryRouter initialEntries={[`/progress${search}`]}>
    <ProgressPrototype answers={demoAnswers} coverage={demoCoverage} asOf={DEMO_AS_OF} demo />
    <LocationProbe />
  </MemoryRouter>);
}

function openRecentAnswer() {
  const mosaic = screen.getByRole('region', { name: 'Recent first answers' });
  const opener = within(mosaic).getAllByRole('button')[0];
  opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole('region', { name: 'Saved answer detail' })).toHaveFocus();
  return opener;
}

describe('interactive Progress preview', () => {
  it.each(['subject', 'view', 'design'] as const)('clears saved-answer detail when changing %s', (change) => {
    renderPreview();
    openRecentAnswer();
    if (change === 'subject') fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    if (change === 'view') fireEvent.click(screen.getByRole('button', { name: 'History' }));
    if (change === 'design') fireEvent.click(screen.getByRole('button', { name: 'Next design' }));
    expect(screen.queryByRole('region', { name: 'Saved answer detail' })).not.toBeInTheDocument();
    if (change === 'subject') expect(screen.getByRole('button', { name: 'Reading Comp.' })).toHaveAttribute('aria-pressed', 'true');
    if (change === 'view') expect(screen.getByRole('region', { name: 'Practice history' })).toBeInTheDocument();
    if (change === 'design') expect(screen.getByText('Type explorer', { exact: true })).toBeInTheDocument();
  });

  it('returns focus to the answer that opened the detail', () => {
    renderPreview();
    const opener = openRecentAnswer();
    fireEvent.click(screen.getByRole('button', { name: 'Close saved answer detail' }));
    expect(screen.queryByRole('region', { name: 'Saved answer detail' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('reveals older practice dates instead of silently truncating history', () => {
    renderPreview('?variant=timeline&window=30');
    const history = screen.getByRole('region', { name: 'Practice history' });
    const oldestDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(demoAnswers[0].gradedAt));
    expect(within(history).queryByText(oldestDay, { exact: true })).not.toBeInTheDocument();
    fireEvent.click(within(history).getByRole('button', { name: 'Show older practice dates' }));
    const oldest = within(history).getByText(oldestDay, { exact: true });
    const disclosure = oldest.closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(oldest.closest('summary')!);
    expect(disclosure).toHaveAttribute('open');
    expect(within(history).queryByRole('button', { name: 'Show older practice dates' })).not.toBeInTheDocument();
  });

  it('updates the date window while preserving the selected design and unrelated URL state', () => {
    renderPreview('?variant=desk&window=30&state=populated');
    openRecentAnswer();
    fireEvent.change(screen.getByRole('combobox', { name: 'Progress period' }), { target: { value: '7' } });
    expect(screen.queryByRole('region', { name: 'Saved answer detail' })).not.toBeInTheDocument();
    const url = new URL(screen.getByLabelText('Current preview URL').textContent!, 'https://example.test');
    expect(url.searchParams.get('variant')).toBe('desk');
    expect(url.searchParams.get('window')).toBe('7');
    expect(url.searchParams.get('state')).toBe('populated');
    expect(screen.getByRole('combobox', { name: 'Progress period' })).toHaveValue('7');
  });
});


describe('actionable evidence refinement', () => {
  it('filters evidence without changing the accuracy denominator', () => {
    renderPreview();
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    expect(within(panel).getByRole('button', { name: 'Missed 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('status')).toHaveTextContent('Showing 3 missed first answers of 13');
    fireEvent.click(within(panel).getByRole('button', { name: 'Correct 10' }));
    expect(within(panel).getByRole('status')).toHaveTextContent('Showing 10 correct first answers of 13');
    expect(within(panel).getByRole('img')).toHaveAccessibleName('10 correct and 3 missed of 13 first answers');
    fireEvent.click(within(panel).getAllByRole('button', { name: /PT .*First answer Correct/ })[0]);
    expect(screen.getByRole('region', { name: 'Saved answer detail' })).toHaveFocus();
  });

  it('resets the local evidence filter when changing period', () => {
    renderPreview();
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    fireEvent.click(within(panel).getByRole('button', { name: 'All 13' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Progress period' }), { target: { value: '7' } });
    const missed = within(panel).getAllByRole('button').find((button) => /^Missed /.test(button.textContent ?? ''))!;
    expect(missed).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows no-miss and Unclassified records without making a recommendation', () => {
    const answers: GradedQuestionAnswer[] = demoAnswers.slice(0, 3).map((answer, index) => ({ ...answer, attemptId: `unclassified-${index}`, topic: 'internal-code', correct: true }));
    render(<MemoryRouter initialEntries={['/?variant=desk&window=all']}><ProgressPrototype answers={answers} coverage={demoCoverage} asOf={DEMO_AS_OF} /></MemoryRouter>);
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    expect(within(panel).getByRole('button', { name: 'All 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByText(/no recognized question-type/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect missed answers' })).not.toBeInTheDocument();
  });

  it('shows bucket evidence separately and clears selection when changing subject', () => {
    renderPreview();
    const chart = screen.getByRole('region', { name: 'First-answer volume' });
    const bars = within(chart).getAllByRole('button');
    fireEvent.click(bars[0]);
    expect(bars[0]).toHaveAttribute('aria-pressed', 'true');
    expect(within(chart).getByText(/separate from question-type filters/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    const nextChart = screen.getByRole('region', { name: 'First-answer volume' });
    expect(within(nextChart).queryByText(/separate from question-type filters/)).not.toBeInTheDocument();
    within(nextChart).getAllByRole('button').forEach((bar) => expect(bar).toHaveAttribute('aria-pressed', 'false'));
  });

  it('keeps a selected record on parent re-render and exposes out-of-period history', () => {
    const first: GradedQuestionAnswer = { ...demoAnswers[0], attemptId: 'old-first', questionKey: 'LR:101.2.1', correct: false, gradedAt: '2026-09-01T12:00:00Z' };
    const repeat: GradedQuestionAnswer = { ...first, attemptId: 'recent-repeat', correct: true, gradedAt: '2026-10-26T12:00:00Z' };
    const answers = [repeat, first];
    const tree = () => <MemoryRouter initialEntries={['/?variant=timeline&window=7']}><ProgressPrototype answers={answers} coverage={demoCoverage} asOf={DEMO_AS_OF} /></MemoryRouter>;
    const rendered = render(tree());
    const history = screen.getByRole('region', { name: 'Practice history' });
    fireEvent.click(within(history).getByRole('button', { name: /PT 101 .*Repeat Correct/ }));
    rendered.rerender(tree());
    const detail = screen.getByRole('region', { name: 'Saved answer detail' });
    expect(within(detail).getByText('2 saved answers to this question')).toBeInTheDocument();
    expect(within(detail).getByText('2026-09-01')).toBeInTheDocument();
    expect(within(detail).getByText('Repeat 1')).toBeInTheDocument();
  });

  it('filters repeat history and its visible count', () => {
    renderPreview('?variant=timeline&window=30');
    const history = screen.getByRole('region', { name: 'Practice history' });
    fireEvent.click(within(history).getByRole('button', { name: 'Repeats' }));
    expect(within(history).getByText('12 answers')).toBeInTheDocument();
    expect(within(history).queryByText(/First answer$/)).not.toBeInTheDocument();
    fireEvent.click(within(history).getByRole('button', { name: 'First answers' }));
    expect(within(history).getByText('90 answers')).toBeInTheDocument();
  });
});


describe('review regression cases', () => {
  it('marks incomplete-source question chronology as provisional', () => {
    const coverage = { ...demoCoverage, missingSources: [{ source: 'lr_section_history' as const, reason: 'Unavailable' }] };
    render(<MemoryRouter initialEntries={['/?variant=timeline&window=30']}><ProgressPrototype answers={demoAnswers} coverage={coverage} asOf={DEMO_AS_OF} /></MemoryRouter>);
    const history = screen.getByRole('region', { name: 'Practice history' });
    fireEvent.click(within(history).getByRole('button', { name: /PT 104 .*Question 17 .*First answer Missed/ }));
    const detail = screen.getByRole('region', { name: 'Saved answer detail' });
    expect(within(detail).getByRole('heading', { name: '1 available saved answer to this question' })).toBeInTheDocument();
    expect(within(detail).getByText(/First and repeat labels are provisional/)).toBeInTheDocument();
  });

  it('falls back to an available known topic when the selected topic disappears', () => {
    const answers = [
      { ...demoAnswers[0], attemptId: 'old-flaw', questionKey: 'LR:101.2.1', topic: 'Flaw', correct: false, gradedAt: '2026-10-01T12:00:00Z' },
      { ...demoAnswers[1], attemptId: 'recent-weaken', questionKey: 'LR:101.2.2', topic: 'Weaken', correct: true, gradedAt: '2026-10-26T12:00:00Z' },
    ];
    render(<MemoryRouter initialEntries={['/?variant=desk&window=30']}><ProgressPrototype answers={answers} coverage={demoCoverage} asOf={DEMO_AS_OF} /></MemoryRouter>);
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    expect(within(panel).getByRole('heading', { name: 'Flaw' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Progress period' }), { target: { value: '7' } });
    expect(within(panel).getByRole('heading', { name: 'Weaken' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'All 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('makes RC chart evidence reachable directly in Timeline', () => {
    renderPreview('?variant=timeline&window=30');
    fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    const chart = screen.getByRole('region', { name: 'First-answer volume' });
    expect(within(chart).getByText('Your practice record · RC')).toBeInTheDocument();
    expect(within(chart).getByText('15 first answers')).toBeInTheDocument();
  });
});


describe('final inspection fixes', () => {
  it('preserves expanded evidence and restores focus to a row beyond the sixth', () => {
    renderPreview();
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Correct 10' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'Show all 10 answers' }));
    const rows = () => within(panel).getAllByRole('button', { name: /PT .*First answer Correct/ });
    expect(rows()).toHaveLength(10);
    const opener = rows()[8];
    opener.focus();
    fireEvent.click(opener);
    expect(rows()).toHaveLength(10);
    expect(opener).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close saved answer detail' }));
    expect(opener).toHaveFocus();
  });

  it('makes every question type reachable in the compact desk list', () => {
    renderPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 6 types' }));
    screen.getByRole('region', { name: 'Question-type evidence' }).scrollIntoView = vi.fn();
    const strengthen = screen.getByRole('button', { name: /^Strengthen .*first answers/ });
    fireEvent.click(strengthen);
    expect(within(screen.getByRole('region', { name: 'Question-type evidence' })).getByRole('heading', { name: 'Strengthen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer types' }));
    expect(strengthen).toBeInTheDocument();
    expect(strengthen).toHaveAttribute('aria-pressed', 'true');
  });
});
