// Thin typed wrapper around the `gmail` Supabase edge function.
// The edge function is the only path to Gmail; it proxies through the Lovable
// Connector Gateway and owns the OAuth handshake. No tokens live in the browser.
import { supabase } from "@/integrations/supabase/client";

export class GmailApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
    this.code = code;
  }
}

export interface GmailInvokeBody {
  action: string;
  [key: string]: unknown;
}

export async function invokeGmail<TResponse>(body: GmailInvokeBody): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke("gmail", { body });
  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError with a context.response.
    const status = (error as { context?: { response?: { status?: number } } }).context?.response?.status ?? 0;
    throw new GmailApiError(error.message || "Gmail request failed", status);
  }
  const payload = data as { ok?: boolean; error?: string; code?: string } | null;
  if (!payload || payload.ok === false) {
    throw new GmailApiError(payload?.error ?? "Gmail request failed", 0, payload?.code);
  }
  return payload as TResponse;
}
