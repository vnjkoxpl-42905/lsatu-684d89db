import { invokeGmail } from "./gmailClient";
import type { GmailAttachmentData, GmailMessage, SendMessageParams, SendMessageResult } from "./types";

export function getMessage(id: string, format: "full" | "metadata" | "minimal" | "raw" = "full"): Promise<GmailMessage> {
  return invokeGmail<{ ok: true; message: GmailMessage }>({
    action: "getMessage",
    id,
    format,
  }).then((r) => r.message);
}

export function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  return invokeGmail<{ ok: true; message: SendMessageResult }>({
    action: "send",
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    text: params.text,
    threadId: params.threadId,
    inReplyTo: params.inReplyTo,
    references: params.references,
    attachments: params.attachments,
  }).then((r) => r.message);
}

export function getAttachment(messageId: string, attachmentId: string): Promise<GmailAttachmentData> {
  return invokeGmail<{ ok: true; attachment: GmailAttachmentData }>({
    action: "getAttachment",
    messageId,
    attachmentId,
  }).then((r) => r.attachment);
}

/**
 * Parse an RFC 5322 address line into name + email.
 * `"Jane Doe" <jane@x.com>` → `{ name: "Jane Doe", email: "jane@x.com" }`
 * Bare `jane@x.com` → `{ name: "jane@x.com", email: "jane@x.com" }`
 */
export function parseAddress(s: string): { name: string; email: string } {
  if (!s) return { name: "", email: "" };
  const m = s.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (m) return { name: m[1].replace(/(^"|"$)/g, "").trim(), email: m[2].trim() };
  return { name: s, email: s };
}
