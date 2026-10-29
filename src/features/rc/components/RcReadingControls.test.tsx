import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RcLineSpacingMenu, RcTextSettings } from './RcModals';

const defaults = { scheme: 'default' as const, fontSize: 100, lineHeight: 0, paragraphFocus: false };

it('opens spacing with the keyboard and exposes percentage radio choices', () => {
  const onChange = vi.fn();
  render(<RcLineSpacingMenu settings={defaults} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Change line spacing' }), { key: 'Enter' });
  expect(screen.getByRole('menuitemradio', { name: 'Default 100%' }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Medium 150%' }));
  expect(onChange).toHaveBeenCalledWith({ lineHeight: 0.8 });
});

it('keeps an existing saved spacing visible without changing it on opening', () => {
  const onChange = vi.fn();
  render(<RcLineSpacingMenu settings={{ ...defaults, lineHeight: 0.25 }} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Change line spacing' }), { key: 'Enter' });
  expect(screen.getByRole('menuitemradio', { name: 'Saved spacing 116%' }).getAttribute('aria-checked')).toBe('true');
  expect(onChange).not.toHaveBeenCalled();
});

it('offers paragraph focus without changing spacing or color', () => {
  const onChange = vi.fn();
  render(<RcTextSettings settings={defaults} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Paragraph focus' }));
  expect(onChange).toHaveBeenCalledWith({ paragraphFocus: true });
});
