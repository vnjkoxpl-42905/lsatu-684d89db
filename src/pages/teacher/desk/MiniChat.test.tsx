import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MiniChat } from './MiniChat';
import type { DeskTask } from './deskTasks';

vi.mock('@/hooks/useOperatorChat', () => ({
  useOperatorChat: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    newConversation: vi.fn(),
  }),
}));

function reviewTask(): DeskTask {
  return {
    id: 'review-1',
    mode: 'review',
    verb: 'Review',
    subject: 'Adriana Varea',
    reason: 'next assignment draft waiting',
    timing: 'Today',
    sourceLabel: 'Draft waiting',
    title: 'Review next assignment for Adriana Varea',
    preview: 'Draft preview',
    studentId: 'student-1',
    studentName: 'Adriana Varea',
    suggested: true,
    priority: 90,
    primaryActionLabel: 'Approve draft',
    secondaryActionLabel: 'Open drafts',
    openPath: '/teacher/command?tab=drafts',
    sourceKind: 'draft',
    sourceId: 'draft-1',
    editableText: 'Draft text',
  };
}

describe('MiniChat composer-only rendering', () => {
  it('renders only the chat bar and hides assistant header, transcript, and draft card', () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <MiniChat
          task={reviewTask()}
          variant="draft"
          draft="Hi Adriana. Here is your plan."
          onDraftChange={vi.fn()}
          onSend={vi.fn()}
          sending={false}
          localPreview={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/AI assistant/i)).not.toBeInTheDocument();
    expect(screen.queryByText('DRAFT RECAP')).not.toBeInTheDocument();
    expect(screen.queryByText('DRAFT REPLY')).not.toBeInTheDocument();
    expect(screen.queryByText('Hi Adriana. Here is your plan.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Assistant instructions')).toBeInTheDocument();
  });
});
