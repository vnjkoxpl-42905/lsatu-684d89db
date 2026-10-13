import { useQuery } from "@tanstack/react-query";
import { invokeGmail } from "../api";

export interface GmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export const gmailProfileQueryKey = () => ["gmail", "profile"] as const;

export function useGmailProfile(opts?: { enabled?: boolean }) {
  return useQuery<GmailProfile>({
    queryKey: gmailProfileQueryKey(),
    queryFn: () =>
      invokeGmail<{ ok: true; profile: GmailProfile }>({ action: "profile" }).then((r) => r.profile),
    enabled: opts?.enabled ?? true,
    staleTime: 60 * 60_000,
  });
}
