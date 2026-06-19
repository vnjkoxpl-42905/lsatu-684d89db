import { fireEvent, render, screen } from '@testing-library/react';
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

  it('confirms before deleting a saved chat', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete this chat? This removes the saved conversation and its messages.',
    );
    expect(chatContext.deleteConversation).toHaveBeenCalledWith('conversation-1');
  });

  it('does not delete when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));

    expect(chatContext.deleteConversation).not.toHaveBeenCalled();
  });

  it('does not open the chat when deleting it', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DeskChatRail />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review Dakota assignment' }));

    expect(chatContext.deleteConversation).toHaveBeenCalledWith('conversation-1');
    expect(chatContext.openConversation).not.toHaveBeenCalled();
  });
});
