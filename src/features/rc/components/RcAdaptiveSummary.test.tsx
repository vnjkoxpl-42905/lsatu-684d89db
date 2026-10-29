import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { RcAdaptiveSummary } from './RcAdaptiveSummary';

it('withholds numerical outcomes while saved results are hidden', () => {
  render(<RcAdaptiveSummary summary={{ hiddenResults: true, firstEver: null, recent: null, reviewCorrections: null, target: null }} />);
  expect(screen.getByText(/Some saved results are still hidden/)).toBeInTheDocument();
  expect(screen.queryByText(/difficulty [0-9]/)).not.toBeInTheDocument();
  expect(screen.queryByText(/% correct/)).not.toBeInTheDocument();
});
it('labels first-ever, recent first-take and review correction samples separately', () => {
  render(<RcAdaptiveSummary summary={{ hiddenResults: false, firstEver: { correct: 2, total: 4 }, recent: { accuracy: .75, total: 4 }, reviewCorrections: 1, target: 3 }} />);
  expect(screen.getByText(/75% correct/)).toBeInTheDocument();
  expect(screen.getByText(/first graded answer ever.*2\/4 correct/)).toBeInTheDocument();
  expect(screen.getByText(/1 question corrected in review.*do not establish mastery/)).toBeInTheDocument();
});
