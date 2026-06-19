import { fireEvent, render, screen, within } from '@testing-library/react';
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
    const chatColumn = transcript?.parentElement;

    expect(chatColumn).toHaveClass('flex', 'min-h-0', 'min-w-0', 'flex-col');
    expect(transcript).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByLabelText('Assistant instructions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improve writing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Canvas Draft reply' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend next work' })).toBeInTheDocument();
  });

  it('opens and closes the collaborative canvas from the composer action', () => {
    render(<DeskChatPanel localPreview={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));

    const canvas = screen.getByRole('region', { name: 'Collaborative Workspace' });
    expect(within(canvas).getByRole('heading', { name: 'Collaborative Workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Assistant instructions')).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole('button', { name: 'Close canvas' }));

    expect(screen.queryByRole('region', { name: 'Collaborative Workspace' })).not.toBeInTheDocument();
    expect(screen.getByText('What can I help you get done?')).toBeInTheDocument();
  });
});
