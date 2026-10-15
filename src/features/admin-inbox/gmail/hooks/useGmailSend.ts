import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendMessage } from "../api";
import type { SendMessageParams, SendMessageResult } from "../api";
import { gmailThreadQueryKey } from "./useGmailThread";

export function useGmailSend() {
  const qc = useQueryClient();

  return useMutation<SendMessageResult, Error, SendMessageParams>({
    mutationFn: sendMessage,
    onSuccess: (result, vars) => {
      // Invalidate the parent thread (for reply) and all thread-list queries (for the new
      // message landing in Sent / All Mail).
      const tid = vars.threadId ?? result.threadId;
      if (tid) qc.invalidateQueries({ queryKey: gmailThreadQueryKey(tid) });
      // Refreshing the threads refreshes the Today queue, which is derived from
      // them rather than being a query in its own right.
      qc.invalidateQueries({ queryKey: ["gmail", "threads"] });
      toast.success(vars.threadId ? "Reply sent" : "Message sent");
    },
    onError: (err) => {
      toast.error("Send failed", { description: err.message });
    },
  });
}
