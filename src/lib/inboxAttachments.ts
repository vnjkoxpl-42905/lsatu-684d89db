export const MAX_INBOX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

const ALLOWED_INBOX_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export type InboxAttachmentPreviewKind = 'pdf' | 'image' | 'file';

export interface InboxAttachmentInput {
  type: string;
  size: number;
}

export interface ExternalWorkUploadInsertInput {
  senderId: string;
  senderIsAdmin: boolean;
  fileName: string;
  fileType: string;
  storagePath: string;
}

export function validateInboxAttachment(file: InboxAttachmentInput): string | null {
  if (!ALLOWED_INBOX_ATTACHMENT_TYPES.has(file.type)) {
    return 'Only PDF files and screenshots are allowed';
  }
  if (file.size > MAX_INBOX_ATTACHMENT_SIZE) {
    return 'File must be under 20MB';
  }
  return null;
}

export function classifyInboxAttachmentMime(mimeType: string | null | undefined): InboxAttachmentPreviewKind {
  if (mimeType === 'application/pdf') return 'pdf';
  if ((mimeType ?? '').startsWith('image/')) return 'image';
  return 'file';
}

export function buildExternalWorkUploadInsert(input: ExternalWorkUploadInsertInput) {
  if (input.senderIsAdmin) return null;
  return {
    student_id: input.senderId,
    uploaded_by: input.senderId,
    file_name: input.fileName,
    file_type: input.fileType,
    storage_path: input.storagePath,
    upload_type: 'other' as const,
    source_platform: 'inbox',
    processing_status: 'uploaded' as const,
  };
}
