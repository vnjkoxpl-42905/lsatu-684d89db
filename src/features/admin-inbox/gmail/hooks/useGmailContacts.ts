import { useQuery } from "@tanstack/react-query";
import { listRecentContacts } from "../api";
import type { GmailContact } from "../api";

export const gmailContactsQueryKey = () => ["gmail", "contacts"] as const;

/**
 * FEATURE FLAG: Gmail contact autocomplete depends on the `listRecentContacts`
 * edge function action. Set this to `true` once the gmail edge function is
 * deployed with the new action (currently committed locally but not deployed
 * because the Supabase project went INACTIVE).
 *
 * When false: the hook returns an empty list without firing a network request.
 * Compose recipient autocomplete and search-bar contact suggestions become
 * no-ops. Nothing else in the inbox is affected.
 *
 * To re-enable: flip this to true after running
 *   `supabase functions deploy gmail --project-ref qodidbkoqrmqhdfwvcmk`
 * and verifying the action responds.
 */
const GMAIL_CONTACTS_ENABLED = true;

export function useGmailContacts(opts?: { enabled?: boolean }) {
  return useQuery<GmailContact[]>({
    queryKey: gmailContactsQueryKey(),
    queryFn: () => listRecentContacts(),
    enabled: GMAIL_CONTACTS_ENABLED && (opts?.enabled ?? true),
    staleTime: 60 * 60_000,
    // Pull-driven (spec D5): no Gmail traffic on window focus. Contacts refresh
    // when the hour-long staleTime lapses and something re-mounts, or on Pull.
    refetchOnWindowFocus: false,
    // Defensive: even if listRecentContacts ever throws (it shouldn't — it
    // soft-fails to []), don't let it bubble as an unhandled rejection.
    retry: false,
  });
}
