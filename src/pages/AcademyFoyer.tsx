"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useInbox } from "@/hooks/useInbox";
import FoyerSidebar from "@/components/foyer/FoyerSidebar";
import FoyerHeroRing from "@/components/foyer/FoyerHeroRing";
import { ADMIN_USER_ID, findAdminConversationId } from "@/lib/askJoshua";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getWAJEntries } from "@/lib/wajService";

export default function AcademyFoyer() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const { conversations, unreadCount } = useInbox();
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [flawCount, setFlawCount] = React.useState(0);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', user.id)
        .maybeSingle();
      if (!profile?.display_name) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setDisplayName(profile.display_name);
    })();
  }, [user, authReady, navigate]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await getWAJEntries(user.id, { qtype: 'Flaw' });
        if (!cancelled) setFlawCount(entries.length);
      } catch {
        if (!cancelled) setFlawCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!authReady || !user) return null;

  const isAdminSelf = user.id === ADMIN_USER_ID;
  const handleAskJoshua = async () => {
    const existing = await findAdminConversationId(user.id);
    if (existing) {
      navigate(`/inbox/${existing}`);
      return;
    }
    // Students can't INSERT conversations per RLS; composer surfaces the error.
    // Admin-level plumbing to allow student-initiated threads is a separate ticket.
    navigate("/inbox", { state: { composeWith: ADMIN_USER_ID } });
  };

  const focusHeadline = flawCount > 0
    ? `Drill ${flawCount} flaw q${flawCount === 1 ? "" : "s"}`
    : "Keep drilling";
  const focusSubline = flawCount > 0
    ? `${flawCount} from wrong answer journal`
    : undefined;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      <header className="h-11 shrink-0 flex items-center justify-end gap-1 px-4 border-b border-border/60">
        {permissions.is_admin && (
          <button
            onClick={() => navigate("/admin")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Admin Dashboard"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
        <LogoutButton />
        <ThemeToggle />
      </header>

      <div className="flex-1 min-h-0 flex gap-0 divide-x divide-border/40 p-4">
        <div className="hidden md:block pr-4">
          <FoyerSidebar
            conversations={conversations}
            unreadCount={unreadCount}
            displayName={displayName}
          />
        </div>
        <main className="flex-1 relative overflow-hidden md:pl-4">
          <FoyerHeroRing
            onSmartDrill={() => navigate("/drill")}
            onAskJoshua={isAdminSelf ? undefined : handleAskJoshua}
            focusLabel="TODAY"
            focusHeadline={focusHeadline}
            focusSubline={focusSubline}
            focusCtaLabel="Start drill"
            onFocusCta={() => navigate("/drill")}
          />
        </main>
      </div>
    </div>
  );
}
