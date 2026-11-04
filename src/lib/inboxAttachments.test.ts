import {
  buildExternalWorkUploadInsert,
  classifyInboxAttachmentMime,
  validateInboxAttachment,
} from '@/lib/inboxAttachments';

describe('validateInboxAttachment', () => {
  it('accepts pdf attachments', () => {
    expect(validateInboxAttachment({ type: 'application/pdf', size: 1024 })).toBeNull();
  });

  it('accepts screenshot image attachments', () => {
    expect(validateInboxAttachment({ type: 'image/png', size: 1024 })).toBeNull();
    expect(validateInboxAttachment({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateInboxAttachment({ type: 'image/webp', size: 1024 })).toBeNull();
  });

  it('accepts video attachments', () => {
    expect(validateInboxAttachment({ type: 'video/mp4', size: 1024 })).toBeNull();
    expect(validateInboxAttachment({ type: 'video/webm', size: 1024 })).toBeNull();
  });

  it('rejects unsupported attachment types', () => {
    expect(validateInboxAttachment({ type: 'text/plain', size: 1024 })).toBe(
      'Only PDF files, screenshots, and videos are allowed',
    );
  });

  it('rejects files over the size limit', () => {
    expect(validateInboxAttachment({ type: 'application/pdf', size: 20 * 1024 * 1024 + 1 })).toBe(
      'File must be under 20MB',
    );
  });

  it('rejects videos over the video size limit', () => {
    expect(validateInboxAttachment({ type: 'video/mp4', size: 100 * 1024 * 1024 + 1 })).toBe(
      'Video must be under 100MB',
    );
  });
});

describe('classifyInboxAttachmentMime', () => {
  it('classifies previewable attachment kinds', () => {
    expect(classifyInboxAttachmentMime('application/pdf')).toBe('pdf');
    expect(classifyInboxAttachmentMime('image/png')).toBe('image');
    expect(classifyInboxAttachmentMime('video/mp4')).toBe('video');
  });

  it('falls back to generic files for unknown mime types', () => {
    expect(classifyInboxAttachmentMime('application/octet-stream')).toBe('file');
  });
});

describe('buildExternalWorkUploadInsert', () => {
  it('creates an external work row for student-owned storage uploads', () => {
    expect(
      buildExternalWorkUploadInsert({
        senderId: 'student-1',
        senderIsAdmin: false,
        fileName: 'results.png',
        fileType: 'image/png',
        storagePath: 'conversation/message/results.png',
      }),
    ).toMatchObject({
      student_id: 'student-1',
      uploaded_by: 'student-1',
      file_name: 'results.png',
      file_type: 'image/png',
      storage_path: 'conversation/message/results.png',
      upload_type: 'other',
      source_platform: 'inbox',
      processing_status: 'uploaded',
    });
  });

  it('does not create external work rows for admin uploads', () => {
    expect(
      buildExternalWorkUploadInsert({
        senderId: 'admin-1',
        senderIsAdmin: true,
        fileName: 'answer-key.pdf',
        fileType: 'application/pdf',
        storagePath: 'conversation/message/answer-key.pdf',
      }),
    ).toBeNull();
  });
});
