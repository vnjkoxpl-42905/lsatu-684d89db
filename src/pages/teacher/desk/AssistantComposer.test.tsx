import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistantComposer } from './AssistantComposer';

function renderComposer(
  props: Partial<React.ComponentProps<typeof AssistantComposer>> = {},
) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <AssistantComposer
      value=""
      onChange={onChange}
      onSubmit={onSubmit}
      loading={false}
      disabled={false}
      placeholder="draft a reply..."
      seedAction={undefined}
      {...props}
    />,
  );

  return { onChange, onSubmit };
}

describe('AssistantComposer', () => {
  it('submits non-empty text with Enter', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Make this warmer', onSubmit });

    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), {
      key: 'Enter',
      shiftKey: false,
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps Shift+Enter available for multiline instructions', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Line one', onSubmit });

    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), {
      key: 'Enter',
      shiftKey: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit while empty, loading, or disabled', () => {
    const { rerender } = render(
      <AssistantComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled={false}
        placeholder="draft a reply..."
      />,
    );

    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();

    rerender(
      <AssistantComposer
        value="Draft this"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading
        disabled={false}
        placeholder="draft a reply..."
      />,
    );
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();

    rerender(
      <AssistantComposer
        value="Draft this"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled
        placeholder="draft a reply..."
      />,
    );
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
  });

  it('does not render generic v0 product chips', () => {
    renderComposer({
      seedAction: { label: 'Draft with AI', onClick: vi.fn() },
    });

    expect(screen.queryByRole('button', { name: 'Draft with AI' })).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Clone a Screenshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Import from Figma')).not.toBeInTheDocument();
    expect(screen.queryByText('Landing Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up Form')).not.toBeInTheDocument();
  });

  it('keeps the disabled composer shell visible in read-only preview', () => {
    renderComposer({
      disabled: true,
      readOnlyMessage: 'Assistant is read-only in local preview.',
    });

    expect(screen.getByLabelText('Assistant instructions')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    expect(screen.getByText('Assistant is read-only in local preview.')).toBeInTheDocument();
  });

  it('renders LSAT U teacher utility chips instead of generic v0 actions', () => {
    renderComposer({ placeholder: 'Ask Joshua a question...' });

    expect(screen.getByPlaceholderText('Ask Joshua a question...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open composer actions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Attach material' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Google Drive' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improve writing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas Draft reply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend next work' })).toBeInTheDocument();
  });

  it('opens a ChatGPT-style action menu with real teacher utilities', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));

    expect(screen.getByRole('menuitem', { name: 'Attach file' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Attach material' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Google Drive' })).toBeInTheDocument();
  });

  it('opens a material-type picker with real LSAT U material categories', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Attach material' }));

    expect(screen.getByRole('menuitem', { name: 'Guided drill' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bootcamp lesson/module' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Practice set' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'PT / section assignment' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Reading or lesson page' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Homework/classroom item' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Recap or note' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Student upload/source material' })).toBeInTheDocument();
  });

  it('drops a removable source chip when a source is picked', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Drive' }));

    // The picked source now shows as a removable chip, not a navigation.
    const removeButton = screen.getByRole('button', { name: 'Remove Google Drive' });
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(screen.queryByRole('button', { name: 'Remove Google Drive' })).not.toBeInTheDocument();
  });

  it('does not duplicate a chip when the same source is picked twice', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Drive' }));

    expect(screen.getAllByRole('button', { name: 'Remove Google Drive' })).toHaveLength(1);
  });

  it('forwards attached source labels to onSubmit and clears them', () => {
    const onSubmit = vi.fn();
    renderComposer({ value: 'Draft a reply', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Drive' }));
    fireEvent.keyDown(screen.getByLabelText('Assistant instructions'), { key: 'Enter', shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith(['Google Drive']);
    expect(screen.queryByRole('button', { name: 'Remove Google Drive' })).not.toBeInTheDocument();
  });

  it('picks a material type as a chip instead of firing a utility command', () => {
    const onUtilityCommand = vi.fn();
    renderComposer({ onUtilityCommand });

    fireEvent.click(screen.getByRole('button', { name: 'Open composer actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Attach material' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Guided drill' }));

    expect(screen.getByRole('button', { name: 'Remove Guided drill' })).toBeInTheDocument();
    expect(onUtilityCommand).not.toHaveBeenCalled();
  });

  it('sends teacher utility commands through the provided command handler', () => {
    const onUtilityCommand = vi.fn();
    renderComposer({ onUtilityCommand });

    fireEvent.click(screen.getByRole('button', { name: 'Improve writing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Canvas Draft reply' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recommend next work' }));

    expect(onUtilityCommand).toHaveBeenCalledTimes(3);
    expect(onUtilityCommand.mock.calls[0][0]).toContain('Improve the writing');
    expect(onUtilityCommand.mock.calls[1][0]).toContain('Canvas-style draft reply');
    expect(onUtilityCommand.mock.calls[2][0]).toContain('Recommend the next useful LSAT work');
  });
});
