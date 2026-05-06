import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing token in link." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: "error", message: data?.error ?? "Invalid link" });
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setState({ kind: "already" });
        } else if (data.valid) {
          setState({ kind: "ready" });
        } else {
          setState({ kind: "error", message: "Invalid or expired link." });
        }
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setState({ kind: "done" });
      else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: data?.error ?? "Could not unsubscribe" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Email preferences</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your LSAT U email subscription.
        </p>

        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Checking your link…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="text-sm text-foreground mb-6">
              Click below to confirm you'd like to unsubscribe from LSAT U emails.
            </p>
            <button
              onClick={confirm}
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Unsubscribing…" : "Confirm unsubscribe"}
            </button>
          </>
        )}

        {state.kind === "done" && (
          <p className="text-sm text-foreground">
            You've been unsubscribed. You won't receive further emails from LSAT U.
          </p>
        )}

        {state.kind === "already" && (
          <p className="text-sm text-foreground">You're already unsubscribed.</p>
        )}

        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </main>
  );
}
