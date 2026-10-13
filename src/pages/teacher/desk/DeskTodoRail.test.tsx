import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeskTodoRail } from './DeskTodoRail';
import type { TeacherTodoItem } from './teacherTodoTypes';

const dismissMock = vi.fn();
const sendMock = vi.fn();

vi.mock('./teacherTodoDismissals', () => ({
  useDismissTeacherTodo: () => ({ mutate: dismissMock, isPending: false }),
}));

vi.mock('@/features/admin-inbox/gmail/hooks', () => ({
  useGmailThread: () => ({
    data: {
      messages: [
        {
          id: 'message-1',
          threadId: 'thread-1',
          from: 'Lydia <lydia@example.com>',
          to: 'Joshua <joshua@example.com>',
          cc: '',
          bcc: '',
          subject: 'Question',
          date: 'Fri, 19 Jun 2026',
          text: 'verbatim student email body',
          html: '',
          attachments: [],
          labelIds: ['INBOX'],
          messageIdHeader: '<message-1@example.com>',
          references: '',
          snippet: 'verbatim student email body',
        },
      ],
    },
    isLoading: false,
  }),
  useGmailSend: () => ({ mutate: sendMock, isPending: false }),
}));

const gmailItem: TeacherTodoItem = {
  id: 'gmail:thread-1',
  sourceKind: 'gmail',
  sourceId: 'thread-1',
  threadId: 'thread-1',
  priorityBand: 'email',
  label: 'Email',
  subject: 'Lydia Student',
  title: 'Question',
  preview: 'Can you help?',
  timing: '10m waiting',
  sortScore: 3_100,
  from: 'Lydia <lydia@example.com>',
  fromName: 'Lydia',
  fromEmail: 'lydia@example.com',
  subjectLine: 'Question',
  snippet: 'Can you help?',
  internalDate: 1,
  openPath: '/inbox?pane=gmail&t=thread-1',
};

function renderRail(items: TeacherTodoItem[] = [gmailItem], onOpen = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DeskTodoRail items={items} loading={false} onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return { ...result, onOpen };
}

describe('DeskTodoRail', () => {
  beforeEach(() => {
    dismissMock.mockReset();
    sendMock.mockReset();
  });

  it('expands an email row, shows the verbatim message, and can dismiss it', async () => {
    renderRail();

    expect(screen.getByText('Email')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand question/i }));

    expect(await screen.findByText('verbatim student email body')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss question/i }));

    expect(dismissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKind: 'gmail',
        sourceId: 'thread-1',
      }),
    );
  });

  it('sends a Gmail reply from the expanded row', async () => {
    renderRail();

    fireEvent.click(screen.getByRole('button', { name: /expand question/i }));
    fireEvent.change(await screen.findByLabelText(/reply to lydia/i), { target: { value: 'Here is the fix.' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'lydia@example.com',
          subject: 'Question',
          text: 'Here is the fix.',
          threadId: 'thread-1',
          inReplyTo: '<message-1@example.com>',
        }),
        expect.anything(),
      );
    });
  });

  it('inserts the expanded Gmail context into the desk chat', async () => {
    const onInsertInChat = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DeskTodoRail items={[gmailItem]} loading={false} onOpen={vi.fn()} onInsertInChat={onInsertInChat} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /expand question/i }));
    fireEvent.click(await screen.findByRole('button', { name: /insert in chat/i }));

    expect(onInsertInChat).toHaveBeenCalledWith(expect.stringContaining('Use this Gmail thread as context.'));
    expect(onInsertInChat).toHaveBeenCalledWith(expect.stringContaining('verbatim student email body'));
  });

  it('can rewrite Gmail open paths for embedded teacher inbox routing', () => {
    const onOpen = vi.fn();
    renderRail([gmailItem], onOpen);

    fireEvent.click(screen.getByRole('button', { name: /open source/i }));

    expect(onOpen).toHaveBeenCalledWith('/inbox?pane=gmail&t=thread-1');
  });
});
