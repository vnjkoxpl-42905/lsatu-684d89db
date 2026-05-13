import { useQuery } from "@tanstack/react-query";
import { listRecentContacts } from "../api";
import type { GmailContact } from "../api";

export const gmailContactsQueryKey = () => ["gmail", "contacts"] as const;

export function useGmailContacts(opts?: { enabled?: boolean }) {
  return useQuery<GmailContact[]>({
    queryKey: gmailContactsQueryKey(),
    queryFn: () => listRecentContacts(),
    enabled: opts?.enabled ?? true,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: true,
  });
}
