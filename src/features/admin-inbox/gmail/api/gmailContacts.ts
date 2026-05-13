import { invokeGmail } from "./gmailClient";

export interface GmailContact {
  email: string;
  name?: string;
  lastUsed: number;
  frequency: number;
}

export interface ListRecentContactsParams {
  maxThreads?: number;
}

export function listRecentContacts(params: ListRecentContactsParams = {}): Promise<GmailContact[]> {
  return invokeGmail<{ ok: true; contacts: GmailContact[] }>({
    action: "listRecentContacts",
    ...params,
  }).then((r) => r.contacts);
}
