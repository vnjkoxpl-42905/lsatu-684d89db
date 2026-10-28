import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Analytics from './Analytics';

vi.mock('@/components/analytics/ProgressPage', () => ({ default: ({ view }: { view: string }) => <section aria-label="Progress container">{view}</section> }));

describe('Progress overview route', () => {
  it('renders the real-data Progress container and none of the legacy repeat-based breakdown', () => {
    render(<Analytics />);
    expect(screen.getByRole('region', { name: 'Progress container' })).toHaveTextContent('overview');
    expect(screen.queryByText(/Top Opportunities/)).not.toBeInTheDocument();
  });
});
