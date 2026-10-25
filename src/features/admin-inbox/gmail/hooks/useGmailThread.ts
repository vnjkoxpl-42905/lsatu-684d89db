import { useQuery } from "@tanstack/react-query";
import { getThread } from "../api";
import type { GmailThreadFull } from "../api";

export const gmailThreadQueryKey = (id: string | null) => ["gmail", "thread", id] as const;

export function useGmailThread(id: string | null, opts?: { markRead?: boolean }) {
  return useQuery<GmailThreadFull>({
    queryKey: gmailThreadQueryKey(id),
    queryFn: () => getThread(id as string, { markRead: opts?.markRead ?? true }),
    enabled: !!id,
    staleTime: 30_000,
  });
}
