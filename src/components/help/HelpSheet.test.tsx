import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HelpSheet from './HelpSheet';

const {
  mockUseAuth,
  mockUseConversationMessages,
  mockStartJoshuaConversation,
  mockCaptureViewportPng,
  mockUpload,
  mockRefresh,
  mockMessageInsert,
  mockAttachmentInsert,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseConversationMessages: vi.fn(),
  mockStartJoshuaConversation: vi.fn(),
  mockCaptureViewportPng: vi.fn(),
  mockUpload: vi.fn(),
  mockRefresh: vi.fn(),
  mockMessageInsert: vi.fn(),
  mockAttachmentInsert: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/joshuaThread', () => ({
  startJoshuaConversation: () => mockStartJoshuaConversation(),
}));

vi.mock('@/lib/helpScreenshot', () => ({
  captureViewportPng: (filename: string) => mockCaptureViewportPng(filename),
}));

vi.mock('@/hooks/useInbox', () => ({
  useConversationMessages: (conversationId: string | null) => mockUseConversationMessages(conversationId),
}));

vi.mock('@/components/inbox/AttachmentCard', () => ({
  AttachmentCard: ({ attachment }: { attachment: { file_name: string; mime_type: string } }) =>
    attachment.mime_type.startsWith('image/') ? (
      <img alt={attachment.file_name} src="https://example.test/screenshot.png" />
    ) : (
      <div>{attachment.file_name}</div>
    ),
}));

vi.mock('@/components/inbox/ScreenshotContextCard', () => ({
  ScreenshotContextCard: ({ image }: { image: { file_name: string } }) => (
    <div>
      <img alt={image.file_name} src="https://example.test/screenshot.png" />
      <span>Screenshot attached</span>
    </div>
  ),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'messages') {
        return {
          insert: mockMessageInsert,
        };
      }
      if (table === 'message_attachments') {
        return {
          insert: mockAttachmentInsert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function pngFile() {
  return new File([new Blob(['png'], { type: 'image/png' })], 'help-screenshot.png', {
    type: 'image/png',
  });
}

describe('HelpSheet', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:https://example.test/help-screenshot'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' } });
    mockStartJoshuaConversation.mockResolvedValue('conversation-1');
    mockCaptureViewportPng.mockResolvedValue(pngFile());
    mockRefresh.mockResolvedValue(undefined);
    mockMessageInsert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: 'message-1' }, error: null }),
      }),
    });
    mockAttachmentInsert.mockResolvedValue({ error: null });
    mockUpload.mockResolvedValue({ error: null });
    mockUseConversationMessages.mockReturnValue({
      messages: [],
      loading: false,
      refresh: mockRefresh,
      deleteMessage: vi.fn(),
    });
  });

  it('renders help screenshots as visible image attachments and hides context json', async () => {
    mockUseConversationMessages.mockReturnValue({
      messages: [
        {
          id: 'message-1',
          conversation_id: 'conversation-1',
          sender_id: 'student-1',
          body: '[Help request]\n\n— context —\npage: /classroom',
          created_at: new Date().toISOString(),
          attachments: [
            {
              id: 'att-1',
              message_id: 'message-1',
              storage_path: 'conversation-1/message-1/help-screenshot.png',
              file_name: 'help-screenshot.png',
              file_size: 196_000,
              mime_type: 'image/png',
              kind: 'storage',
            },
            {
              id: 'att-2',
              message_id: 'message-1',
              storage_path: 'conversation-1/message-1/context.json',
              file_name: 'context.json',
              file_size: 120,
              mime_type: 'application/json',
              kind: 'storage',
            },
          ],
        },
      ],
      loading: false,
      refresh: mockRefresh,
      deleteMessage: vi.fn(),
    });

    render(<HelpSheet open onOpenChange={vi.fn()} />);

    expect(await screen.findByAltText('help-screenshot.png')).toBeInTheDocument();
    expect(screen.getByText(/Screenshot attached/)).toBeInTheDocument();
    expect(screen.queryByText('context.json')).not.toBeInTheDocument();
  });

  it('uploads the captured screenshot when sending a screenshot-only help request', async () => {
    render(<HelpSheet open onOpenChange={vi.fn()} />);

    await screen.findByText('Screenshot ready');
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(
        'conversation-1/message-1/help-screenshot.png',
        expect.any(File),
        expect.objectContaining({ contentType: 'image/png' }),
      );
    });
    expect(mockMessageInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conversation-1',
        sender_id: 'student-1',
        body: expect.stringContaining('[Help request]'),
      }),
    );
    expect(mockAttachmentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: 'message-1',
        file_name: 'help-screenshot.png',
        mime_type: 'image/png',
      }),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });
});
