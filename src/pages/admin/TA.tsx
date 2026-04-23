import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Menu, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import StudentSelector from "@/components/ta/StudentSelector";
import TAChatView from "@/components/ta/TAChatView";

const LS_KEY = "ta-selected-student";

export default function TA() {
  const navigate = useNavigate();
  const { is_admin, loading } = useUserPermissions();

  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);

  useEffect(() => {
    if (!loading && !is_admin) navigate("/foyer", { replace: true });
  }, [loading, is_admin, navigate]);

  useEffect(() => {
    try {
      if (selected) localStorage.setItem(LS_KEY, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const { data: selectedProfile } = useQuery<{ display_name: string | null } | null>({
    queryKey: ["ta-student-name", selected],
    enabled: !!selected,
    queryFn: async () => {
      if (!selected) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", selected)
        .maybeSingle();
      return data ?? null;
    },
  });

  const selectedName = useMemo(
    () => selectedProfile?.display_name ?? null,
    [selectedProfile]
  );

  if (loading || !is_admin) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  const handleSelect = (id: string) => {
    setSelected(id);
    setMobileSelectorOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div className="h-5 w-px bg-zinc-800" />
          <GraduationCap className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-semibold">Teaching Assistant</h1>

          <div className="ml-auto md:hidden">
            <Sheet open={mobileSelectorOpen} onOpenChange={setMobileSelectorOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-zinc-800">
                  <Menu className="h-4 w-4 mr-1.5" />
                  Students
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 bg-zinc-950 border-zinc-800 text-zinc-100 w-[320px]"
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium">Students</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <StudentSelector selectedId={selected} onSelect={handleSelect} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-0 md:px-6 md:py-4 flex">
        <aside className="hidden md:flex shrink-0 w-[320px] border border-zinc-800 rounded-lg overflow-hidden flex-col mr-4">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium">Students</span>
          </div>
          <div className="flex-1 min-h-0">
            <StudentSelector selectedId={selected} onSelect={handleSelect} />
          </div>
        </aside>

        <section className="flex-1 min-w-0 border-t md:border border-zinc-800 md:rounded-lg overflow-hidden flex flex-col">
          {selected ? (
            <TAChatView studentId={selected} studentName={selectedName} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div className="max-w-sm space-y-2">
                <GraduationCap className="h-8 w-8 text-zinc-600 mx-auto" />
                <div className="text-zinc-300 font-medium">Pick a student</div>
                <div className="text-sm text-zinc-500">
                  Chat history is scoped per student. Select one from the list to
                  start.
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
