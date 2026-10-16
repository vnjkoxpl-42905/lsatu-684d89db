import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DeskChatPanel } from './DeskChatPanel';
import type { OperatorMessage } from '@/hooks/useOperatorChat';

let mockMessages: OperatorMessage[] = [];

vi.mock('@/components/teacher/ai-ta/OperatorChatProvider', () => ({
  useOperatorChatContext: () => ({
    messages: mockMessages,
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useHubStudents', () => ({
  useHubStudents: () => ({ rows: [], loading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}));

function renderChat(localPreview = false) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <DeskChatPanel localPreview={localPreview} />
    </MemoryRouter>,
  );
}

describe('DeskChatPanel layout', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    mockMessages = [];
  });

  it('bottom-anchors the composer by making the transcript the growable scroll area', () => {
    renderChat(true);

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
    renderChat(false);

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));

    const canvas = screen.getByRole('region', { name: 'Collaborative Workspace' });
    expect(within(canvas).getByRole('heading', { name: 'Collaborative Workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Assistant instructions')).toBeInTheDocument();
    fireEvent.click(within(canvas).getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('menuitem', { name: 'Export as Markdown' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(within(canvas).getByRole('button', { name: 'Close canvas' }));

    expect(screen.queryByRole('region', { name: 'Collaborative Workspace' })).not.toBeInTheDocument();
    expect(screen.getByText('What can I help you get done?')).toBeInTheDocument();
  });

  it('removes the canvas from the page through the composer Canvas chip close button', () => {
    renderChat(false);

    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }));
    expect(screen.getByRole('region', { name: 'Collaborative Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open canvas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Canvas' }));

    expect(screen.queryByRole('region', { name: 'Collaborative Workspace' })).not.toBeInTheDocument();
    expect(screen.getByText('What can I help you get done?')).toBeInTheDocument();
  });

  it('opens assistant link results beside the chat without replacing the transcript', () => {
    mockMessages = [
      {
        id: 'assistant-activity-link',
        role: 'assistant',
        content: 'I found the Activity Centre.',
        created_at: '2026-06-20T12:00:00.000Z',
        tool_results: [
          {
            name: 'find_link',
            arguments: { query: 'activity centre' },
            result: {
              ok: true,
              data: {
                results: [
                  {
                    id: 'activity-centre',
                    kind: 'route',
                    source_id: '/activities',
                    title: 'Activity Centre',
                    subtitle: 'Student activity centre',
                    url: '/activities',
                  },
                ],
              },
            },
          },
        ],
      },
    ];

    renderChat(false);

    fireEvent.click(screen.getByRole('button', { name: 'Open beside chat' }));

    const preview = screen.getByRole('region', { name: 'Resource preview' });
    expect(within(preview).getByRole('heading', { name: 'Activity Centre' })).toBeInTheDocument();
    expect(screen.getByText('I found the Activity Centre.')).toBeInTheDocument();
    expect(screen.getByTitle('Activity Centre preview')).toHaveAttribute('src', 'http://localhost:3000/activities');
  });

  it('renders assignment offers as the primary action and opens their resource beside chat', () => {
    mockMessages = [
      {
        id: 'assistant-assignment-offer',
        role: 'assistant',
        content: 'Confirm this assignment for **Dakota Brown**.',
        created_at: '2026-06-20T12:00:00.000Z',
        tool_results: [
          {
            name: 'find_link',
            arguments: { query: 'negation station' },
            result: {
              ok: true,
              data: {
                results: [
                  {
                    id: 'negation-station',
                    kind: 'activity',
                    source_id: 'activity-negation',
                    title: 'Negation Station',
                    subtitle: 'Statement Negation Drill',
                    url: '/activities',
                  },
                ],
              },
            },
          },
          {
            name: 'create_assignment_offer',
            arguments: {},
            result: {
              ok: true,
              data: {
                assignment_offer: {
                  id: 'offer-1',
                  student_id: 'student-dakota',
                  student_name: 'Dakota Brown',
                  resource: {
                    title: 'Negation Station',
                    kind: 'activity',
                    source_id: 'activity-negation',
                    url: '/activities',
                    subtitle: 'Statement Negation Drill',
                  },
                },
              },
            },
          },
        ],
      },
    ];

    renderChat(false);

    expect(screen.getByText('Send Negation Station')).toBeInTheDocument();
    expect(screen.getByText('to Dakota Brown')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign to student' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open beside chat' }));

    const preview = screen.getByRole('region', { name: 'Resource preview' });
    expect(within(preview).getByRole('heading', { name: 'Negation Station' })).toBeInTheDocument();
    expect(screen.getByTitle('Negation Station preview')).toHaveAttribute('src', 'http://localhost:3000/activities');
  });

});
