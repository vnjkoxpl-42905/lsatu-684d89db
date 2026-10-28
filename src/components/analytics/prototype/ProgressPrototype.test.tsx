import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import ProgressPrototype from './ProgressPrototype';
import type { GradedQuestionAnswer } from '@/lib/firstAnswerProgress';
import { DEMO_AS_OF, demoAnswers, demoCoverage } from './fixture';
import { buildPrototypeModel, recommendedTopic } from './model';

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

/** The recommended type opens by default; read its counts from the same model the page uses. */
function selectedTopicCounts(window: 30 | 7 = 30) {
  const model = buildPrototypeModel(demoAnswers, demoCoverage, window, DEMO_AS_OF);
  const row = recommendedTopic(model) ?? model.topics[0];
  return { topic: row.topic, correct: row.correct, total: row.denominator, missed: row.denominator - row.correct };
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
    const { correct, missed, total } = selectedTopicCounts();
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    expect(within(panel).getByRole('button', { name: `Missed ${missed}` })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('status')).toHaveTextContent(`Showing ${missed} missed first answers of ${total}`);
    fireEvent.click(within(panel).getByRole('button', { name: `Correct ${correct}` }));
    expect(within(panel).getByRole('status')).toHaveTextContent(`Showing ${correct} correct first answers of ${total}`);
    expect(within(panel).getByRole('img')).toHaveAccessibleName(`${correct} correct and ${missed} missed of ${total} first answers`);
    fireEvent.click(within(panel).getAllByRole('button', { name: /PT .*First answer Correct/ })[0]);
    expect(screen.getByRole('region', { name: 'Saved answer detail' })).toHaveFocus();
  });

  it('resets the local evidence filter when changing period', () => {
    renderPreview();
    const panel = screen.getByRole('region', { name: 'Question-type evidence' });
    fireEvent.click(within(panel).getByRole('button', { name: `All ${selectedTopicCounts().total}` }));
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
    fireEvent.click(within(history).getByRole('button', { name: /PT 104 .*Question 17 .*First available answer Missed/ }));
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
    // A single type with more than nine correct first answers, so a ninth row exists.
    const answers: GradedQuestionAnswer[] = Array.from({ length: 11 }, (_, index) => ({ ...demoAnswers[0], attemptId: `many-${index}`, questionKey: `LR:PT101-S2-Q${index + 1}`, topic: 'Flaw', correct: index < 10, gradedAt: `2026-10-${10 + index}T15:00:00Z` }));
    render(<MemoryRouter initialEntries={['/progress?window=30']}><ProgressPrototype answers={answers} coverage={demoCoverage} asOf={DEMO_AS_OF} /></MemoryRouter>);
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

describe('production presenter', () => {
  const renderProduction = (view: 'overview' | 'types' | 'history' = 'overview', search = '', extra: Partial<React.ComponentProps<typeof ProgressPrototype>> = {}) => render(
    <MemoryRouter initialEntries={[`/progress/${view}${search}`]}>
      <ProgressPrototype production view={view} window={30} onWindowChange={vi.fn()} answers={demoAnswers} coverage={demoCoverage} asOf={DEMO_AS_OF} checkedAt={Date.parse(DEMO_AS_OF)} {...extra} />
      <LocationProbe />
    </MemoryRouter>);

  it('has no preview notice, design switcher or local section navigation', () => {
    renderProduction('overview', '?variant=timeline');
    expect(screen.queryByText(/Design preview/)).not.toBeInTheDocument();
    expect(screen.queryByText(/demonstration data/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Design comparison')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Progress view' })).not.toBeInTheDocument();
    // variant is ignored: the desk composition renders
    expect(screen.getByRole('region', { name: 'Question-type evidence' })).toBeInTheDocument();
    expect(screen.getByText('Checked Oct 27, 11:00 PM EDT')).toBeInTheDocument();
  });

  it('shows the same totals as the demo presenter for identical inputs', () => {
    const production = renderProduction();
    const productionTotals = document.querySelector('.pp-big-number')!.textContent;
    production.unmount();
    renderPreview();
    expect(document.querySelector('.pp-big-number')!.textContent).toBe(productionTotals);
  });

  it('keeps the full accuracy denominator while limiting recent production tiles to twelve', () => {
    renderProduction();
    const mosaic = screen.getByRole('region', { name: 'Recent first answers' });
    expect(within(mosaic).getAllByRole('button')).toHaveLength(12);
    expect(within(mosaic).getByText('Latest 12 in this period')).toBeInTheDocument();
    const model = buildPrototypeModel(demoAnswers, demoCoverage, 30, DEMO_AS_OF);
    expect(document.querySelector('.pp-big-number')).toHaveTextContent(`${model.progress.LR.percent}%`);
    expect(document.querySelector('.pp-summary-line')).toHaveTextContent(`${model.progress.LR.correct} correctof ${model.progress.LR.denominator} first answers`);
  });

  it('clears saved-answer detail when a successful snapshot advances with identical answers', () => {
    const tree = (asOf: string) => <MemoryRouter initialEntries={['/progress/overview']}>
      <ProgressPrototype production view="overview" window={30} onWindowChange={vi.fn()} answers={demoAnswers} coverage={demoCoverage} asOf={asOf} />
    </MemoryRouter>;
    const rendered = render(tree(DEMO_AS_OF));
    openRecentAnswer();
    const detail = screen.getByRole('region', { name: 'Saved answer detail' });
    rendered.rerender(tree('2026-10-28T04:00:00Z'));
    expect(detail).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(detail);
    expect(document.activeElement?.isConnected).toBe(true);
  });

  it('includes years in all-time interval endpoints and the chart axis across multiple years', () => {
    const answers: GradedQuestionAnswer[] = [
      { ...demoAnswers[0], attemptId: 'year-2024', questionKey: 'LR:PT101-S2-Q1', gradedAt: '2024-01-02T15:00:00Z' },
      { ...demoAnswers[1], attemptId: 'year-2026', questionKey: 'LR:PT101-S2-Q2', gradedAt: '2026-10-26T15:00:00Z' },
    ];
    renderProduction('overview', '', { answers, window: 'all' });
    const chart = screen.getByRole('region', { name: 'First-answer volume' });
    const intervals = within(chart).getByRole('group', { name: 'Practice intervals' });
    const bars = within(intervals).getAllByRole('button');
    expect(bars[0]).toHaveAccessibleName(/^Jan 2, 2024, .* to .*2024,/);
    expect(bars.at(-1)).toHaveAccessibleName(/2026, .* to Oct 27, 2026,/);
    for (const bar of bars) expect(bar.textContent).toMatch(/20(?:24|25|26)/);
    fireEvent.click(bars[0]);
    expect(within(chart).getByText(/Jan 2, 2024, .* to .*2024, .*end time belongs/)).toBeInTheDocument();
  });

  it('uses the route view and leads with the recommended type', () => {
    renderProduction('types');
    const topic = selectedTopicCounts().topic;
    expect(within(screen.getByRole('region', { name: 'Question-type evidence' })).getByRole('heading', { name: topic })).toBeInTheDocument();
    expect(screen.getByText('Look here first')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'First-answer volume' })).not.toBeInTheDocument();
  });

  it('switches Overview evidence and the suggested inspection to the selected subject', () => {
    renderProduction();
    const model = buildPrototypeModel(demoAnswers, demoCoverage, 30, DEMO_AS_OF);
    const { correct, denominator } = model.progress.RC;
    const missed = denominator - correct;
    fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    const evidence = screen.getByRole('region', { name: 'RC answer evidence' });
    expect(within(evidence).getByRole('img')).toHaveAccessibleName(`${correct} correct and ${missed} missed of ${denominator} first answers`);
    const rows = within(evidence).getAllByRole('button', { name: /^Passage .*First answer/ });
    expect(rows.length).toBeGreaterThan(0);
    expect(within(evidence).queryByRole('button', { name: /^PT / })).not.toBeInTheDocument();
    const focus = screen.getByRole('complementary', { name: 'Where to look first' });
    expect(focus).toHaveTextContent('Where to look first · RC');
    expect(focus).toHaveTextContent(`${missed} of ${denominator} first answers missed`);
    expect(within(focus).getByRole('heading', { name: 'Your missed RC answers' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Question-type evidence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Question types' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logical Reasoning' }));
    expect(screen.getByRole('region', { name: 'Question-type evidence' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'RC answer evidence' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Where to look first' })).toHaveTextContent('Where to look first · LR');
  });

  it('keeps complete RC evidence available when an LR source is missing', () => {
    const coverage = { ...demoCoverage, missingSources: [{ source: 'lr_section_history' as const, reason: 'Unavailable' }] };
    renderProduction('overview', '', { coverage });
    fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    const evidence = screen.getByRole('region', { name: 'RC answer evidence' });
    expect(within(evidence).getByRole('img')).toBeInTheDocument();
    expect(within(evidence).getAllByRole('button', { name: /^Passage .*First answer/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('complementary', { name: 'Where to look first' })).not.toHaveTextContent('history is incomplete');
  });

  it('withholds RC accuracy and recommendations when RC history is incomplete', () => {
    const coverage = { ...demoCoverage, missingSources: [{ source: 'rc_sessions' as const, reason: 'Unavailable' }] };
    renderProduction('overview', '', { coverage });
    fireEvent.click(screen.getByRole('button', { name: 'Reading Comp.' }));
    const evidence = screen.getByRole('region', { name: 'RC answer evidence' });
    expect(within(evidence).getByText('Complete RC history is needed before showing accuracy.')).toBeInTheDocument();
    expect(within(evidence).queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('.pp-big-number')).toHaveTextContent('Unavailable');
    const focus = screen.getByRole('complementary', { name: 'Where to look first' });
    expect(within(focus).getByRole('heading', { name: 'RC history is incomplete' })).toBeInTheDocument();
    expect(within(focus).queryByRole('button', { name: 'Inspect missed answers' })).not.toBeInTheDocument();
  });

  it('keeps the question-types route explicitly LR only', () => {
    renderProduction('types');
    expect(screen.queryByRole('group', { name: 'Subject' })).not.toBeInTheDocument();
    expect(screen.getByText('First-answer accuracy · LR')).toBeInTheDocument();
    expect(screen.queryByText('First-answer accuracy · RC')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question-type evidence' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'RC answer evidence' })).not.toBeInTheDocument();
    expect(screen.getByText(/RC answers are included in Overview and History/)).toBeInTheDocument();
  });

  it('lists the evidence before the volume chart on Overview', () => {
    renderProduction();
    const evidence = screen.getByRole('region', { name: 'Question-type evidence' });
    const chart = screen.getByRole('region', { name: 'First-answer volume' });
    expect(evidence.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sends the period change to the container and states a failed refresh', () => {
    const onWindowChange = vi.fn();
    const onRefresh = vi.fn();
    renderProduction('overview', '', { onWindowChange, onRefresh, refreshError: 'We could not refresh your saved answers.' });
    expect(screen.getByRole('alert')).toHaveTextContent('We could not refresh your saved answers.');
    fireEvent.change(screen.getByRole('combobox', { name: 'Progress period' }), { target: { value: 'all' } });
    expect(onWindowChange).toHaveBeenCalledWith('all');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('offers a general Review link and never promises the selected question opens', () => {
    renderProduction();
    openRecentAnswer();
    const link = within(screen.getByRole('region', { name: 'Saved answer detail' })).getByRole('link', { name: 'Review' });
    expect(link).toHaveAttribute('href', '/review/to-review');
    expect(screen.getByText(/does not open this exact question/)).toBeInTheDocument();
  });

  it('says first available answer in history rows under partial sources', () => {
    const coverage = { ...demoCoverage, missingSources: [{ source: 'lr_section_history' as const, reason: 'x' }] };
    renderProduction('history', '', { coverage });
    expect(screen.getAllByRole('button', { name: /First available answer/ }).length).toBeGreaterThan(0);
  });
});

describe('history URL contract', () => {
  function BackButton() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate(-1)}>Browser back</button>;
  }
  function ExternalHistoryNavigation() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/progress/history?historyResult=missed')}>Open another history URL</button>;
  }
  const renderHistory = (entries: string[]) => render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <ProgressPrototype production view="history" window="all" onWindowChange={vi.fn()} answers={demoAnswers} coverage={demoCoverage} asOf={DEMO_AS_OF} />
      <LocationProbe /><BackButton /><ExternalHistoryNavigation />
    </MemoryRouter>);
  const url = () => new URL(screen.getByLabelText('Current preview URL').textContent!, 'https://example.test');

  it.each(['filter', 'reset', 'external navigation'] as const)('clears the focused saved-answer inspector on history %s', (change) => {
    renderHistory([change === 'reset' ? '/progress/history?historyResult=missed' : '/progress/history']);
    const history = screen.getByRole('region', { name: 'Practice history' });
    const opener = within(history).getAllByRole('button', { name: /PT .*First answer/ })[0];
    opener.focus();
    fireEvent.click(opener);
    const detail = screen.getByRole('region', { name: 'Saved answer detail' });
    expect(detail).toHaveFocus();
    if (change === 'filter') fireEvent.change(screen.getByRole('combobox', { name: 'History area' }), { target: { value: 'RC' } });
    if (change === 'reset') fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    if (change === 'external navigation') fireEvent.click(screen.getByRole('button', { name: 'Open another history URL' }));
    expect(detail).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(detail);
    expect(document.activeElement?.isConnected).toBe(true);
  });

  it('opens a legacy RC + missed deep link with both filters active and shown', () => {
    renderHistory(['/progress/history?historyArea=RC&historyResult=missed']);
    expect(screen.getByRole('combobox', { name: 'History area' })).toHaveValue('RC');
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByLabelText('Active filters')).getByText('RC')).toBeInTheDocument();
    const expected = demoAnswers.filter((row) => row.area === 'RC' && !row.correct).length;
    expect(document.querySelector('.pp-count')).toHaveTextContent(`${expected} ${expected === 1 ? 'answer' : 'answers'}`);
  });

  it('writes filters with replace semantics so Back leaves the section, not the last filter', () => {
    renderHistory(['/progress/overview', '/progress/history?historyArea=RC&historyResult=missed&window=7']);
    fireEvent.change(screen.getByRole('combobox', { name: 'History area' }), { target: { value: 'LR' } });
    fireEvent.click(screen.getByRole('button', { name: 'First answers' }));
    expect(url().searchParams.get('historyArea')).toBe('LR');
    expect(url().searchParams.get('historyAnswer')).toBe('first');
    expect(url().searchParams.get('historyResult')).toBe('missed');
    expect(url().searchParams.get('window')).toBe('7');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(url().pathname).toBe('/progress/overview');
  });

  it('renders question order as one flat ordered list, and date groups again for oldest first', () => {
    renderHistory(['/progress/history?historySort=question']);
    expect(document.querySelector('.pp-day-group')).toBeNull();
    const keys = [...document.querySelectorAll('.pp-flat-list .pp-evidence-row strong')]
      .map((node) => /PT (\d+) · Section (\d+) · Question (\d+)/.exec(node.textContent!)).filter(Boolean)
      .map((match) => match!.slice(1).map(Number));
    expect(keys.length).toBeGreaterThan(1);
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]));
    fireEvent.change(screen.getByRole('combobox', { name: 'History order' }), { target: { value: 'oldest' } });
    expect(document.querySelector('.pp-day-group')).not.toBeNull();
  });

  it('keeps unrelated parameters and clears only history filters on reset', () => {
    renderHistory(['/progress/history?historyResult=missed&historySearch=PT&window=14&other=1']);
    expect(screen.getByLabelText('Active filters')).toHaveTextContent('Missed');
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(url().searchParams.get('historyResult')).toBeNull();
    expect(url().searchParams.get('historySearch')).toBeNull();
    expect(url().searchParams.get('window')).toBe('14');
    expect(url().searchParams.get('other')).toBe('1');
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });
});
