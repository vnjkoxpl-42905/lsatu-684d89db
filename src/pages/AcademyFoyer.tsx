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

export default function AcademyFoyer() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const { conversations, unreadCount } = useInbox();

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', user.id)
        .maybeSingle();
      if (!profile?.display_name) navigate("/onboarding", { replace: true });
    })();
  }, [user, authReady, navigate]);

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

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="absolute top-5 right-6 z-30 flex items-center gap-1">
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
      </div>

      <div className="flex h-[100dvh] gap-4 p-4">
        <div className="hidden md:block">
          <FoyerSidebar conversations={conversations} unreadCount={unreadCount} />
        </div>
        <main className="flex-1 relative rounded-md border border-border/60 bg-card overflow-hidden">
          <FoyerHeroRing
            onSmartDrill={() => navigate("/drill")}
            onResume={undefined}
            onAskJoshua={isAdminSelf ? undefined : handleAskJoshua}
          />
        </main>
      </div>
    </div>
  );
}
