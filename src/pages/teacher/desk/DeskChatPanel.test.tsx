import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskChatPanel } from './DeskChatPanel';

vi.mock('@/components/teacher/ai-ta/OperatorChatProvider', () => ({
  useOperatorChatContext: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
  }),
}));

describe('DeskChatPanel layout', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  it('bottom-anchors the composer by making the transcript the growable scroll area', () => {
    render(<DeskChatPanel localPreview />);

    const emptyHeading = screen.getByText('What can I help you get done?');
    const transcript = emptyHeading.parentElement?.parentElement;
    const panel = transcript?.parentElement;

    expect(panel).toHaveClass('flex', 'w-full', 'flex-col', 'lg:h-full');
    expect(transcript).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByLabelText('Assistant instructions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improve writing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas Draft reply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend next work' })).toBeInTheDocument();
  });
});
