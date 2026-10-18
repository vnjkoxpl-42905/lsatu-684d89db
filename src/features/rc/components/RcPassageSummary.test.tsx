import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RcPassageSummary } from './RcPassageSummary';
describe('RC passage summary source changes', () => {
  it('announces absent prose instead of rendering an unexplained gap', () => {
    render(<RcPassageSummary summaries={{ standard: '  ', brief: null, anotherWay: null }} />);
    expect(screen.getByText(/No passage summary has been authored/)).toBeInTheDocument();
  });

  it('supports arrow-key summary tabs with a labelled panel', () => {
    render(<RcPassageSummary summaries={{ standard: 'Standard prose', brief: 'Brief prose', anotherWay: null }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show passage summary' }));
    const first = screen.getByRole('tab', { name: 'Standard' });
    first.focus(); fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Brief' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Brief' })).toHaveTextContent('Brief prose');
  });
  it('does not retain a missing variant when navigating to another passage', () => {
    const view = render(<RcPassageSummary summaries={{ standard: 'Original standard', brief: 'Original brief', anotherWay: null }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show passage summary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Brief' }));
    expect(screen.getByText('Original brief')).toBeInTheDocument();
    view.rerender(<RcPassageSummary summaries={{ standard: 'Next passage standard', brief: null, anotherWay: null }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show passage summary' }));
    expect(screen.getByText('Next passage standard')).toBeInTheDocument();
    expect(screen.queryByText('Original brief')).toBeNull();
  });
});
