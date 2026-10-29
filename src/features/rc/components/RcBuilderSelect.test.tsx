import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { RcBuilderSelect } from './RcBuilderSelect';
import { chooseRcValue } from './rcSelectTestUtils';

const options = [{ value: '140', label: '140' }, { value: '141', label: '141' }];

describe('RC builder select', () => {
  it('renders a stale value as a placeholder without changing the owner draft', () => {
    const change = vi.fn();
    render(<RcBuilderSelect label="Test" value="139" options={options} onValueChange={change} placeholder="Select a test" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select a test');
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps the selected check state and maps per-field reset back to empty', () => {
    const change = vi.fn();
    render(<RcBuilderSelect label="Test" value="140" options={options} onValueChange={change} resetLabel="Clear test" />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(screen.getByRole('option', { name: '140' })).toHaveAttribute('data-state', 'checked');
    fireEvent.click(screen.getByRole('option', { name: 'Clear test' }));
    expect(change).toHaveBeenCalledWith('');
  });

  it('opens from the keyboard and selects with Enter', () => {
    const change = vi.fn();
    render(<RcBuilderSelect label="Test" value="140" options={options} onValueChange={change} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('option', { name: '141' }), { key: 'Enter' });
    expect(change).toHaveBeenCalledWith('141');
  });

  it('does not offer a disabled option as an available choice', () => {
    const change = vi.fn();
    render(<RcBuilderSelect label="Test" value="140" options={[options[0], { ...options[1], disabled: true }]} onValueChange={change} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    const option = screen.getByRole('option', { name: '141' });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(option);
    expect(change).not.toHaveBeenCalled();
  });

  it('updates the closed trigger when the current profile label resolves', () => {
    const { rerender } = render(<RcBuilderSelect id="timing" label="Timing" value="standard" options={[{ value: 'standard', label: 'Standard pace · 8:45 per passage' }]} onValueChange={() => {}} />);
    rerender(<RcBuilderSelect id="timing" label="Timing" value="standard" options={[{ value: 'standard', label: 'Profile pace · 17:30 per passage' }]} onValueChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Timing' })).toHaveTextContent('Profile pace · 17:30 per passage');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'timing');
  });

  it('keeps dependent fields disabled without opening a menu', () => {
    render(<RcBuilderSelect label="Section" value="" options={[]} placeholder="Test first" disabled onValueChange={() => {}} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Test first');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('portals a drawer menu and Escape closes the menu before the drawer', async () => {
    function Drawer() {
      const [open, setOpen] = React.useState(true);
      return <Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetTitle>Customize</SheetTitle><SheetDescription>Practice options</SheetDescription><RcBuilderSelect label="Test" value="140" options={options} onValueChange={() => {}} /></SheetContent></Sheet>;
    }
    render(<Drawer />);
    const drawer = screen.getByRole('dialog');
    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(drawer).not.toContainElement(screen.getByRole('listbox'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('selects an option from the portaled list through the real component', () => {
    const change = vi.fn();
    render(<RcBuilderSelect label="Test" value="140" options={options} onValueChange={change} />);
    chooseRcValue(screen.getByRole('combobox'), '141');
    expect(change).toHaveBeenCalledWith('141');
  });
});
