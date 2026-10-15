// Thin typed wrapper around the `gmail` Supabase edge function.
// The edge function is the only path to Gmail; it proxies through the Lovable
// Connector Gateway and owns the OAuth handshake. No tokens live in the browser.
import { supabase } from "@/integrations/supabase/client";

export interface GmailBatchItemResult {
  id: string;
  ok: boolean;
  error?: string | null;
}

export class GmailApiError extends Error {
  status: number;
  code?: string;
  /** Present when the failing call was a batch endpoint that returned per-id results. */
  results?: GmailBatchItemResult[];
  constructor(message: string, status: number, opts?: { code?: string; results?: GmailBatchItemResult[] }) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
    this.code = opts?.code;
    this.results = opts?.results;
  }
}

export interface GmailInvokeBody {
  action: string;
  [key: string]: unknown;
}

export async function invokeGmail<TResponse>(body: GmailInvokeBody): Promise<TResponse> {
  // Wait for the Supabase session to hydrate before invoking — otherwise
  // supabase.functions.invoke fires without a Bearer and the edge function's
  // requireAdmin returns 401.
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const token = await waitForAccessToken();
  if (!token) {
    throw new GmailApiError("Not signed in", 401);
  }
  const { data, error } = await supabase.functions.invoke("gmail", { body });
  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError with a context.response.
    const status = (error as { context?: { response?: { status?: number } } }).context?.response?.status ?? 0;
    // Some HTTP-error branches (notably 207 partial-success) still carry a JSON body
    // with per-id details. Try to surface those instead of dropping them.
    const partial = (data as { results?: GmailBatchItemResult[]; error?: string } | null) ?? null;
    throw new GmailApiError(
      partial?.error || error.message || "Gmail request failed",
      status,
      { results: partial?.results },
    );
  }
  const payload = data as { ok?: boolean; error?: string; code?: string; results?: GmailBatchItemResult[] } | null;
  if (!payload || payload.ok === false) {
    throw new GmailApiError(payload?.error ?? "Gmail request failed", 0, {
      code: payload?.code,
      results: payload?.results,
    });
  }
  return payload as TResponse;
}
