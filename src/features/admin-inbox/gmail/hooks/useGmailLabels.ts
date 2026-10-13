import { useQuery } from "@tanstack/react-query";
import { listLabels } from "../api";
import type { GmailLabel } from "../api";

export const gmailLabelsQueryKey = () => ["gmail", "labels"] as const;

export function useGmailLabels(opts?: { enabled?: boolean }) {
  return useQuery<GmailLabel[]>({
    queryKey: gmailLabelsQueryKey(),
    queryFn: listLabels,
    enabled: opts?.enabled ?? true,
    staleTime: 10 * 60_000,
  });
}
