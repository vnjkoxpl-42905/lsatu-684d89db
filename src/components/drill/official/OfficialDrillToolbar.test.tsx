import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OfficialDrillToolbar from './OfficialDrillToolbar';
import { RC_FONT_SCALE_OPTIONS } from '@/features/rc/lib/rcDirections';

describe('OfficialDrillToolbar reading preferences', () => {
  it('selects a text size, closes the dropdown, and exposes the saved current choice on reopening', () => {
    const selectedSize = vi.fn();
    function Toolbar() {
      const [fontScale, setFontScale] = React.useState(1);
      return <OfficialDrillToolbar highlightMode="none" setHighlightMode={vi.fn()} timerLabel=""
        searchTerm="" setSearchTerm={vi.fn()} fontScale={fontScale}
        setFontScale={value => { selectedSize(value); setFontScale(value); }}
        fontScaleOptions={RC_FONT_SCALE_OPTIONS} />;
    }
    render(<Toolbar />);
    const trigger = screen.getByRole('button', { name: 'Text size' });
    fireEvent.click(trigger);
    const preferences = screen.getByRole('dialog', { name: 'Reading preferences' });
    expect(within(preferences).getByRole('button', { name: 'Default (100%)' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(preferences).getByRole('button', { name: 'Large (125%)' }));
    expect(selectedSize).toHaveBeenCalledWith(1.25);
    expect(screen.queryByRole('dialog', { name: 'Reading preferences' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('title', 'Text size: Large (125%)');
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Large (125%)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Current size: Large (125%)')).toBeInTheDocument();
  });
});
