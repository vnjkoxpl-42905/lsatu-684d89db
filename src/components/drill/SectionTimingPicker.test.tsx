/**
 * The section clock, from the keyboard.
 *
 * The popup was one role="listbox" painted over pace rows, two steppers and a
 * link, with no key handler and no aria-activedescendant: a screen reader was
 * told "list of options" and then had to Tab through buttons. Now the rows are
 * the listbox, the arrow keys walk them, the popup opens on the chosen row,
 * and the steppers keep focus across a press (they were re-declared on every
 * render, so each press remounted the button under the cursor).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import SectionTimingPicker, { STANDARD_TIMING, type SectionTiming } from './SectionTimingPicker';

function Harness({ initial = STANDARD_TIMING }: { initial?: SectionTiming }) {
  const [value, setValue] = React.useState<SectionTiming>(initial);
  return (
    <MemoryRouter>
      <SectionTimingPicker value={value} onChange={setValue} baseMinutes={35} questionCount={25} />
    </MemoryRouter>
  );
}

const open = async () => {
  fireEvent.click(screen.getByRole('combobox', { name: /Timing/i }));
  return screen.findByRole('listbox', { name: /Pace/ });
};

describe('SectionTimingPicker', () => {
  it('opens on the row that is already chosen', async () => {
    render(<Harness initial={{ mode: 'timed', percent: 94 }} />);
    await open();
    expect(document.activeElement).toBe(screen.getByRole('option', { name: /^94%/ }));
  });

  it('walks the rows with the arrow keys and the ends with Home and End', async () => {
    render(<Harness />);
    const list = await open();
    const names = () => (document.activeElement as HTMLElement).textContent;

    expect(names()).toMatch(/^Standard/);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(names()).toMatch(/^Unlimited/);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(names()).toMatch(/^97%/);
    fireEvent.keyDown(list, { key: 'End' });
    expect(names()).toMatch(/^70%/);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(names()).toMatch(/^70%/);
    fireEvent.keyDown(list, { key: 'Home' });
    expect(names()).toMatch(/^Standard/);
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(names()).toMatch(/^Standard/);
  });

  it('gives the list one Tab stop, and the first row when no row is chosen', async () => {
    render(<Harness initial={{ mode: 'timed', percent: 88 }} />);
    await open();
    const stops = screen.getAllByRole('option').filter((o) => o.tabIndex === 0);
    expect(stops.map((o) => o.textContent)).toHaveLength(1);
    expect(stops[0].textContent).toMatch(/^Standard/);
    expect(document.activeElement).toBe(stops[0]);
  });

  it('keeps the steppers outside the listbox and keeps focus on one across a press', async () => {
    render(<Harness />);
    const list = await open();
    const plus = screen.getByRole('button', { name: /Increase percentage/ });
    expect(list.contains(plus)).toBe(false);

    plus.focus();
    fireEvent.click(plus);
    expect(screen.getByRole('combobox', { name: /Timing/i }).textContent).toMatch(/101%/);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Increase percentage/ }));
  });

  it('chooses a row on Enter, being a button', async () => {
    render(<Harness />);
    await open();
    fireEvent.click(screen.getByRole('option', { name: /^Unlimited/ }));
    expect(screen.getByRole('combobox', { name: /Timing/i }).textContent).toMatch(/Unlimited/);
  });
});
