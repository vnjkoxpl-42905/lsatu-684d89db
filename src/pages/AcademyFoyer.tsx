"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Zap, Play, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FoyerSidebar from "@/components/foyer/FoyerSidebar";
import FoyerDock from "@/components/foyer/FoyerDock";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const foyerNodes: TimelineItem[] = [
  {
    id: 1,
    title: "Smart Drill",
    date: "Now",
    content: "Adaptive drill tuned to your weakest question types.",
    category: "Practice",
    icon: Zap,
    relatedIds: [2],
    status: "in-progress",
    energy: 80,
  },
  {
    id: 2,
    title: "Resume",
    date: "Last session",
    content: "Pick up where you left off.",
    category: "Practice",
    icon: Play,
    relatedIds: [1],
    status: "pending",
    energy: 60,
  },
  {
    id: 3,
    title: "Ask Joshua",
    date: "Anytime",
    content: "Send your instructor a question or PDF.",
    category: "Coaching",
    icon: MessageCircle,
    relatedIds: [],
    status: "completed",
    energy: 100,
  },
];

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

      <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-10">
        <RadialOrbitalTimeline
          timelineData={foyerNodes}
          onActivate={(id) => {
            if (id === 1 || id === 2) navigate("/drill");
            else if (id === 3) toast.info("Ask Joshua coming soon");
          }}
        />
        <FoyerDock />
      </main>
    </div>
  );
}
