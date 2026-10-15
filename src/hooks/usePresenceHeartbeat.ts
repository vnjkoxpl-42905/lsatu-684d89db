import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Bumps profiles.last_seen_at every 3 minutes while the tab is visible so
// teachers see fresh "Online / Last seen X ago" state in the hub and
// inbox instead of a value that only refreshes on cold page loads.
// (Was 60s; each write rewrites the profile row and generates WAL, so the
// interval is kept as low as presence accuracy actually needs.)
const HEARTBEAT_MS = 3 * 60_000;

export function usePresenceHeartbeat() {
  const { user, authReady } = useAuth();

  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    const touch = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("class_id", user.id);
    };

    void touch();
    const interval = window.setInterval(() => { void touch(); }, HEARTBEAT_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void touch(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authReady, user]);
}
