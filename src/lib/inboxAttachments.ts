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

// The Help flow attaches a hidden `context.json` metadata blob alongside a
// screenshot. It's internal snapshot data, not a real attachment, so it should
// never render as a file card in any thread view.
export function isVisibleHelpAttachment(attachment: { file_name: string }): boolean {
  return attachment.file_name !== 'context.json';
}

// The Help flow emits a matched pair on one message: a `help-screenshot.png`
// image plus a hidden `context.json` snapshot. When both are present we render
// a single polished screenshot context card instead of a bare file/image card.
export const HELP_SCREENSHOT_FILE_NAME = 'help-screenshot.png';
export const HELP_CONTEXT_FILE_NAME = 'context.json';

export function findHelpContextAttachment<T extends { file_name: string }>(
  attachments: T[],
): T | undefined {
  return attachments.find((a) => a.file_name === HELP_CONTEXT_FILE_NAME);
}

export function findHelpScreenshotAttachment<
  T extends { file_name: string; mime_type?: string | null },
>(attachments: T[]): T | undefined {
  return attachments.find(
    (a) =>
      a.file_name === HELP_SCREENSHOT_FILE_NAME &&
      (a.mime_type ?? '').startsWith('image/'),
  );
}

// Strip the legacy "— context —" tail that older help messages concatenated
// into the body, plus the bare "[Help request]" placeholder. New messages send
// just the student's text, so this only cleans historical rows.
export function stripHelpContextFromBody(body: string): string {
  if (!body) return '';
  let text = body;
  const marker = text.indexOf('\n\n— context —');
  if (marker >= 0) text = text.slice(0, marker);
  text = text.replace(/^\[Help request\]\s*/, '');
  return text.trim();
}

export function classifyInboxAttachmentMime(mimeType: string | null | undefined): InboxAttachmentPreviewKind {
  if (mimeType === 'application/pdf') return 'pdf';
  if ((mimeType ?? '').startsWith('image/')) return 'image';
  return 'file';
}

export interface ExternalWorkUploadInsertOptions {
  storageBucket?: string;
}

export function buildExternalWorkUploadInsert(
  input: ExternalWorkUploadInsertInput,
  options: ExternalWorkUploadInsertOptions = {},
) {
  if (input.senderIsAdmin) return null;
  return {
    student_id: input.senderId,
    uploaded_by: input.senderId,
    file_name: input.fileName,
    file_type: input.fileType,
    storage_path: input.storagePath,
    storage_bucket: options.storageBucket ?? 'external-work-uploads',
    upload_type: 'other' as const,
    source_platform: 'inbox',
    processing_status: 'uploaded' as const,
  };
}
