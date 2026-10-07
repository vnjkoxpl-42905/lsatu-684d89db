import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskChatRail } from './DeskChatRail';

const chatContext = {
  conversations: [
    {
      id: 'conversation-1',
      title: 'Review Dakota assignment',
      updated_at: '2026-06-19T12:00:00.000Z',
    },
    {
      id: 'conversation-2',
      title: '',
      updated_at: '2026-06-19T11:00:00.000Z',
    },
  ],
  conversationId: 'conversation-1',
  newConversation: vi.fn(),
  openConversation: vi.fn(),
  deleteConversation: vi.fn(),
};

vi.mock('@/components/teacher/ai-ta/OperatorChatProvider', () => ({
  useOperatorChatContext: () => chatContext,
}));

describe('DeskChatRail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    chatContext.newConversation.mockClear();
    chatContext.openConversation.mockClear();
    chatContext.deleteConversation.mockClear();
  });

  it('renders saved conversations and opens a selected chat', () => {
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: /^Review Dakota assignment/ }));

    expect(screen.getByText('Review Dakota assignment')).toBeInTheDocument();
    expect(screen.getByText('New conversation')).toBeInTheDocument();
    expect(chatContext.openConversation).toHaveBeenCalledWith('conversation-1');
  });

  it('opens an in-app delete modal instead of a browser confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete chat?' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('This will permanently delete Review Dakota assignment and its messages.');
    expect(within(dialog).getByText('Review Dakota assignment')).toHaveClass('font-semibold');
    expect(chatContext.deleteConversation).not.toHaveBeenCalled();
  });

  it('closes the delete modal without deleting when cancelled', () => {
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog', { name: 'Delete chat?' })).not.toBeInTheDocument();
    expect(chatContext.deleteConversation).not.toHaveBeenCalled();
  });

  it('deletes from the modal without opening the chat', () => {
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete chat?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(chatContext.deleteConversation).toHaveBeenCalledWith('conversation-1');
    expect(chatContext.openConversation).not.toHaveBeenCalled();
  });
});
