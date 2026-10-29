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

/**
 * Fetch recent Gmail contacts for compose / search autocomplete.
 *
 * GRACEFUL DEGRADATION: This function NEVER throws. If the edge function is
 * unavailable (Supabase paused, function not yet deployed, network error, etc.)
 * it returns an empty array and logs a warning. Contact autocomplete is a
 * nice-to-have and must never crash the inbox UI or surface a runtime error.
 */
export async function listRecentContacts(
  params: ListRecentContactsParams = {}
): Promise<GmailContact[]> {
  try {
    const r = await invokeGmail<{ ok: true; contacts: GmailContact[] }>({
      action: "listRecentContacts",
      ...params,
    });
    return r.contacts ?? [];
  } catch (err) {
    // Soft-fail: contact autocomplete is non-critical.
    if (typeof console !== "undefined") {
      console.warn(
        "[gmail] listRecentContacts unavailable, returning empty list:",
        err instanceof Error ? err.message : err
      );
    }
    return [];
  }
}
