// Shared shapes for the Gmail admin-inbox feature.
// Mirrors the response shapes emitted by supabase/functions/gmail/index.ts.

export type GmailLabelId = string;

export interface GmailLabel {
  id: GmailLabelId;
  name: string;
  type: "system" | "user";
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
  color?: { textColor?: string; backgroundColor?: string };
}

export interface GmailAttachmentMeta {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface GmailThreadSummary {
  id: string;
  historyId?: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate?: string;
  messageCount: number;
  senders: string[];
  labelIds: GmailLabelId[];
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  date: string;
  internalDate?: string;
  text: string;
  html: string;
  attachments: GmailAttachmentMeta[];
  labelIds: GmailLabelId[];
  messageIdHeader: string;
  references: string;
  snippet: string;
}

export interface GmailThreadFull {
  threadId: string;
  historyId?: string;
  messages: GmailMessage[];
}

export interface ListThreadsParams {
  /** Raw Gmail `q` (supports operators like `from:`, `has:attachment`, `label:`). */
  q?: string;
  /** Gmail label ids to constrain to (e.g. `["INBOX", "CATEGORY_PERSONAL"]`). */
  labelIds?: GmailLabelId[];
  /** Page size, capped to 100 by the edge function. */
  maxResults?: number;
  pageToken?: string;
}

export interface ListThreadsResult {
  threads: GmailThreadSummary[];
  nextPageToken: string | null;
}

export interface ModifyThreadParams {
  id: string;
  addLabelIds?: GmailLabelId[];
  removeLabelIds?: GmailLabelId[];
}

export interface BatchModifyParams {
  ids: string[];
  addLabelIds?: GmailLabelId[];
  removeLabelIds?: GmailLabelId[];
}

export interface GmailOutgoingAttachment {
  filename: string;
  mimeType: string;
  /** Base64-encoded file contents (standard base64, not base64url, no data: prefix). */
  dataBase64: string;
}

export interface GmailAttachmentData {
  /** Base64-encoded file contents (standard base64, no data: prefix). */
  dataBase64: string;
  size: number | null;
}

export interface SendMessageParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text: string;
  /** Pass when replying to keep messages in the same Gmail thread. */
  threadId?: string;
  /** Message-ID of the message being replied to. */
  inReplyTo?: string;
  /** Existing References header from the parent, if any. */
  references?: string;
  /** Optional file attachments (encoded client-side, max ~25MB total per Gmail limits). */
  attachments?: GmailOutgoingAttachment[];
}

export interface SendMessageResult {
  /** Gmail's outbound message object (id, threadId, labelIds). */
  id: string;
  threadId: string;
  labelIds?: GmailLabelId[];
}

/** System label ids that Gmail always exposes. */
export const SYSTEM_LABELS = {
  INBOX: "INBOX",
  STARRED: "STARRED",
  SNOOZED: "SNOOZED",
  SENT: "SENT",
  DRAFT: "DRAFT",
  TRASH: "TRASH",
  SPAM: "SPAM",
  UNREAD: "UNREAD",
  IMPORTANT: "IMPORTANT",
  CATEGORY_PERSONAL: "CATEGORY_PERSONAL",
  CATEGORY_SOCIAL: "CATEGORY_SOCIAL",
  CATEGORY_PROMOTIONS: "CATEGORY_PROMOTIONS",
  CATEGORY_UPDATES: "CATEGORY_UPDATES",
  CATEGORY_FORUMS: "CATEGORY_FORUMS",
} as const;

export type SystemLabelId = (typeof SYSTEM_LABELS)[keyof typeof SYSTEM_LABELS];

/** Sidebar folder identifiers (UI-level, mapped to label ids or queries internally). */
export type GmailFolder =
  | "INBOX"
  | "STARRED"
  | "SNOOZED"
  | "SENT"
  | "DRAFT"
  | "ALL"
  | "SPAM"
  | "TRASH";

export type GmailCategory = "primary" | "social" | "promotions" | "updates";
