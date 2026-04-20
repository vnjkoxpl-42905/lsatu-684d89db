"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FoyerSidebar from "@/components/foyer/FoyerSidebar";
import FoyerHeroRing from "@/components/foyer/FoyerHeroRing";
import FoyerDock from "@/components/foyer/FoyerDock";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AcademyFoyer() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [displayName, setDisplayName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", user.id)
        .maybeSingle();
      if (!profile?.display_name) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setDisplayName(profile.display_name);
    })();
  }, [user, authReady, navigate]);

  if (!authReady || !user) return null;

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside
        className="hidden shrink-0 border-r border-border md:flex"
        style={{ width: "min(320px, 30vw)", minWidth: 280 }}
      >
        <FoyerSidebar displayName={displayName} />
      </aside>

      <Sheet>
        <SheetTrigger
          aria-label="Open menu"
          className="absolute left-4 top-4 z-20 rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-0">
          <FoyerSidebar displayName={displayName} />
        </SheetContent>
      </Sheet>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <FoyerHeroRing />
        <FoyerDock />
      </main>
    </div>
  );
}
