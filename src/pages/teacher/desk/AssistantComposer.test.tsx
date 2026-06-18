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

  it('shows the seed action only when one is provided', () => {
    const onSeed = vi.fn();
    const { rerender } = render(
      <AssistantComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled={false}
        placeholder="draft a reply..."
        seedAction={{ label: 'Draft with AI', onClick: onSeed }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Draft with AI' }));
    expect(onSeed).toHaveBeenCalledTimes(1);

    rerender(
      <AssistantComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        disabled={false}
        placeholder="draft a reply..."
      />,
    );

    expect(screen.queryByRole('button', { name: 'Draft with AI' })).not.toBeInTheDocument();
  });
});
