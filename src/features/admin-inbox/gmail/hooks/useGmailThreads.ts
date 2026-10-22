import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listThreads } from "../api";
import type { GmailLabelId, ListThreadsResult } from "../api";

export interface UseGmailThreadsParams {
  /** Sidebar folder mapped to label ids upstream — pass label ids directly. */
  labelIds?: GmailLabelId[];
  /** Raw Gmail `q` (search box). */
  q?: string;
  /** Category constraint when label is INBOX (e.g. `["CATEGORY_PERSONAL"]`). */
  categoryLabelIds?: GmailLabelId[];
  /** Optional pagination token. */
  pageToken?: string;
  /** Cap at 100. */
  maxResults?: number;
  /** When false, the query won't run (e.g. while admin gate is loading). */
  enabled?: boolean;
}

export const gmailThreadsQueryKey = (params: UseGmailThreadsParams) =>
  [
    "gmail",
    "threads",
    {
      labelIds: params.labelIds ?? [],
      q: params.q ?? "",
      categoryLabelIds: params.categoryLabelIds ?? [],
      pageToken: params.pageToken ?? null,
      maxResults: params.maxResults ?? 25,
    },
  ] as const;

export function useGmailThreads(params: UseGmailThreadsParams) {
  const combinedLabels = [
    ...(params.labelIds ?? []),
    ...(params.categoryLabelIds ?? []),
  ];
  return useQuery<ListThreadsResult>({
    queryKey: gmailThreadsQueryKey(params),
    queryFn: () =>
      listThreads({
        labelIds: combinedLabels.length ? combinedLabels : undefined,
        q: params.q || undefined,
        pageToken: params.pageToken,
        maxResults: params.maxResults ?? 25,
      }),
    enabled: params.enabled ?? true,
    // Pull-driven (spec D5): Gmail is never synced in the background. The list
    // fetches once when a folder/search/label first needs it, and after that only
    // the Pull button (useGmailPull) or a modify mutation invalidates it. No
    // interval, no refetch on focus, no refetch on remount — otherwise merely
    // leaving the tab open would keep hitting Gmail.
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}
