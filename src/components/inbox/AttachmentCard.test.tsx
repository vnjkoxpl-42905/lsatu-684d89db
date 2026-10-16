import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentCard } from './AttachmentCard';

const { mockCreateSignedUrl } = vi.hoisted(() => ({
  mockCreateSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('AttachmentCard', () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.test/student-screenshot.png' },
      error: null,
    });
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders message image attachments as visible clickable screenshots', async () => {
    render(
      <AttachmentCard
        attachment={{
          id: 'attachment-1',
          message_id: 'message-1',
          storage_path: 'conversation/message/student-screenshot.png',
          file_name: 'student-screenshot.png',
          file_size: 42_000,
          mime_type: 'image/png',
          kind: 'storage',
        }}
      />,
    );

    expect(await screen.findByAltText('student-screenshot.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /student-screenshot\.png/i }));

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://signed.example.test/student-screenshot.png',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });
});
