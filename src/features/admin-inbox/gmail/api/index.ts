export * from "./types";
export { invokeGmail, GmailApiError } from "./gmailClient";
export {
  listThreads,
  getThread,
  modifyThread,
  trashThread,
  untrashThread,
  batchModifyThreads,
  batchTrashThreads,
} from "./gmailThreads";
export { listHistory, type GmailHistoryResult } from "./gmailHistory";
export { getMessage, sendMessage, getAttachment, parseAddress } from "./gmailMessages";
export { listLabels } from "./gmailLabels";
export { listRecentContacts, type GmailContact, type ListRecentContactsParams } from "./gmailContacts";
