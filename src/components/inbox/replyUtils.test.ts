import { describe, expect, it } from 'vitest';
import type { Message, MessageAttachment } from '@/hooks/useInbox';
import { REPLY_PREVIEW_MAX, replyPreviewText, resolveReplyQuote } from './replyUtils';

function att(mime_type: string): MessageAttachment {
  return { id: 'a', message_id: 'm', storage_path: 'p', file_name: 'f', file_size: 1, mime_type };
}

function msg(over: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversation_id: 'c1',
    sender_id: 'u1',
    body: 'hello',
    created_at: '2026-11-05T00:00:00Z',
    attachments: [],
    ...over,
  };
}

describe('replyPreviewText', () => {
  it('collapses whitespace and newlines to one line', () => {
    expect(replyPreviewText(msg({ body: '  a\n\n  b   c ' }))).toBe('a b c');
  });

  it('truncates long text with an ellipsis', () => {
    const out = replyPreviewText(msg({ body: 'x'.repeat(REPLY_PREVIEW_MAX + 50) }));
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(REPLY_PREVIEW_MAX + 1);
  });

  it('labels attachment-only messages by kind', () => {
    expect(replyPreviewText(msg({ body: '', attachments: [att('image/png')] }))).toBe('Photo');
    expect(replyPreviewText(msg({ body: '', attachments: [att('application/pdf')] }))).toBe('PDF');
    expect(replyPreviewText(msg({ body: '', attachments: [att('text/plain')] }))).toBe('Attachment');
  });

  it('prefers the words when a message has both', () => {
    expect(replyPreviewText(msg({ body: 'see this', attachments: [att('image/png')] }))).toBe('see this');
  });
});

describe('resolveReplyQuote', () => {
  const byId = new Map([['m1', msg()]]);
  const authorOf = (id: string) => (id === 'u1' ? 'Celia' : 'Joshua');

  it('returns null for a message that is not a reply', () => {
    expect(resolveReplyQuote(null, byId, authorOf)).toBeNull();
    expect(resolveReplyQuote(undefined, byId, authorOf)).toBeNull();
  });

  it('resolves the quoted author and text', () => {
    expect(resolveReplyQuote('m1', byId, authorOf)).toEqual({
      id: 'm1',
      deleted: false,
      author: 'Celia',
      text: 'hello',
    });
  });

  it('reads an id that is not in the thread as deleted', () => {
    expect(resolveReplyQuote('gone', byId, authorOf)).toEqual({ id: 'gone', deleted: true });
  });
});
